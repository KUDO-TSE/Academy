// Automatic review of "Explain it" recordings, with free open-source models running inside the app (no API, no key):
//  - Whisper (onnx-community/whisper-base, via transformers.js) transcribes the recording;
//  - a small sentence-embedding model (all-MiniLM-L6-v2) checks which key points the explanation covers, by meaning,
//    confirmed by keyword cues because embeddings cannot see negation;
//  - delivery is measured from the transcript (pace, filler words) and hand-over from who the trainee says they would involve.
// Facts are never marked wrong automatically. Doubtful cases, a random sample and every request go to Jack as spot-checks.
import { spawnSync } from 'node:child_process';
import { q } from './db.js';
import { MODULE_BY_KEY } from './curriculum.js';
import { EXPLAIN, RUBRIC, PRACTICE } from './curriculum-extra.js';
import { refreshPlan } from './engine.js';

const WHISPER = process.env.WHISPER_MODEL || 'onnx-community/whisper-base';
const EMBED = 'Xenova/all-MiniLM-L6-v2';
const SAMPLE_RATE = Number(process.env.SPOTCHECK_SAMPLE || 0.2); // share of reviews Jack spot-checks at random

// Keyword cues per key point, in the same order as EXPLAIN[module].points. Any cue counts.
const KW = {
  foundations: [['interpret', 'channel', 'human'], ['speech and captions', 'speech & captions', 'voice', 'keynote', 'one speaker'], ['captions only', 'discussion', 'faster', 'latency', 'back and forth'], ['speaker language', 'before the meeting', 'cannot change', "can't change", 'locked'], ['rehears', 'test', 'dry run']],
  platform: [['email link', 'link', 'chrome', 'firefox', 'edge'], ['audio', 'source', 'microphone', 'mic'], ['record', 'participant', 'end the meeting', 'end meeting'], ['restart', 'translation service'], ['download', 'same day', 'content tab', '30 days']],
  ai: [['normal', 'expected', 'few seconds', 'delay'], ['switch', 'detect', 'language change', 'few phrases'], ['captions only', 'latency', 'faster'], ['microphone', 'mic', 'headset', 'pace', 'audio', 'background noise']],
  hi: [['book interpreters', 'booking', 'book'], ['48', '24', 'sooner', 'early', 'in advance'], ['material', 'slides', 'agenda', 'upload', 'glossary'], ['15 minutes', 'fifteen minutes', 'early', 'sound check'], ['language services', 'change', 'project manager']],
  teams: [['admin center', 'admin centre', 'approve', 'approval'], ['third party', 'third-party', 'permission policy', 'policy'], ['bot', 'lobby', 'external'], ['24 hours', 'a day', 'today', 'start now', 'take time', 'in advance'], ['mobile link', 'browser', 'fallback', 'backup']],
  zoom: [['standard meeting', 'not a webinar', 'new meeting', 'recurring', 'meeting id'], ['encryption', 'end-to-end', 'end to end', 'enhanced'], ['same title', 'same time', 'invite link', 'paste', 'full link'], ['admit', 'approve', 'recording request', 'waiting room'], ['mobile link', 'qr', 'phone', 'second tab']],
  external: [['external meeting', 'attendee link', 'on24 link'], ['mobile link', 'url tool', 'console builder', 'widget'], ['preview', 'test'], ['approve', 'admit', 'bot'], ['mute', 'player', 'two voices']],
  onsite: [['same time', 'every listener', 'each listener', 'all at once', 'stream'], ['48', 'kilobit', 'kbps'], ['access point', 'airtime', 'not internet speed', 'not bandwidth'], ['udp', 'captive portal', 'per-device', 'per device'], ['channel plan', 'test', 'seats', 'coverage']],
  meetnow: [['app', 'small', 'spontaneous', 'instant', 'field'], ['mobile link', 'large audience', 'browser', 'qr'], ['two-way', 'two way', 'one-way', 'one way', 'captions'], ['cannot change', "can't change", 'before you start', 'before starting', 'locked']],
  widget: [['language access', 'selector', 'only delivers', 'iframe'], ['obs', 'vb-cable', 'vb cable', 'ingest', 'capture'], ['web team', 'embed', 'code', 'new code', 'every event'], ['test', 'rehearsal', 'together'], ['technical support', 'support', 'tse', 'kudo team']],
  hybrid: [['bridge', 'conference system', 'televic', 'bosch', 'taiden', 'venue'], ['venue audio in', 'audio in', 'audio out', 'venue audio out', 'human interpretation'], ['dante', 'virtual soundcard', 'av engineer', 'audio manager'], ['technical support', 'tse', 'hand over', 'early']],
  rtmp: [['large meeting', 'enabled', 'rtmp'], ['stream key', 'one key', 'each language', 'destination', 'per language'], ['start the meeting', 'meeting first', 'then the broadcast'], ['delay', 'seconds', 'latency']],
  hls: [['unlimited', 'large audience', 'own page', 'web page', 'webpage'], ['15', '20 seconds', 'delay'], ['large meeting', 'enabled', 'broadcast tab'], ['sign language', 'server', '.eu', '.com', '15 minutes', 'limit']],
  glossary: [['client role', 'client account'], ['recognize', 'replace', 'block', 'do-not-translate', 'do not translate', 'translate as', 'action'], ['company name', 'product name', 'presenter', 'speaker name', 'names'], ['before the meeting', 'before it starts', 'apply', 'use for this meeting'], ['pause', 'restart', 'teams', 'live']],
};
const HANDOVER = ['technical support', 'tech support', 'support team', 'tse', 'language services', 'it team', 'your it', 'admin', 'escalat', 'hand over', 'hand it over', 'involve', 'bring in', 'loop in', 'kudo team', 'client manager'];
const FILLERS = /\b(um+|uh+|erm|you know|kind of|sort of|basically|like,)\b/gi;

