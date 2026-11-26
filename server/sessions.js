// Sessions: The KUDO Trainer uploads the recording or transcript of a 1:1 or group session. The Academy learns from it:
//  1. it reads the transcript (Teams .vtt or .docx, plain text) or transcribes the audio/video itself (free Whisper model);
//  2. it finds the questions asked, who asked them, and the answer given;
//  3. it maps each question to a module and checks whether the lesson and the questions already cover it;
//  4. it spots questions that come back across sessions;
//  5. The KUDO Trainer turns findings into lesson FAQ entries or new check questions, with one click and his own wording.
// Nothing reaches trainees without the KUDO Trainer's approval. Names never leave the admin side: FAQ entries are anonymous.
// Media files are deleted as soon as they are transcribed; the transcript stays until the session is deleted.
import { Router } from 'express';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { q, audit } from './db.js';
import { MODULES, MODULE_BY_KEY } from './curriculum.js';
import { POOLS, registerItem, unregisterItem } from './assess.js';
import { embedder, transcribeFile, brand } from './autoreview.js';
import { suggestSignals } from './programme.js';
import { SCENARIOS } from './scenarios.js';

const MAX_MEDIA = Number(process.env.SESSION_MAX_MB || 500) * 1024 * 1024;
const MAX_TEXT = 8 * 1024 * 1024;
const TEXT_EXT = ['.vtt', '.txt', '.docx', '.srt'];
const MEDIA_EXT = ['.mp4', '.m4a', '.mp3', '.wav', '.webm', '.ogg', '.mov', '.aac'];
const bad = (res, msg) => res.status(400).json({ error: msg });

// ------------------------------------------------------------------ transcript parsing
/** A minimal ZIP reader for .docx: returns the text of word/document.xml, one paragraph per line. */
export function docxText(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This .docx file could not be read.');
  const n = buf.readUInt16LE(eocd + 10); let p = buf.readUInt32LE(eocd + 16);
  for (let k = 0; k < n; k++) {
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nameLen = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), comment = buf.readUInt16LE(p + 32), local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === 'word/document.xml') {
      const lStart = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
      const raw = buf.subarray(lStart, lStart + csize);
      const xml = (method === 8 ? zlib.inflateRawSync(raw) : raw).toString('utf8');
      return xml.replace(/<w:tab\/>/g, ' ').replace(/<\/w:p>/g, '\n').replace(/<w:br\/>/g, '\n').replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'");
    }
    p += 46 + nameLen + extra + comment;
  }
  throw new Error('This .docx file has no document text.');
}

