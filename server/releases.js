// Release notes: an admin imports a KUDO release note and the Academy works out where it lands.
//  1. it splits the note into items (new feature, fix, known issue) with a title and a description;
//  2. it maps each item to the modules it concerns (meaning, plus product names it mentions);
//  3. it finds lesson lines, objectives and check questions that the change may have made wrong, and flags the strong
//     cases (the note says "now X instead of Y" and the line still says Y);
//  4. it drafts the changes: a "What's new" entry, a lesson FAQ entry, rewritten lesson lines and questions to retire.
// The admin reviews, edits and applies. Applied changes reach trainees at once and can be undone per release.
import { Router } from 'express';
import { q, audit } from './db.js';
import { MODULES, MODULE_BY_KEY } from './curriculum.js';
import { POOLS, itemById } from './assess.js';
import { embedder, brand } from './autoreview.js';
import { words, jac, cos, nameBoost, docxText, resetCorpus } from './sessions.js';

const bad = (res, error) => res.status(400).json({ error });
const MAX_TEXT = 200 * 1024;

// ------------------------------------------------------------------ parsing
const SECTION = [[/new features?|what'?s new|features/i, 'feature'], [/fix|improvement|bug/i, 'fix'], [/known issue|limitation/i, 'known'], [/deprecat|removed|retire/i, 'removed']];
const sectionOf = (line) => { if (line.length > 60 || /[.:]$/.test(line) && !/:$/.test(line)) return null; for (const [re, k] of SECTION) if (re.test(line)) return k; return null; };

/** Split a release note into items: "* Title: description" bullets under section headings. */
export function parseRelease(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').map((l) => l.replace(/ /g, ' ').trimEnd());
  const items = []; let kind = 'feature', cur = null;
  const push = () => { if (cur && cur.text.trim().length >= 20) items.push(cur); cur = null; };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) { continue; }
    const bullet = line.match(/^(?:[*•\-–·]|\d+[.)])\s+(.*)$/);
    const sec = !bullet && sectionOf(line.replace(/:$/, ''));
    if (sec) { push(); kind = sec; continue; }
    if (bullet) { push(); cur = { kind, text: bullet[1] }; continue; }
    if (cur) cur.text += ` ${line}`; else cur = { kind, text: line };
  }
  push();
  return items.map((it, i) => {
    const t = brand(it.text.replace(/\s+/g, ' ').trim());
    const m = t.match(/^([^:]{3,120}):\s+(.+)$/);
    return { id: i + 1, kind: it.kind, title: m ? m[1].trim() : t.split(/(?<=[.!?])\s/)[0].slice(0, 120), body: m ? m[2].trim() : t };
  });
}

// ------------------------------------------------------------------ what the Academy says today
// Features with a name of their own: a lesson line that names one is worth a look when the release changes it.
const FEATURE_TERMS = ['force close', 'qr code', 'mobile link', 'grace period', 'host link', 'content tab', 'preparation time', 'usage dashboard', 'users tab', 'three-dot', 'segmenter', 'bulk delete', 'audio manager', 'stream key', 'book interpreters', 'meeting logo', 'logo', 'android', 'large meeting'];

// Product names that release notes use and the module they point to (on top of the session names).
const RELEASE_NAMES = { ai: ['segmenter', 'ai meeting', 'ai meetings', 'ai translation', 'captions', 'speech translation'], teams: ['teams', 'native integration'], glossary: ['glossary'], platform: ['kcp', 'client portal', 'usage dashboard', 'logo', 'users tab', 'coe account', 'role', 'android', 'large meetings', 'force close'], meetnow: ['kudo live', 'meet now'], onsite: ['mobile link'] };
// A product named in the item's title weighs more than one mentioned in passing.
const releaseBoost = (title, body) => {
  const b = {};
  for (const [text, w] of [[body, 0.12], [title, 0.25]]) {
    const t = ` ${String(text).toLowerCase()} `;
    // In the title, generic feature words (QR code, logo...) do not name a module: product names do.
    const named = w > 0.2 ? FEATURE_TERMS.reduce((t, f) => t.split(f).join(' '), String(text).toLowerCase()) : text;
    for (const k of Object.keys(nameBoost(named))) b[k] = Math.max(b[k] || 0, w);
    for (const [k, ns] of Object.entries(RELEASE_NAMES)) if (ns.some((n) => t.includes(n))) b[k] = Math.max(b[k] || 0, w);
  }
  return b;
};