let models = null;
async function loadModels() {
  if (models) return models;
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = process.env.MODEL_CACHE_DIR || '/tmp/academy-models';
  const [asr, emb] = await Promise.all([
    pipeline('automatic-speech-recognition', WHISPER, { dtype: 'q8' }),
    pipeline('feature-extraction', EMBED, { dtype: 'q8' }),
  ]);
  models = { asr, emb };
  return models;
}
export function warmUp() { loadModels().then(() => console.log('Auto-review models ready')).catch((e) => console.error('Auto-review models failed to load:', e.message)); }

async function decode(buf) {
  const { default: ffmpeg } = await import('ffmpeg-static');
  const r = spawnSync(ffmpeg, ['-loglevel', 'error', '-i', 'pipe:0', '-ac', '1', '-ar', '16000', '-f', 'f32le', 'pipe:1'], { input: buf, maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`Could not decode the recording: ${String(r.stderr || '').slice(0, 200)}`);
  return new Float32Array(r.stdout.buffer, r.stdout.byteOffset, Math.floor(r.stdout.byteLength / 4));
}

// Our brand is always KUDO. Speech recognition hears it as Kudo, Cudo, Cuda, Kudu, Koodo, Q-Do...: fix every variant.
const BRAND_RE = /\b(?:kudo|kudoh|kudow|cudo|cuda|kuda|kudu|koodo|koodoo|coodo|kuudo|q[- ]?do)\b/gi;
export const brand = (t) => String(t || '').replace(BRAND_RE, 'KUDO');

export async function transcribe(buf) {
  const { asr } = await loadModels();
  const pcm = await decode(buf);
  const out = await asr(pcm, { chunk_length_s: 30, stride_length_s: 5, language: 'english', task: 'transcribe' });
  return { text: brand(String(out.text || '').trim()), seconds: pcm.length / 16000 };
}

const sentences = (t) => { const s = t.split(/(?<=[.!?])\s+|\n+/).map((x) => x.trim()).filter((x) => x.length > 3); const w = [...s]; for (let i = 0; i < s.length - 1; i++) w.push(`${s[i]} ${s[i + 1]}`); return w.length ? w : [t]; };
const cos = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; };