/** Turn a transcript into utterances [{ s: speaker or null, t: text }], merging consecutive lines by the same speaker. */
export function parseTranscript(name, buf) {
  const ext = path.extname(name || '').toLowerCase();
  const text = ext === '.docx' ? docxText(buf) : buf.toString('utf8').replace(/^﻿/, '');
  const out = [];
  const push = (s, t) => { t = String(t || '').replace(/\s+/g, ' ').trim(); if (!t) return; const last = out[out.length - 1]; if (last && last.s === s) last.t += ` ${t}`; else out.push({ s, t }); };
  if (ext === '.vtt' || ext === '.srt' || /^WEBVTT/.test(text)) {
    for (const block of text.split(/\r?\n\r?\n/)) {
      const lines = block.split(/\r?\n/).filter((l) => l && !/-->/.test(l) && !/^WEBVTT/.test(l) && !/^\d+$/.test(l.trim()) && !/^NOTE\b/.test(l));
      for (const l of lines) {
        const v = /<v\s+([^>]+)>(.*?)(?:<\/v>|$)/.exec(l);
        if (v) push(v[1].trim(), v[2].replace(/<[^>]+>/g, ''));
        else { const c = /^([A-Z][\w .'-]{1,40}):\s+(.+)$/.exec(l); c ? push(c[1].trim(), c[2]) : push(null, l.replace(/<[^>]+>/g, '')); }
      }
    }
    return out;
  }
  // Teams .docx and many .txt exports: a "Name   0:03" (or "Name 00:01:02") header line, then what they said.
  let speaker = null;
  for (const raw of text.split(/\r?\n/)) {
    const l = raw.trim(); if (!l) continue;
    const head = /^(.{2,60}?)\s+(\d{1,2}:\d{2}(?::\d{2})?)$/.exec(l);
    if (head && !/[.?!]$/.test(head[1])) { speaker = head[1].trim(); continue; }
    const colon = /^([A-Z][\w .'-]{1,40}):\s+(.+)$/.exec(l);
    if (colon) { push(colon[1].trim(), colon[2]); speaker = colon[1].trim(); continue; }
    push(speaker, l);
  }
  return out;
}

// ------------------------------------------------------------------ analysis
const QWORDS = /^(what|how|why|when|where|which|who|can|could|does|do|did|is|are|should|would|will|if)\b/i;
const SMALL_TALK = /\b(hear me|see my screen|can you see|how are you|good morning|make sense|any questions|is that ok|is that okay|are we good|ready to start|shall we|you there|on mute|share my screen|next slide)\b/i;
const STOP = new Set('the a an and or of to in on for with is are be it this that what how why when where which who can could does do did should would will if i you we they my your our at as by from about into there their then than so not no yes just like get got have has had was were me us them its also any all some one more most very really okay ok well right'.split(' '));
export const words = (t) => String(t).toLowerCase().match(/[a-z0-9][a-z0-9.+-]*/g)?.filter((w) => !STOP.has(w) && w.length > 1) || [];
const splitSentences = (t) => String(t).split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);
export const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };
export const jac = (a, b) => { const A = new Set(a), B = new Set(b); if (!A.size || !B.size) return 0; let i = 0; for (const x of A) if (B.has(x)) i++; return i / Math.min(A.size, B.size); };

/** Find questions with their asker and the answer that followed. hostName = the session lead (the KUDO Trainer). */
export function extractQuestions(utts, hostName = '') {
  const host = String(hostName || '').toLowerCase().split(/\s+/)[0];
  const role = (s) => (s == null ? 'unknown' : host && s.toLowerCase().includes(host) ? 'host' : 'participant');
  const found = [];
  utts.forEach((u, ui) => {
    for (const sent of splitSentences(u.t)) {
      const wc = sent.split(/\s+/).length;
      const isQ = /\?$/.test(sent) || (QWORDS.test(sent) && wc >= 7 && !/[.!]$/.test(sent));
      if (!isQ || wc < 6 || SMALL_TALK.test(sent)) continue;
      // The answer: what other speakers said next (or, with no speaker labels, the next few sentences).
      let answer = '';
      if (u.s != null) { for (let k = ui + 1; k < utts.length && answer.length < 700; k++) { if (utts[k].s === u.s) { if (answer) break; continue; } answer += ` ${utts[k].t}`; } }
      else { const rest = splitSentences(utts.slice(ui).map((x) => x.t).join(' ')); const at = rest.indexOf(sent); answer = rest.slice(at + 1, at + 5).join(' '); }
      // The answer stops where a new question starts.
      const ans = []; for (const x of splitSentences(answer.trim())) { if (/\?$/.test(x)) break; ans.push(x); }
      found.push({ q: brand(sent), asker: u.s, role: role(u.s), answer: brand(ans.join(' ')).slice(0, 700) });
    }
  });
  // The same question repeated within a session counts once.
  return found.filter((f, i) => found.findIndex((g) => jac(words(g.q), words(f.q)) > 0.85) === i);
}

/** What each module already teaches and asks: lesson lines, objectives, questions and their explanations, FAQ. */
async function corpus(faq) {
  const lines = [];
  for (const m of MODULES) {
    for (const s of m.sections) for (const p of s.points) lines.push({ module: m.key, t: p, where: `Lesson: ${s.title}` });
    for (const o of m.objectives) lines.push({ module: m.key, t: o, where: 'Objective' });
    for (const x of POOLS[m.key] || []) lines.push({ module: m.key, t: `${x.q} ${x.why || ''}`, where: 'Check question' });
  }
  for (const f of faq) lines.push({ module: f.module_key, t: `${f.question} ${f.answer || ''}`, where: 'FAQ from a session' });
  return lines;
}
let corpusCache = null;
export function resetCorpus() { corpusCache = null; }
async function corpusVectors(vec, faq) {
  const key = `${Object.values(POOLS).reduce((t, p) => t + p.length, 0)}:${faq.length}`;
  if (corpusCache?.key === key) return corpusCache.lines;
  const lines = await corpus(faq);
  for (const l of lines) l.v = await vec(l.t);
  corpusCache = { key, lines };
  return lines;
}

// Names that point straight at a module when a question mentions them.
const NAMES = { teams: ['teams', 'microsoft teams'], zoom: ['zoom'], external: ['webex', 'on24', 'google meet', 'external meeting'], meetnow: ['meet now', 'kudo live'], widget: ['widget', 'iframe'], hybrid: ['hybrid', 'audio manager', 'dante', 'venue audio'], rtmp: ['rtmp', 'youtube', 'facebook', 'stream key'], hls: ['hls'], glossary: ['glossary', 'glossaries'], marketplace: ['marketplace', 'book interpreters'], ringcentral: ['ringcentral', 'ring central'], network: ['firewall', 'udp', 'proxy', 'port 443', 'vpn'], onsite: ['onsite', 'on-site', 'venue wi-fi', 'qr code'], hi: ['interpreter', 'interpretation'], ai: ['language detection', 'speech & captions', 'captions only'], platform: ['host link', 'content tab', 'grace period'] };
export const nameBoost = (text) => { const t = ` ${String(text).toLowerCase()} `; const b = {}; for (const [k, ns] of Object.entries(NAMES)) if (ns.some((n) => t.includes(n))) b[k] = 0.12; return b; };

/** Map each question to a module and say whether the Academy already covers it. */
export async function analyse(questions, { vec = null } = {}) {
  const faq = (await q("SELECT module_key,question,answer FROM field_notes WHERE status='published' AND kind IN ('faq','item')")).rows;
  const out = [];
  if (vec) {
    const lines = await corpusVectors(vec, faq);
    for (const f of questions) {
      const qv = await vec(f.q), qa = f.answer ? await vec(`${f.q} ${f.answer}`) : qv;
      // Module: where the question and its answer sit closest.
      // Mean of the three closest lines per module (steadier than the single best), plus a nudge when the question names it.
      const per = {}; for (const l of lines) (per[l.module] ||= []).push(Math.max(cos(qa, l.v), cos(qv, l.v)));
      const boost = nameBoost(f.q);
      const byMod = Object.fromEntries(Object.entries(per).map(([k, v]) => { const top = v.sort((a, b) => b - a).slice(0, 3); return [k, top.reduce((t, x) => t + x, 0) / top.length + (boost[k] || 0)]; }));
      const [module, modScore] = Object.entries(byMod).sort((a, b) => b[1] - a[1])[0];
      if (modScore < 0.3) continue; // off topic
      const best = lines.filter((l) => l.module === module).map((l) => ({ l, s: cos(qv, l.v) })).sort((a, b) => b.s - a.s)[0];
      const coverage = best.s >= 0.68 ? 'covered' : best.s >= 0.5 ? 'partly' : 'gap';
      out.push({ ...f, module, score: Math.round(best.s * 100) / 100, coverage, match: { text: best.l.t.slice(0, 240), where: best.l.where }, v: qv });
    }
  } else {
    // Without the models (tests, or models switched off): word overlap. Rougher, but never blocks the feature.
    const lines = await corpus(faq); for (const l of lines) l.w = words(l.t);
    for (const f of questions) {
      const qw = words(f.q), aw = words(`${f.q} ${f.answer}`);
      const scored = lines.map((l) => ({ l, s: jac(qw, l.w), sa: jac(aw, l.w) }));
      const boost = nameBoost(f.q);
      const byMod = {}; for (const x of scored) byMod[x.l.module] = Math.max(byMod[x.l.module] || 0, x.s, x.sa);
      for (const k of Object.keys(byMod)) byMod[k] += boost[k] || 0;
      const [module, modScore] = Object.entries(byMod).sort((a, b) => b[1] - a[1])[0];
      if (modScore < 0.2) continue;
      const best = scored.filter((x) => x.l.module === module).sort((a, b) => b.s - a.s)[0];
      const coverage = best.s >= 0.6 ? 'covered' : best.s >= 0.35 ? 'partly' : 'gap';
      out.push({ ...f, module, score: Math.round(best.s * 100) / 100, coverage, match: { text: best.l.t.slice(0, 240), where: best.l.where } });
    }
  }
  return out;
}

// ------------------------------------------------------------------ processing queue
let chain = Promise.resolve();
const enqueue = (id, file) => { chain = chain.then(() => processSession(id, file)).catch(() => {}); return chain; };

export async function processSession(id, file) {
  const r = await q('SELECT id,kind,host_name,user_ids,filename FROM sessions WHERE id=$1', [id]);
  const s = r.rows[0]; if (!s) return;
  try {
    await q("UPDATE sessions SET status='processing', progress=0, error=NULL WHERE id=$1", [id]);
    const ext = path.extname(s.filename || '').toLowerCase();
    let utts, transcript;
    if (TEXT_EXT.includes(ext)) {
      utts = parseTranscript(s.filename, fs.readFileSync(file));
      transcript = utts.map((u) => (u.s ? `${u.s}: ${u.t}` : u.t)).join('\n');
    } else {
      if (process.env.AUTO_REVIEW === 'off') throw new Error('Transcription is switched off on this server. Upload the Teams transcript (.vtt or .docx) instead.');
      const t = await transcribeFile(file, (p) => q('UPDATE sessions SET progress=$2 WHERE id=$1', [id, Math.round(p * 90)]).catch(() => {}));
      utts = [{ s: null, t: t.text }]; transcript = t.text;
      await q('UPDATE sessions SET duration_s=$2 WHERE id=$1', [id, Math.round(t.seconds)]);
    }
    transcript = brand(transcript); utts = utts.map((u) => ({ ...u, t: brand(u.t) }));
    if (transcript.length < 40) throw new Error('No speech or text found in this file.');
    const vec = await embedder();
    const found = await analyse(extractQuestions(utts, s.host_name), { vec });
    // Recurring: the same question in earlier sessions.
    const earlier = (await q("SELECT id,findings FROM sessions WHERE status='ready' AND id<>$1", [id])).rows;
    const findings = found.map((f, i) => {
      let seen = 0;
      for (const e of earlier) for (const g of e.findings || []) if (g.module === f.module && (f.v && g.v ? cos(f.v, g.v) > 0.8 : jac(words(f.q), words(g.q)) > 0.6)) { seen++; break; }
      return { id: i + 1, ...f, seenBefore: seen, status: 'open' };
    });
    // A 1:1 with one trainee: suggest level signals for their plan, as with any other input (the KUDO Trainer confirms).
    // Only what the trainee said counts, not the host's explanations.
    const hostFirst = String(s.host_name || '').toLowerCase().split(/\s+/)[0];
    const theirs = utts.some((u) => u.s) ? utts.filter((u) => u.s && !(hostFirst && u.s.toLowerCase().includes(hostFirst))).map((u) => u.t).join('\n') : transcript;
    const signals = s.kind === 'one_to_one' && (s.user_ids || []).length === 1 ? suggestSignals(theirs).map((x) => ({ ...x, label: SCENARIOS.find((c) => c.key === x.scenario)?.label || x.scenario })) : [];
    await q("UPDATE sessions SET status='ready', progress=100, transcript=$2, utterances=$3, findings=$4, signals=$5, processed_at=now() WHERE id=$1",
      [id, transcript.slice(0, 2_000_000), JSON.stringify(utts.slice(0, 5000)), JSON.stringify(findings), JSON.stringify(signals)]);
  } catch (e) {
    await q("UPDATE sessions SET status='failed', error=$2 WHERE id=$1", [id, String(e.message || e).slice(0, 400)]);
  } finally {
    fs.rm(file, { force: true }, () => {});
  }
}
export async function failInterrupted() {
  await q("UPDATE sessions SET status='failed', error='The server restarted while this file was being processed. Upload it again.' WHERE status IN ('processing','uploaded') AND created_at < now() - interval '2 minutes'").catch(() => {});
}

// ------------------------------------------------------------------ field notes (FAQ and new questions)
const itemOf = (n) => ({ id: `${n.module_key}.f${n.id}`, module: n.module_key, q: n.question, o: n.item.o, a: n.item.a, why: n.item.why || n.answer || '', obj: n.item.obj ?? undefined, lvl: n.item.lvl || 'apply' });
export async function loadFieldItems() {
  const r = await q("SELECT id,module_key,question,answer,item FROM field_notes WHERE status='published' AND kind='item'");
  for (const n of r.rows) registerItem(itemOf(n));
  return r.rowCount;
}
export async function faqFor(moduleKey) {
  return (await q("SELECT id,question,answer,published_at FROM field_notes WHERE status='published' AND kind='faq' AND module_key=$1 ORDER BY published_at DESC", [moduleKey])).rows;
}

// ------------------------------------------------------------------ routes (admin)
export const sessionsRouter = Router();
const pub = (s) => ({ id: s.id, kind: s.kind, title: s.title, happened_on: s.happened_on, host_name: s.host_name, user_ids: s.user_ids, filename: s.filename, status: s.status, progress: s.progress, error: s.error, created_at: s.created_at, processed_at: s.processed_at, duration_s: s.duration_s });
const strip = (f) => { const { v, ...rest } = f; void v; return rest; };

sessionsRouter.get('/sessions', async (_req, res, next) => {
  try {
    const r = await q('SELECT s.*, (SELECT count(*) FROM jsonb_array_elements(s.findings) f) AS n, (SELECT count(*) FROM jsonb_array_elements(s.findings) f WHERE f->>\'status\'=\'open\' AND f->>\'coverage\'<>\'covered\') AS todo FROM sessions s ORDER BY happened_on DESC, id DESC');
    const users = (await q('SELECT id,name FROM users')).rows; const nm = new Map(users.map((u) => [u.id, u.name]));
    res.json({ sessions: r.rows.map((s) => ({ ...pub(s), questions: Number(s.n), toReview: Number(s.todo), people: (s.user_ids || []).map((i) => nm.get(i)).filter(Boolean) })) });
  } catch (e) { next(e); }
});

sessionsRouter.post('/sessions', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!['one_to_one', 'group'].includes(b.kind)) return bad(res, 'Choose 1:1 or group session.');
    const title = String(b.title || '').trim().slice(0, 200); if (!title) return bad(res, 'Give the session a title.');
    if (b.happened_on && !/^\d{4}-\d{2}-\d{2}$/.test(b.happened_on)) return bad(res, 'Date must be YYYY-MM-DD.');
    const ids = Array.isArray(b.user_ids) ? [...new Set(b.user_ids.map(Number).filter(Number.isInteger))].slice(0, 100) : [];
    if (b.kind === 'one_to_one' && ids.length !== 1) return bad(res, 'A 1:1 is with one trainee: choose who.');
    const name = String(b.filename || '').slice(0, 200); const ext = path.extname(name).toLowerCase();
    if (![...TEXT_EXT, ...MEDIA_EXT].includes(ext)) return bad(res, `Use a transcript (${TEXT_EXT.join(', ')}) or a recording (${MEDIA_EXT.join(', ')}).`);
    const host = String(b.host_name || req.user.name || '').slice(0, 100);
    const r = await q("INSERT INTO sessions (kind,title,happened_on,host_name,user_ids,filename,status,created_by) VALUES ($1,$2,COALESCE($3::date,CURRENT_DATE),$4,$5,$6,'uploaded',$7) RETURNING id",
      [b.kind, title, b.happened_on || null, host, ids, name, req.user.id]);
    await audit(req, 'session.create', String(r.rows[0].id), title);
    res.json({ id: r.rows[0].id });
  } catch (e) { next(e); }
});