/** Every line the Academy teaches or asks, with a reference that survives edits. */
export function contentLines() {
  const out = [];
  for (const m of MODULES) {
    m.sections.forEach((s, si) => s.points.forEach((p, pi) => out.push({ ref: `L:${m.key}:${si}:${pi}`, module: m.key, kind: 'line', where: `Lesson · ${s.title}`, t: p })));
    m.objectives.forEach((o, oi) => out.push({ ref: `O:${m.key}:${oi}`, module: m.key, kind: 'line', where: 'Learning objective', t: o }));
    for (const x of POOLS[m.key] || []) {
      if (x.retired) continue;
      const opts = x.o ? ` ${x.o.join(' · ')}` : x.pairs ? ` ${x.pairs.map((p) => p.join(' → ')).join(' · ')}` : x.steps ? ` ${x.steps.join(' · ')}` : '';
      out.push({ ref: `Q:${x.id}`, module: m.key, kind: 'question', where: x.field ? 'Check question (written by an admin)' : 'Check question', t: `${x.q}${opts}${x.why ? ` ${x.why}` : ''}`, q: x.q });
    }
  }
  return out;
}

// "now X instead of Y": Y is what the Academy may still say.
const insteadOf = (body) => {
  const end = '(?:[,.;]|\\s+unless|\\s+except|$)';
  const m = String(body).match(new RegExp(`\\bnow\\s+(.{3,120}?)\\s+instead of\\s+(.{2,80}?)${end}`, 'i')) || String(body).match(new RegExp(`(\\b\\w+\\s+.{2,80}?)\\s+instead of\\s+(.{2,80}?)${end}`, 'i'));
  return m ? { now: m[1].trim(), was: m[2].trim() } : null;
};
const NUM = /\b\d+(?:[.,]\d+)?\s*(?:minutes?|min|hours?|h|seconds?|s|days?|%|mb|gb|languages?|participants?)\b/gi;

/** Rewrite a line where the note says what replaced what. Null when no safe rewrite is found. */
export function suggestRewrite(line, change) {
  if (!change) return null;
  const low = line.toLowerCase(), was = change.was.toLowerCase();
  const at = low.indexOf(was); if (at < 0) return null;
  let now = change.now.split(/\s+/);
  const before = low.slice(0, at).trim().split(/\s+/).pop();
  if (now.length > 1 && before && now[0].toLowerCase().replace(/s$/, '') === before.replace(/s$/, '')) now = now.slice(1); // "joins ..." after "bot joins"
  const last = was.split(/\s+/).pop();
  const cut = now.findIndex((w) => w.toLowerCase() === last);
  if (cut >= 0) now = now.slice(0, cut + 1); // keep the new value only: "a couple of minutes before"
  return `${line.slice(0, at)}${now.join(' ')}${line.slice(at + was.length)}`;
}