/** Score an explanation. Returns rubric scores, covered and missed points, flags and a note for the trainee. */
export const specFor = (kind, moduleKey) => (kind === 'practice' ? PRACTICE[moduleKey] : EXPLAIN[moduleKey] ? { ...EXPLAIN[moduleKey], kw: KW[moduleKey] } : null);

export async function assess(moduleKey, text, seconds, spec = specFor('explain', moduleKey)) {
  const ex = spec; const m = MODULE_BY_KEY[moduleKey];
  const { emb } = await loadModels();
  const vec = async (t) => Array.from((await emb(t, { pooling: 'mean', normalize: true })).data);
  const lower = ` ${text.toLowerCase()} `;
  const windows = sentences(text); const wv = await Promise.all(windows.map(vec));
  const points = [];
  for (const [i, p] of ex.points.entries()) {
    const pv = await vec(p);
    const sims = wv.map((v) => cos(v, pv)); const best = Math.max(...sims);
    const kw = (ex.kw?.[i] || []).some((k) => lower.includes(k));
    const covered = best >= 0.62 || (best >= 0.4 && kw);
    const unsure = !covered && (best >= 0.5 || kw);
    points.push({ point: p, covered, unsure, sim: Math.round(best * 100) / 100, quote: covered ? windows[sims.indexOf(best)].slice(0, 220) : null });
  }
  const coverage = points.filter((x) => x.covered).length / points.length;

  const words = text.split(/\s+/).filter(Boolean).length;
  const wpm = seconds ? Math.round(words / (seconds / 60)) : null;
  const fillers = (text.match(FILLERS) || []).length;
  const fillerRate = words ? fillers / words : 0;
  const handover = HANDOVER.some((k) => lower.includes(k));
  const needsHandover = m.depth === 'handover' || ex.points.some((p) => /Technical Support|hand over|hand-over|Language Services|\bIT\b/.test(p));

  const complete = coverage >= 0.8 ? 3 : coverage >= 0.5 ? 2 : 1;
  const clear = words < 30 ? 1 : (wpm && (wpm < 90 || wpm > 190)) || fillerRate > 0.06 ? 2 : 3;
  const ho = handover ? 3 : needsHandover ? 1 : 2;
  const unsureCount = points.filter((x) => x.unsure).length;
  const accurate = coverage >= 0.8 && unsureCount === 0 ? 3 : coverage >= 0.4 ? 2 : 1; // facts are not marked wrong automatically
  const rubric = { accurate, complete, clear, handover: ho };
  const avg = Object.values(rubric).reduce((a, b) => a + b, 0) / RUBRIC.length;
  const rating = avg >= 2.5 ? 'solid' : avg >= 1.75 ? 'developing' : 'gap';

  // Where each missed point is taught, so the note can point to it.
  const lessonLines = m.sections.flatMap((s) => s.points.map((t) => ({ t, s: s.title })));
  const lv = await Promise.all(lessonLines.map((l) => vec(l.t)));
  const missed = [];
  for (const p of points.filter((x) => !x.covered)) { const pv = await vec(p.point); const sims = lv.map((v) => cos(v, pv)); const i = sims.indexOf(Math.max(...sims)); missed.push({ point: p.point, lesson: lessonLines[i]?.t, section: lessonLines[i]?.s }); }

  const flags = [];
  if (unsureCount) flags.push(`${unsureCount} key point${unsureCount > 1 ? 's' : ''} possibly covered but not clearly`);
  if (words < 40) flags.push('Very short answer');
  if (!text.trim()) flags.push('Nothing could be transcribed');
  const tips = [];
  if (wpm && wpm > 190) tips.push(`You spoke at about ${wpm} words a minute: slow down a little, clients need time to follow.`);
  if (wpm && wpm < 90) tips.push(`About ${wpm} words a minute: aim for a steadier flow, as if you were on the call.`);
  if (fillerRate > 0.06) tips.push(`${fillers} filler words ("um", "like", "basically"): pausing is better than filling.`);
  if (needsHandover && !handover) tips.push('Say who you would involve and when (for example Technical Support or Language Services). That is part of the answer.');
  const covered = points.filter((x) => x.covered).map((x) => x.point);
  const note = [
    covered.length ? `You covered ${covered.length} of ${points.length} key points: ${covered.join('; ')}.` : 'None of the key points came through clearly.',
    missed.length ? `Next time, add: ${missed.map((x) => x.point).join('; ')}. See "${missed[0].section}" in the lesson.` : 'Every key point was there.',
    ...tips,
  ].join(' ');
  return { rubric, rating, avg: Math.round(avg * 100) / 100, points, missed, flags, metrics: { words, wpm, fillers, handover }, note };
}