// The file itself, streamed to disk (recordings can be large), then processed in the background.
sessionsRouter.put('/sessions/:id/file', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const s = (await q("SELECT id,filename,status FROM sessions WHERE id=$1", [id])).rows[0];
    if (!s) return res.status(404).json({ error: 'Not found.' });
    if (s.status !== 'uploaded' && s.status !== 'failed') return bad(res, 'This session already has its file.');
    const ext = path.extname(s.filename).toLowerCase(); const limit = TEXT_EXT.includes(ext) ? MAX_TEXT : MAX_MEDIA;
    if (Number(req.headers['content-length'] || 0) > limit) return res.status(413).json({ error: `File too large (max ${Math.round(limit / 1048576)} MB).` });
    const file = path.join(os.tmpdir(), `academy-session-${id}-${Date.now()}${ext}`);
    const out = fs.createWriteStream(file); let size = 0, aborted = false;
    req.on('data', (c) => { size += c.length; if (size > limit && !aborted) { aborted = true; req.unpipe(out); out.destroy(); fs.rm(file, { force: true }, () => {}); res.status(413).json({ error: 'File too large.' }); } });
    req.pipe(out);
    out.on('finish', async () => {
      if (aborted) return;
      if (!size) { fs.rm(file, { force: true }, () => {}); return bad(res, 'The file is empty.'); }
      await q("UPDATE sessions SET status='processing', progress=0, error=NULL WHERE id=$1", [id]);
      await audit(req, 'session.upload', String(id), `${Math.round(size / 1024)} KB`);
      enqueue(id, file);
      res.json({ ok: true, size });
    });
    out.on('error', (e) => next(e));
  } catch (e) { next(e); }
});