/** Map each item to modules and find the content it may have made wrong. */
export async function analyseRelease(items, { vec = null } = {}) {
  const lines = contentLines();
  if (vec) for (const l of lines) l.v ||= await vec(l.t);
  for (const l of lines) l.w = words(l.t);
  const res = [];
  for (const it of items) {
    const text = `${it.title}. ${it.body}`, tw = words(text), titleW = words(it.title);
    const iv = vec ? await vec(text) : null;
    const boost = releaseBoost(it.title, it.body);
    // Lexical score: share of the line's words the item also uses, weighted towards the item's title.
    const scored = lines.map((l) => {
      const lex = jac(tw, l.w) * Math.min(1, l.w.length / 6), tit = jac(titleW, l.w) * Math.min(1, l.w.length / 5);
      const sem = iv ? cos(iv, l.v) : 0;
      return { l, s: Math.max(sem, lex * 0.9, tit), sem, lex };
    });
    const per = {}; for (const x of scored) (per[x.l.module] ||= []).push(x.s);
    const byMod = Object.entries(per).map(([k, v]) => { const top = v.sort((a, b) => b - a).slice(0, 3); return [k, top.reduce((t, y) => t + y, 0) / top.length + (boost[k] || 0)]; }).sort((a, b) => b[1] - a[1]);
    const best = byMod[0]?.[1] || 0; if (process.env.DEBUG_REL) console.log(it.id, byMod.slice(0, 4).map(([k, v]) => `${k}:${v.toFixed(2)}`).join(" "));
    // Modules the title names come first; others join only when the content is clearly close.
    const named = byMod.filter(([k]) => (boost[k] || 0) >= 0.25).map(([k]) => k);
    const close = byMod.filter(([k, s]) => !named.includes(k) && s >= (named.length ? (iv ? 0.7 : 0.6) : Math.max(iv ? 0.42 : 0.3, best * 0.86))).map(([k]) => k);
    const modules = [...named, ...close].slice(0, 3);
    // Content flags
    const change = insteadOf(it.body);
    const nums = (text.match(NUM) || []).map((n) => n.toLowerCase());
    const terms = FEATURE_TERMS.filter((t) => ` ${it.title.toLowerCase()} `.includes(t));
    const flags = [];
    for (const x of scored) {
      const { l } = x, low = l.t.toLowerCase();
      const stale = change && low.includes(change.was.toLowerCase());
      const inScope = modules.includes(l.module);
      const sharedNum = nums.some((n) => low.includes(n));
      const strong = (stale && x.s >= 0.35) || (sharedNum && x.s >= 0.7);
      const named = terms.find((t) => low.includes(t));
      const possible = inScope && (x.s >= (iv ? 0.62 : 0.55) || !!named);
      if (!strong && !possible) continue;
      const reason = stale ? `Still says "${change.was}". The note says it is now "${change.now}"` : sharedNum ? 'Uses the same figure as the change' : named ? `Mentions ${named}, which this release changes` : 'Close to what changed: worth a read';
      flags.push({ ref: l.ref, module: l.module, kind: l.kind, where: l.where, text: l.kind === 'question' ? l.q : l.t, detail: l.kind === 'question' ? l.t.slice(l.q.length).trim().slice(0, 300) : null,
        strength: strong ? 'strong' : 'possible', reason, score: Math.round(x.s * 100) / 100, suggestion: l.kind === 'line' ? suggestRewrite(l.t, stale ? change : null) : null });
    }
    flags.sort((a, b) => (a.strength === b.strength ? b.score - a.score : a.strength === 'strong' ? -1 : 1));
    res.push({ ...it, modules, flags: flags.slice(0, 6), change });
  }
  return res;
}

/** The changes the Academy proposes for each item; the admin can edit and untick any of them. */
export function proposeActions(item) {
  const main = item.modules[0] || null;
  return {
    whatsnew: { on: true },
    faq: { on: !!main && item.kind === 'feature', module: main, question: faqQuestion(item), answer: item.body },
    edits: item.flags.filter((f) => f.kind === 'line').map((f) => ({ ref: f.ref, on: false, text: f.suggestion || f.text })),
    retire: item.flags.filter((f) => f.kind === 'question').map((f) => ({ ref: f.ref, on: false })),
  };
}
const faqQuestion = (it) => `${it.title.replace(/\.$/, '')}: what changed?`;