/** Process one submission end to end and record the result. */
export async function processSubmission(id) {
  const r = await q('SELECT id,user_id,module_key,kind,counts,human_requested,text_answer,audio,audio_seconds,status FROM submissions WHERE id=$1', [id]);
  const s = r.rows[0]; if (!s || s.status !== 'processing') return;
  try {
    let text = brand(s.text_answer || ''), seconds = s.audio_seconds || null;
    if (s.audio) { const t = await transcribe(s.audio); text = [t.text, s.text_answer].filter(Boolean).join('\n'); seconds = t.seconds; }
    const a = await assess(s.module_key, text, s.audio ? seconds : null, specFor(s.kind, s.module_key));
    // Only the first submission is the result of record; retries are practice and never go to Jack unless asked.
    const spot = s.counts ? (a.flags.length > 0 || a.rating === 'gap' || Math.random() < SAMPLE_RATE) : !!s.human_requested;
    if (!s.counts) a.note = `Practice attempt: your recorded result stays the one from your first submission. ${a.note}`;
    await q("UPDATE submissions SET status='auto', transcript=$2, audio_seconds=COALESCE($3::int, audio_seconds), auto=$4, rubric=$5, review_comment=$6, needs_human=$7, reviewed_at=now() WHERE id=$1",
      [id, s.audio ? text : null, seconds ? Math.round(seconds) : null, a, a.rubric, a.note, spot]);
    if (!s.counts) return;
    const scenario = MODULE_BY_KEY[s.module_key]?.scenario || MODULE_BY_KEY[s.module_key]?.related?.[0] || null;
    await q("INSERT INTO inputs (user_id,kind,title,signals) VALUES ($1,'recording',$2,$3)",
      [s.user_id, `${s.kind === 'practice' ? 'Practice' : 'Explain-it'}, automatic review: ${MODULE_BY_KEY[s.module_key]?.title || s.module_key}`, JSON.stringify(scenario ? [{ scenario, rating: a.rating }] : [])]);
    // A practice that is not a gap is signed off automatically. A gap asks the trainee to try again.
    // The first practice submission completes the step; it is signed off when it is not a gap.
    if (s.kind === 'practice') await q(`INSERT INTO plan_progress (user_id,item_key,status,note,signed_off_at) VALUES ($1,$2,'done',$3,$4)
      ON CONFLICT (user_id,item_key) DO NOTHING`, [s.user_id, `${s.module_key}.practice`, `Reviewed automatically: ${a.rating}`, a.rating !== 'gap' ? new Date() : null]);
    await refreshPlan(s.user_id);
  } catch (e) {
    console.error('Auto-review failed', id, e.message);
    await q("UPDATE submissions SET status='submitted', needs_human=TRUE, auto=$2 WHERE id=$1", [id, { error: 'The automatic review could not run. Jack will review it.' }]);
  }
}

// One at a time: the models are shared and memory is limited.
let chain = Promise.resolve();
export function enqueue(id) { chain = chain.then(() => processSubmission(id)).catch(() => {}); return chain; }
export async function resumePending() {
  const r = await q("SELECT id FROM submissions WHERE status='processing' ORDER BY id");
  for (const x of r.rows) enqueue(x.id);
  // Recordings are kept 60 days for spot-checks, then deleted; transcripts and scores stay.
  await q("UPDATE submissions SET audio=NULL WHERE audio IS NOT NULL AND created_at < now() - interval '60 days'");
}