sessionsRouter.get('/sessions/:id', async (req, res, next) => {
  try {
    const s = (await q('SELECT * FROM sessions WHERE id=$1', [Number(req.params.id)])).rows[0];
    if (!s) return res.status(404).json({ error: 'Not found.' });
    const users = (await q('SELECT id,name FROM users WHERE id = ANY($1)', [s.user_ids || []])).rows;
    res.json({ ...pub(s), people: users, transcript: s.transcript, findings: (s.findings || []).map(strip), signals: s.signals || [], modules: MODULES.map((m) => ({ key: m.key, title: m.title, objectives: m.objectives })) });
  } catch (e) { next(e); }
});

sessionsRouter.delete('/sessions/:id', async (req, res, next) => {
  try {
    const r = await q('DELETE FROM sessions WHERE id=$1 RETURNING title', [Number(req.params.id)]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    await audit(req, 'session.delete', String(req.params.id), r.rows[0].title);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

async function setFinding(sessionId, findingId, patch) {
  const s = (await q('SELECT findings FROM sessions WHERE id=$1', [sessionId])).rows[0]; if (!s) return false;
  const f = (s.findings || []).find((x) => x.id === findingId); if (!f) return false;
  Object.assign(f, patch);
  await q('UPDATE sessions SET findings=$2 WHERE id=$1', [sessionId, JSON.stringify(s.findings)]);
  return true;
}
sessionsRouter.post('/sessions/:id/findings/:fid', async (req, res, next) => {
  try {
    const action = req.body?.action; const module = req.body?.module;
    const patch = action === 'dismiss' ? { status: 'dismissed' } : action === 'reopen' ? { status: 'open' } : action === 'module' && MODULE_BY_KEY[module] ? { module } : null;
    if (!patch) return bad(res, 'Unknown action.');
    if (!(await setFinding(Number(req.params.id), Number(req.params.fid), patch))) return res.status(404).json({ error: 'Not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// the KUDO Trainer publishes a finding as a lesson FAQ entry or as a new check question, in his own words.
sessionsRouter.post('/field-notes', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!MODULE_BY_KEY[b.module]) return bad(res, 'Choose the module.');
    if (!['faq', 'item'].includes(b.kind)) return bad(res, 'Choose FAQ or check question.');
    const question = String(b.question || '').trim().slice(0, 400), answer = String(b.answer || '').trim().slice(0, 1500);
    if (question.length < 8) return bad(res, 'Write the question.');
    let item = null;
    if (b.kind === 'faq' && answer.length < 8) return bad(res, 'Write the answer trainees will read.');
    if (b.kind === 'item') {
      const o = Array.isArray(b.options) ? b.options.map((x) => String(x || '').trim().slice(0, 200)) : [];
      if (o.length !== 4 || o.some((x) => !x) || new Set(o.map((x) => x.toLowerCase())).size !== 4) return bad(res, 'Give four different options.');
      const a = Number(b.correct); if (!Number.isInteger(a) || a < 0 || a > 3) return bad(res, 'Mark the correct option.');
      item = { o, a, why: answer || null, obj: Number.isInteger(b.obj) ? b.obj : null, lvl: 'apply' };
    }
    const r = await q("INSERT INTO field_notes (module_key,kind,question,answer,item,session_id,finding_id,status,created_by,published_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'published',$8,now()) RETURNING *",
      [b.module, b.kind, brand(question), brand(answer) || null, item ? JSON.stringify(item) : null, Number(b.session_id) || null, Number(b.finding_id) || null, req.user.id]);
    const n = r.rows[0];
    if (n.kind === 'item') registerItem(itemOf(n));
    if (n.session_id && n.finding_id) await setFinding(n.session_id, n.finding_id, { status: n.kind, noteId: n.id });
    corpusCache = null;
    await audit(req, `field_note.${n.kind}`, n.module_key, question.slice(0, 80));
    res.json({ id: n.id, itemId: n.kind === 'item' ? `${n.module_key}.f${n.id}` : null });
  } catch (e) { next(e); }
});
sessionsRouter.get('/field-notes', async (_req, res, next) => {
  try { res.json({ notes: (await q("SELECT id,module_key,kind,question,answer,item,session_id,status,published_at FROM field_notes WHERE status='published' AND kind IN ('faq','item') ORDER BY published_at DESC")).rows }); } catch (e) { next(e); }
});
sessionsRouter.delete('/field-notes/:id', async (req, res, next) => {
  try {
    const r = await q("UPDATE field_notes SET status='withdrawn' WHERE id=$1 RETURNING *", [Number(req.params.id)]);
    const n = r.rows[0]; if (!n) return res.status(404).json({ error: 'Not found.' });
    if (n.kind === 'item') unregisterItem(`${n.module_key}.f${n.id}`);
    if (n.session_id && n.finding_id) await setFinding(n.session_id, n.finding_id, { status: 'open', noteId: null });
    corpusCache = null;
    await audit(req, 'field_note.withdraw', n.module_key, n.question.slice(0, 80));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Across all sessions: what comes back, by module, and what the Academy does not cover yet.
sessionsRouter.get('/sessions-insights', async (_req, res, next) => {
  try {
    const rows = (await q("SELECT id,title,happened_on,findings FROM sessions WHERE status='ready'")).rows;
    const all = rows.flatMap((s) => (s.findings || []).map((f) => ({ ...f, session: s.id, sessionTitle: s.title, on: s.happened_on })));
    const groups = [];
    for (const f of all) {
      const g = groups.find((x) => x.module === f.module && (f.v && x.v ? cos(f.v, x.v) > 0.8 : jac(words(f.q), words(x.q)) > 0.6));
      if (g) { g.count++; g.sessions.add(f.session); if (f.coverage === 'gap') g.gap = true; if (f.status === 'open') g.open++; }
      else groups.push({ q: f.q, v: f.v, module: f.module, count: 1, sessions: new Set([f.session]), gap: f.coverage === 'gap', open: f.status === 'open' ? 1 : 0, example: { session: f.session, finding: f.id } });
    }
    const byModule = MODULES.map((m) => {
      const fs_ = all.filter((f) => f.module === m.key);
      return { key: m.key, title: m.title, questions: fs_.length, gap: fs_.filter((f) => f.coverage === 'gap').length, partly: fs_.filter((f) => f.coverage === 'partly').length, covered: fs_.filter((f) => f.coverage === 'covered').length };
    }).filter((x) => x.questions);
    res.json({
      sessions: rows.length, questions: all.length,
      open: all.filter((f) => f.status === 'open' && f.coverage !== 'covered').length,
      published: Number((await q("SELECT count(*) FROM field_notes WHERE status='published' AND kind IN ('faq','item')")).rows[0].count),
      byModule,
      recurring: groups.filter((g) => g.sessions.size > 1).sort((a, b) => b.count - a.count).slice(0, 20).map((g) => ({ q: g.q, module: g.module, count: g.count, sessions: g.sessions.size, gap: g.gap, open: g.open, example: g.example })),
    });
  } catch (e) { next(e); }
});