// ------------------------------------------------------------------ applying changes to the live content
const ORIGINAL = new Map();
const lineSlot = (ref) => {
  const [t, key, a, b] = ref.split(':'); const m = MODULE_BY_KEY[key]; if (!m) return null;
  if (t === 'L') { const s = m.sections[Number(a)]; if (!s || !(Number(b) in s.points)) return null; return { get: () => s.points[Number(b)], set: (v) => { s.points[Number(b)] = v; } }; }
  if (t === 'O') { if (!(Number(a) in m.objectives)) return null; return { get: () => m.objectives[Number(a)], set: (v) => { m.objectives[Number(a)] = v; } }; }
  return null;
};
export const EDITED = new Map(); // ref -> { release, title, at }
function setLine(ref, text) { const s = lineSlot(ref); if (!s) return false; if (!ORIGINAL.has(ref)) ORIGINAL.set(ref, s.get()); s.set(text); return true; }
function restoreLine(ref) { const s = lineSlot(ref); if (s && ORIGINAL.has(ref)) s.set(ORIGINAL.get(ref)); EDITED.delete(ref); }
function setRetired(ref, on) { const it = itemById(ref.slice(2)); if (it) it.retired = on; }

/** Load the applied edits into the live content (at start-up and after each change). */
export async function loadContentEdits() {
  for (const ref of [...EDITED.keys()]) restoreLine(ref);
  for (const x of Object.values(POOLS).flat()) if (x.retired) x.retired = false;
  const r = await q("SELECT e.ref,e.kind,e.text,e.release_id,e.created_at,r.title FROM content_edits e LEFT JOIN releases r ON r.id=e.release_id WHERE e.active ORDER BY e.id");
  for (const e of r.rows) {
    if (e.kind === 'line' && setLine(e.ref, e.text)) EDITED.set(e.ref, { release: e.title, at: e.created_at });
    if (e.kind === 'retire') setRetired(e.ref, true);
  }
  resetCorpus();
  return r.rowCount;
}
/** Which lesson lines of a module changed with a release, for the "Updated" marker in the lesson. */
export function editedIn(moduleKey) {
  const out = {};
  for (const [ref, v] of EDITED) { const [t, key, a, b] = ref.split(':'); if (key === moduleKey && t === 'L') out[`${a}.${b}`] = v; }
  return out;
}
export async function updatesFor(moduleKey, days = 120) {
  return (await q("SELECT f.question AS title, f.answer AS body, f.item, r.title AS release, r.released_on FROM field_notes f JOIN releases r ON r.id=f.release_id WHERE f.kind='update' AND f.status='published' AND f.item->'modules' ? $1 AND r.released_on >= CURRENT_DATE - $2::int ORDER BY r.released_on DESC, f.id", [moduleKey, days])).rows
    .map((u) => ({ title: u.title, body: u.body, kind: u.item?.kind, release: u.release, released_on: u.released_on }));
}

// ------------------------------------------------------------------ routes (admin)
export const releasesRouter = Router();
const pub = (r) => ({ id: r.id, title: r.title, released_on: r.released_on, status: r.status, created_at: r.created_at, applied_at: r.applied_at, items: r.items });
const modList = () => MODULES.map((m) => ({ key: m.key, title: m.title }));

releasesRouter.get('/releases', async (_req, res, next) => {
  try {
    const r = await q('SELECT r.*, (SELECT count(*) FROM content_edits e WHERE e.release_id=r.id AND e.active)::int AS edits, (SELECT count(*) FROM field_notes f WHERE f.release_id=r.id AND f.status=\'published\')::int AS notes FROM releases r ORDER BY released_on DESC, id DESC');
    res.json({ releases: r.rows.map((x) => ({ ...pub(x), items: undefined, count: (x.items || []).length, flagged: (x.items || []).reduce((t, i) => t + i.flags.length, 0), modules: [...new Set((x.items || []).flatMap((i) => i.modules))], edits: x.edits, notes: x.notes })) });
  } catch (e) { next(e); }
});

releasesRouter.post('/releases', async (req, res, next) => {
  try {
    const b = req.body || {};
    let text = String(b.text || '');
    if (b.docx) { try { text = docxText(Buffer.from(String(b.docx), 'base64')); } catch { return bad(res, 'That Word file could not be read.'); } }
    if (text.length > MAX_TEXT) return bad(res, 'The release note is too long (200 KB max).');
    const title = String(b.title || '').trim().slice(0, 200) || 'Release';
    if (b.released_on && !/^\d{4}-\d{2}-\d{2}$/.test(b.released_on)) return bad(res, 'Date must be YYYY-MM-DD.');
    const parsed = parseRelease(text);
    if (!parsed.length) return bad(res, 'No items found. Paste the release note with one bullet per change.');
    const vec = process.env.AUTO_REVIEW === 'off' ? null : await embedder().catch(() => null);
    const items = (await analyseRelease(parsed, { vec })).map((it) => ({ ...it, actions: proposeActions(it), status: 'open' }));
    const r = await q("INSERT INTO releases (title,released_on,raw,items,status,created_by) VALUES ($1,COALESCE($2::date,CURRENT_DATE),$3,$4,'review',$5) RETURNING id", [title, b.released_on || null, text, JSON.stringify(items), req.user.id]);
    await audit(req, 'release.import', String(r.rows[0].id), `${title} · ${items.length} items`);
    res.json({ id: r.rows[0].id, items: items.length });
  } catch (e) { next(e); }
});

releasesRouter.get('/releases/:id', async (req, res, next) => {
  try {
    const r = (await q('SELECT * FROM releases WHERE id=$1', [Number(req.params.id)])).rows[0];
    if (!r) return res.status(404).json({ error: 'Not found.' });
    res.json({ ...pub(r), modules: modList() });
  } catch (e) { next(e); }
});

// Save the admin's edits to the proposed changes (modules, texts, ticks) before applying.
releasesRouter.put('/releases/:id/items/:item', async (req, res, next) => {
  try {
    const r = (await q('SELECT items,status FROM releases WHERE id=$1', [Number(req.params.id)])).rows[0];
    if (!r) return res.status(404).json({ error: 'Not found.' });
    const it = r.items.find((x) => x.id === Number(req.params.item)); if (!it) return res.status(404).json({ error: 'Not found.' });
    const b = req.body || {};
    if (Array.isArray(b.modules)) it.modules = [...new Set(b.modules.filter((k) => MODULE_BY_KEY[k]))].slice(0, 3);
    if (b.status && ['open', 'skipped'].includes(b.status)) it.status = b.status;
    if (b.actions) it.actions = cleanActions(b.actions, it);
    await q('UPDATE releases SET items=$2 WHERE id=$1', [Number(req.params.id), JSON.stringify(r.items)]);
    res.json({ ok: true, item: it });
  } catch (e) { next(e); }
});
function cleanActions(a, it) {
  const refs = new Set(it.flags.map((f) => f.ref));
  return {
    whatsnew: { on: !!a.whatsnew?.on },
    faq: { on: !!a.faq?.on && !!MODULE_BY_KEY[a.faq?.module], module: MODULE_BY_KEY[a.faq?.module] ? a.faq.module : null, question: String(a.faq?.question || '').slice(0, 400), answer: String(a.faq?.answer || '').slice(0, 1500) },
    edits: (a.edits || []).filter((e) => refs.has(e.ref)).map((e) => ({ ref: e.ref, on: !!e.on, text: String(e.text || '').slice(0, 1000) })),
    retire: (a.retire || []).filter((e) => refs.has(e.ref)).map((e) => ({ ref: e.ref, on: !!e.on })),
  };
}

// Apply every ticked change of the items still open.
releasesRouter.post('/releases/:id/apply', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const r = (await q('SELECT * FROM releases WHERE id=$1', [id])).rows[0];
    if (!r) return res.status(404).json({ error: 'Not found.' });
    const done = { whatsnew: 0, faq: 0, edits: 0, retired: 0 };
    for (const it of r.items) {
      if (it.status !== 'open') continue;
      const a = it.actions;
      if (a.whatsnew?.on) { await q("INSERT INTO field_notes (module_key,kind,question,answer,item,release_id,finding_id,status,created_by,published_at) VALUES ($1,'update',$2,$3,$4,$5,$6,'published',$7,now())", [it.modules[0] || 'general', brand(it.title), brand(it.body), JSON.stringify({ modules: it.modules, kind: it.kind }), id, it.id, req.user.id]); done.whatsnew++; }
      if (a.faq?.on && a.faq.module && a.faq.question.length >= 8 && a.faq.answer.length >= 8) { await q("INSERT INTO field_notes (module_key,kind,question,answer,release_id,finding_id,status,created_by,published_at) VALUES ($1,'faq',$2,$3,$4,$5,'published',$6,now())", [a.faq.module, brand(a.faq.question), brand(a.faq.answer), id, it.id, req.user.id]); done.faq++; }
      for (const e of a.edits || []) {
        if (!e.on || !e.text.trim()) continue;
        const slot = lineSlot(e.ref); if (!slot || slot.get() === e.text.trim()) continue;
        await q('UPDATE content_edits SET active=false WHERE ref=$1 AND active', [e.ref]);
        await q("INSERT INTO content_edits (ref,kind,text,original,release_id,created_by) VALUES ($1,'line',$2,$3,$4,$5)", [e.ref, brand(e.text.trim()), ORIGINAL.get(e.ref) ?? slot.get(), id, req.user.id]); done.edits++;
      }
      for (const x of a.retire || []) { if (!x.on || !itemById(x.ref.slice(2))) continue; await q("INSERT INTO content_edits (ref,kind,release_id,created_by) VALUES ($1,'retire',$2,$3)", [x.ref, id, req.user.id]); done.retired++; }
      it.status = 'applied';
    }
    await q("UPDATE releases SET items=$2, status='applied', applied_at=now() WHERE id=$1", [id, JSON.stringify(r.items)]);
    await loadContentEdits();
    await audit(req, 'release.apply', String(id), `${done.whatsnew} news · ${done.faq} FAQ · ${done.edits} lines · ${done.retired} retired`);
    res.json({ ok: true, done });
  } catch (e) { next(e); }
});

// Undo everything a release changed: news and FAQ withdrawn, lines restored, questions back in the pool.
releasesRouter.post('/releases/:id/revert', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const r = (await q('SELECT items FROM releases WHERE id=$1', [id])).rows[0];
    if (!r) return res.status(404).json({ error: 'Not found.' });
    await q("UPDATE field_notes SET status='withdrawn' WHERE release_id=$1", [id]);
    await q('UPDATE content_edits SET active=false WHERE release_id=$1', [id]);
    for (const it of r.items) if (it.status === 'applied') it.status = 'open';
    await q("UPDATE releases SET items=$2, status='review', applied_at=NULL WHERE id=$1", [id, JSON.stringify(r.items)]);
    await loadContentEdits();
    await audit(req, 'release.revert', String(id), '');
    res.json({ ok: true });
  } catch (e) { next(e); }
});

releasesRouter.delete('/releases/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const live = (await q('SELECT count(*)::int AS n FROM content_edits WHERE release_id=$1 AND active', [id])).rows[0].n + (await q("SELECT count(*)::int AS n FROM field_notes WHERE release_id=$1 AND status='published'", [id])).rows[0].n;
    if (live) return bad(res, 'Undo the applied changes first.');
    const r = await q('DELETE FROM releases WHERE id=$1 RETURNING title', [id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    await audit(req, 'release.delete', String(id), r.rows[0].title);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ------------------------------------------------------------------ routes (everyone signed in)
export const whatsNewRouter = Router();
// The latest product changes, the ones that touch the trainee's focus scenarios first.
whatsNewRouter.get('/whats-new', async (_req, res, next) => {
  try {
    const r = await q("SELECT f.id,f.question AS title,f.answer AS body,f.item,r.id AS release_id,r.title AS release,r.released_on FROM field_notes f JOIN releases r ON r.id=f.release_id WHERE f.kind='update' AND f.status='published' AND r.released_on >= CURRENT_DATE - 120 ORDER BY r.released_on DESC, f.id LIMIT 60");
    res.json({ updates: r.rows.map((u) => ({ id: u.id, title: u.title, body: u.body, kind: u.item?.kind || 'feature', modules: (u.item?.modules || []).map((k) => ({ key: k, title: MODULE_BY_KEY[k]?.title, scenario: MODULE_BY_KEY[k]?.scenario || null })), release: u.release, release_id: u.release_id, released_on: u.released_on })) });
  } catch (e) { next(e); }
});
