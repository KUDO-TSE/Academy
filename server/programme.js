import { Router } from 'express';
import { q, audit } from './db.js';
import { SCENARIOS, SCENARIO_KEYS } from './scenarios.js';
import { MODULES, MODULE_BY_KEY, MODULE_FOR_SCENARIO, DEPTH, SOURCE_DECISIONS, ACADEMY_FOLDER } from './curriculum.js';
import { POOLS, draw, drawMixed, publicItem, grade, walk, walkthroughIntro, itemById } from './assess.js';
import { EXPLAIN, RUBRIC, SURVEY, WALKTHROUGHS, PRACTICE } from './curriculum-extra.js';
import { CASES } from './curriculum-bank.js';
import { faqFor } from './sessions.js';
import { updatesFor, editedIn } from './releases.js';
async function videoLinks() { return (await q("SELECT value FROM app_settings WHERE key='videos'")).rows[0]?.value || {}; }
import { enqueue } from './autoreview.js';
import { DEMO_FILTER, resetDemo, createDemo } from './demo.js';
const AUTO = () => process.env.AUTO_REVIEW !== 'off';
import { loadContext, refreshPlan, refreshAll, approvePlan, diffPlans, liveState, buildPlan, getSettings, PASS, PHASES, computeLevels, personalPriority, explainScore } from './engine.js';

const bad = (res, msg) => res.status(400).json({ error: msg });
const SELF_TICK = ['lesson', 'missed', 'teach']; // practice is reviewed by the system when submitted
const moduleMeta = () => MODULES.map(({ key, title, scenario, track, depth, minutes, delivery, summary }) => ({ key, title, scenario, track, depth, minutes, delivery, summary }));

// Baseline check: the first question of every scenario module.
export const BASELINE = MODULES.filter((m) => m.scenario).map((m) => POOLS[m.key][0]);
const BASELINE_IDS = new Set(BASELINE.map((x) => x.id));

async function plansOf(userId) {
  const r = await q("SELECT id,version,status,data,signature,created_at,approved_at,started_on FROM plans WHERE user_id=$1 AND status IN ('draft','approved') ORDER BY version DESC", [userId]);
  return { draft: r.rows.find((p) => p.status === 'draft') || null, approved: r.rows.find((p) => p.status === 'approved') || null };
}

/** The trainee-facing programme (approved plan + live state). */
export async function programmeFor(userId, { useDraft = false } = {}) {
  const ctx = await loadContext(userId);
  const u = ctx.users.find((x) => x.id === userId);
  if (!u) return { status: 'none' };
  let { draft, approved } = await plansOf(userId);
  if (!draft && !approved) { await refreshPlan(userId, ctx); ({ draft, approved } = await plansOf(userId)); }
  const row = useDraft ? (draft || approved) : approved;
  const shared = (ctx.inputs.get(userId) || []).filter((i) => i.shared_summary).map((i) => ({ title: i.title, on: i.happened_on, text: i.shared_summary })).reverse();
  const base = { user: { name: u.name, team: u.team, region: u.region }, settings: ctx.settings, phases: PHASES, modules: moduleMeta(), depth: DEPTH, message: u.plan_overrides?.message || null, shared, folder: ACADEMY_FOLDER };
  if (!row) return { ...base, status: 'pending' };
  return { ...base, status: row.status, version: row.version, plan: row.data, state: liveState(u, row, ctx) };
}

// ------------------------------------------------------------------ trainee routes
export const meProgramme = Router();

meProgramme.get('/programme', async (req, res, next) => { try { res.json(await programmeFor(req.user.id)); } catch (e) { next(e); } });

// Live progress: what the trainee's tests have done to their level, scenario by scenario and module by module.
// Only tests move a level: the first attempt of each module check, decision walkthrough and explain-it recording
// (the KUDO Trainer's review replaces the automatic score), and the baseline check. Lessons, practice and retakes never do.
meProgramme.get('/progress-live', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const p = await programmeFor(uid);
    let levels = p.state?.levels;
    if (!levels) {
      const ctx = await loadContext(uid); const u = ctx.users.find((x) => x.id === uid);
      if (!u) return res.json({ scenarios: [], modules: [], feed: [] });
      const L = computeLevels(u, ctx);
      levels = SCENARIOS.map((sc) => ({ scenario: sc.key, label: sc.label, short: sc.short, now: L.per[sc.key].est, baseline: L.per[sc.key].baseline, target: 80, history: L.per[sc.key].history }));
    }
    const at = (await q("SELECT module_key,kind,correct::float AS correct,total,knowledge::float AS knowledge,counts,created_at FROM quiz_attempts WHERE user_id=$1 AND kind IN ('check','scenario') ORDER BY created_at", [uid])).rows;
    const pctOf = (a) => (a.total ? Math.round((a.correct / a.total) * 100) : null);
    const scen = levels.map((l) => ({ key: l.scenario, label: l.label, short: l.short, start: l.baseline, now: l.now, delta: l.now - l.baseline, target: l.target,
      tests: (l.history || []).filter((h) => h.score != null).length, history: (l.history || []).filter((h) => h.score != null) }));
    const effects = scen.flatMap((s) => s.history.map((h) => ({ ...h, scenario: s.key, short: s.short })));
    const modules = MODULES.map((m) => {
      const mine = at.filter((a) => a.module_key === m.key);
      const rec = (kind) => mine.find((a) => a.kind === kind && a.counts !== false) || null;
      const check = rec('check'), walk = rec('scenario');
      const practice = mine.filter((a) => a.counts === false);
      const eff = effects.filter((e) => e.module === m.key);
      return { key: m.key, title: m.title, scenario: m.scenario, short: SCENARIOS.find((x) => x.key === m.scenario)?.short || null,
        check: check ? { pct: pctOf(check), correct: check.correct, total: check.total, at: check.created_at, passed: check.correct / check.total >= PASS } : null,
        walk: walk ? { pct: pctOf(walk), at: walk.created_at } : null,
        explain: (() => { const x = eff.find((e) => e.kind === 'explain'); return x ? { pct: x.score, reviewed: !!x.reviewed, at: x.at } : null; })(),
        practice: practice.length ? { n: practice.length, last: pctOf(practice[practice.length - 1]), best: Math.max(...practice.map(pctOf)) } : null,
        effect: eff.length ? eff.reduce((t, e) => t + (e.v - e.from), 0) : null };
    });
    const feed = effects.sort((a, b) => new Date(b.at) - new Date(a.at)).map((e) => ({ at: e.at, kind: e.kind, reviewed: !!e.reviewed, module: e.module, moduleTitle: e.module === 'baseline' ? 'Baseline check' : MODULE_BY_KEY[e.module]?.title, scenario: e.scenario, short: e.short, score: e.score, from: e.from, to: e.v }));
    // Every attempt, results of record and practice, for My results.
    const subs = (await q("SELECT module_key,counts,status,rubric,created_at FROM submissions WHERE user_id=$1 AND COALESCE(kind,'explain')='explain' AND status IN ('auto','reviewed') AND rubric IS NOT NULL ORDER BY created_at", [uid])).rows;
    const attempts = [
      ...at.map((a) => ({ at: a.created_at, kind: a.kind, module: a.module_key, pct: pctOf(a), correct: a.correct, total: a.total, record: a.counts !== false })),
      ...subs.map((x) => ({ at: x.created_at, kind: 'explain', module: x.module_key, pct: x.rubric ? Math.round(explainScore(x.rubric) ?? 0) : null, reviewed: x.status === 'reviewed', record: x.counts !== false })),
    ].map((a) => ({ ...a, moduleTitle: MODULE_BY_KEY[a.module]?.title || a.module })).sort((a, b) => new Date(b.at) - new Date(a.at));
    const avg = (k) => Math.round(scen.reduce((t, s) => t + s[k], 0) / (scen.length || 1));
    res.json({ overall: { start: avg('start'), now: avg('now') }, scenarios: scen, modules, feed, attempts, pass: PASS });
  } catch (e) { next(e); }
});

// ------------------------------------------------------------------ sandbox practice
// Runs on the replica of the KUDO screens. The first run is the result of record; passing it (80%) signs the
// module's practice off. For now a sandbox run, like any practice, does not move the level.
const SANDBOX = { 'platform-1': 'platform', 'hi-1': 'hi', 'rtmp-1': 'rtmp', 'hls-1': 'hls' };
// Sandboxes that replace the module's practice sign it off; the others sit next to a written practice task and only keep their result.
const SANDBOX_SIGNS = new Set(['platform-1']);
meProgramme.post('/sandbox/:key', async (req, res, next) => {
  try {
    const key = req.params.key, mk = SANDBOX[key]; if (!mk) return res.status(404).json({ error: 'Not found.' });
    const r = req.body?.result || {}; const ev = Array.isArray(req.body?.events) ? req.body.events.slice(0, 2000) : [];
    const num = (v) => (Number.isFinite(Number(v)) ? Math.max(0, Math.min(100, Math.round(Number(v)))) : null);
    const score = num(r.total); if (score == null) return bad(res, 'Missing result.');
    const result = { total: score, outcome: num(r.outcome), path: num(r.path), time: num(r.time), secs: Math.max(0, Math.round(Number(r.secs) || 0)),
      checks: (Array.isArray(r.checks) ? r.checks : []).slice(0, 40).map((c) => ({ label: String(c.label || '').slice(0, 200), ok: !!c.ok, w: num(c.w) })),
      traps: (Array.isArray(r.traps) ? r.traps : []).slice(0, 20).map((t) => String(t).slice(0, 200)), detours: num(r.detours), hints: num(r.hints), actions: Math.round(Number(r.actions) || 0) };
    const uid = req.user.id;
    const first = (await q('SELECT 1 FROM sandbox_runs WHERE user_id=$1 AND scenario=$2 LIMIT 1', [uid, key])).rowCount === 0;
    const row = (await q('INSERT INTO sandbox_runs (user_id,scenario,score,result,events,record,seconds) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id', [uid, key, score, result, JSON.stringify(ev), first, result.secs])).rows[0];
    if (first && score >= 80 && SANDBOX_SIGNS.has(key)) {
      await q(`INSERT INTO plan_progress (user_id,item_key,status,note,completed_at,signed_off_at) VALUES ($1,$2,'done',$3,now(),now())
        ON CONFLICT (user_id,item_key) DO UPDATE SET status='done', signed_off_at=COALESCE(plan_progress.signed_off_at, now())`, [uid, `${mk}.practice`, `Sandbox: ${score}%`]);
      await refreshPlan(uid).catch(() => {});
    }
    res.json({ id: row.id, record: first, passed: score >= 80 });
  } catch (e) { next(e); }
});
meProgramme.get('/sandbox', async (req, res, next) => {
  try {
    const rows = (await q('SELECT scenario,score,record,seconds,created_at FROM sandbox_runs WHERE user_id=$1 ORDER BY created_at', [req.user.id])).rows;
    res.json({ scenarios: Object.entries(SANDBOX).map(([key, module]) => { const rs = rows.filter((r) => r.scenario === key); const rec = rs.find((r) => r.record);
      return { key, module, record: rec ? { score: rec.score, seconds: rec.seconds, at: rec.created_at } : null, runs: rs.length, best: rs.length ? Math.max(...rs.map((r) => r.score)) : null }; }) });
  } catch (e) { next(e); }
});
meProgramme.get('/sandbox/:key', async (req, res, next) => {
  try {
    if (!SANDBOX[req.params.key]) return res.status(404).json({ error: 'Not found.' });
    res.json({ runs: (await q('SELECT id,score,record,seconds,result,created_at FROM sandbox_runs WHERE user_id=$1 AND scenario=$2 ORDER BY created_at DESC', [req.user.id, req.params.key])).rows });
  } catch (e) { next(e); }
});

meProgramme.get('/modules/:key', async (req, res, next) => {
  try {
    const key = req.params.key, uid = req.user.id;
    if (key === 'baseline') return res.json({ key, title: 'Baseline check', summary: 'One question per scenario. It replaces estimates with real answers so your plan is aimed at the right gaps.', check: BASELINE.map(publicItem), attempts: (await q("SELECT correct::float AS correct,total,created_at FROM quiz_attempts WHERE user_id=$1 AND module_key='baseline' ORDER BY created_at DESC", [uid])).rows });
    const m = MODULE_BY_KEY[key]; if (!m) return res.status(404).json({ error: 'Not found.' });
    const { quiz, ...rest } = m; void quiz;
    const [at, prog, fb, subs] = await Promise.all([
      q("SELECT correct::float AS correct,total,knowledge::float AS knowledge,kind,item_key,counts,created_at FROM quiz_attempts WHERE user_id=$1 AND module_key=$2 ORDER BY created_at DESC", [uid, key]),
      q('SELECT item_key,note,completed_at,signed_off_at FROM plan_progress WHERE user_id=$1 AND item_key LIKE $2', [uid, `${key}.%`]),
      q('SELECT 1 FROM module_feedback WHERE user_id=$1 AND module_key=$2', [uid, key]),
      q('SELECT id,kind,counts,status,rubric,review_comment,text_answer,transcript,auto,needs_human,human_requested,audio_seconds,(audio IS NOT NULL) AS has_audio,self_points,created_at,reviewed_at FROM submissions WHERE user_id=$1 AND module_key=$2 ORDER BY created_at DESC', [uid, key]),
    ]);
    res.json({
      ...rest, check: draw(key, undefined, { reserve: await reserveOpen() }).map(publicItem), poolSize: POOLS[key].length, pass: PASS,
      attempts: at.rows.filter((a) => a.kind === 'check'), walkAttempts: at.rows.filter((a) => a.kind === 'scenario'),
      progress: prog.rows, feedbackGiven: fb.rowCount > 0,
      walkthrough: walkthroughIntro(key), explain: EXPLAIN[key] ? { prompt: EXPLAIN[key].prompt } : null, submissions: subs.rows.filter((x) => x.kind !== 'practice'), rubric: RUBRIC,
      practiceTask: PRACTICE[key] ? { prompt: PRACTICE[key].prompt, type: PRACTICE[key].type } : null, practiceSubmissions: subs.rows.filter((x) => x.kind === 'practice'),
      caseStudy: CASES[key] || null, video: (await videoLinks())[key] || null, faq: (await faqFor(key)).map(({ question, answer }) => ({ question, answer })), updates: await updatesFor(key), updatedLines: editedIn(key),
      scenarioLabel: SCENARIOS.find((s) => s.key === m.scenario)?.label || null, related: (m.related || []).map((s) => SCENARIOS.find((x) => x.key === s)?.short || s),
    });
  } catch (e) { next(e); }
});

// The first attempt in the current assessment cycle is the score of record; later attempts are practice.
// A cycle starts with each knowledge test round (the 3-month retest starts a new one).
// Reserve questions open once a second knowledge test round exists (the 3-month reassessment).
async function reserveOpen() { return (await q("SELECT count(*)::int AS n FROM rounds WHERE kind='live'")).rows[0].n >= 2; }
async function currentCycle() { return (await q("SELECT COALESCE(max(id),0)::int AS c FROM rounds WHERE kind='live'")).rows[0].c; }
async function attemptCounts(uid, moduleKey, kind, itemKey, cycle) {
  const rk = itemKey && itemKey.startsWith('review.') ? itemKey : '';
  const r = await q(`SELECT correct::float AS correct,total,created_at FROM quiz_attempts WHERE user_id=$1 AND module_key=$2 AND kind=$3 AND cycle=$4 AND counts
                      AND (CASE WHEN item_key LIKE 'review.%' THEN item_key ELSE '' END)=$5 ORDER BY created_at LIMIT 1`, [uid, moduleKey, kind, cycle, rk]);
  return { counts: r.rowCount === 0, record: r.rows[0] || null };
}

function validAnswers(body, allowed) {
  const ans = body?.answers;
  if (!Array.isArray(ans) || ans.length < 1 || ans.length > 15) return null;
  const ids = new Set();
  for (const a of ans) { if (typeof a?.id !== 'string' || ids.has(a.id) || !itemById(a.id) || !allowed(itemById(a.id))) return null; ids.add(a.id); }
  return ans;
}
const compact = (g) => JSON.stringify(g.results.map((r) => ({ id: r.id, score: r.score, knowledge: r.knowledge, conf: r.conf ?? null, scenario: r.scenario || null, ...(r.t === 'mcq' ? { pick: r.given } : {}) })));

meProgramme.post('/modules/:key/attempt', async (req, res, next) => {
  try {
    const key = req.params.key;
    if (key !== 'baseline' && !MODULE_BY_KEY[key]) return res.status(404).json({ error: 'Not found.' });
    const allowed = key === 'baseline' ? (x) => BASELINE_IDS.has(x.id) : (x) => x.module === key;
    const ans = validAnswers(req.body, allowed);
    if (!ans || (key === 'baseline' && ans.length !== BASELINE.length) || (key !== 'baseline' && ans.length < Math.min(3, POOLS[key].length))) return bad(res, 'Answer every question first.');
    const g = grade(ans, allowed);
    if (g.error) return bad(res, g.error);
    const itemKey = typeof req.body?.item_key === 'string' && /^[a-z0-9.]{1,40}$/.test(req.body.item_key) ? req.body.item_key : null;
    const cycle = await currentCycle();
    const { counts, record } = await attemptCounts(req.user.id, key, 'check', itemKey, cycle);
    await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,knowledge,cbm,kind,answers,counts,cycle) VALUES ($1,$2,$3,$4,$5,$6,$7,'check',$8,$9,$10)", [req.user.id, key, itemKey, g.correct, g.total, g.knowledge, g.cbm, compact(g), counts, cycle]);
    await audit(req, counts ? 'check.recorded' : 'check.practice', key, `${g.correct}/${g.total}`);
    const status = counts ? await refreshPlan(req.user.id) : 'unchanged';
    res.json({ ...g, passed: key === 'baseline' || g.correct / g.total >= PASS, planChanged: status === 'draft', counts, record: counts ? { correct: g.correct, total: g.total } : record });
  } catch (e) { next(e); }
});

meProgramme.get('/modules/:key/walk', (req, res) => {
  const w = walkthroughIntro(req.params.key);
  return w ? res.json({ first: w.first }) : res.status(404).json({ error: 'Not found.' });
});
meProgramme.post('/modules/:key/walk', async (req, res, next) => {
  try {
    const key = req.params.key;
    const r = walk(key, req.body?.path, req.body?.keys);
    if (r.error) return bad(res, r.error);
    if (r.end) {
      const cycle = await currentCycle();
      const { counts, record } = await attemptCounts(req.user.id, key, 'scenario', null, cycle);
      await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,kind,answers,counts,cycle) VALUES ($1,$2,$3,$4,$5,'scenario',$6,$7,$8)", [req.user.id, key, `${key}.scenario`, r.score, r.max, JSON.stringify(r.path), counts, cycle]);
      await audit(req, 'walkthrough', key, `${r.score}/${r.max}${counts ? '' : ' (practice)'}`);
      const { path: _p, ...out } = r; void _p;
      return res.json({ ...out, counts, record: counts ? { correct: r.score, total: r.max } : record });
    }
    const { path: _p, ...out } = r; void _p;
    res.json(out);
  } catch (e) { next(e); }
});

meProgramme.post('/modules/:key/feedback', async (req, res, next) => {
  try {
    const key = req.params.key; if (!MODULE_BY_KEY[key]) return res.status(404).json({ error: 'Not found.' });
    const n = (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : null);
    const b = req.body || {}; const clear = n(b.clear), relevant = n(b.relevant), confidence = n(b.confidence);
    if (!clear || !relevant || !confidence) return bad(res, 'Rate all three, from 1 to 5.');
    await q(`INSERT INTO module_feedback (user_id,module_key,clear,relevant,confidence,comment) VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (user_id,module_key) DO UPDATE SET clear=$3,relevant=$4,confidence=$5,comment=$6,created_at=now()`, [req.user.id, key, clear, relevant, confidence, b.comment ? String(b.comment).slice(0, 2000) : null]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

const AUDIO_MIME = /^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a)(;.*)?$/;
meProgramme.post('/explain/:key', async (req, res, next) => {
  try {
    const key = req.params.key; const b = req.body || {};
    const kind = b.kind === 'practice' ? 'practice' : 'explain';
    if (!(kind === 'practice' ? PRACTICE[key] : EXPLAIN[key])) return res.status(404).json({ error: 'Not found.' });
    const text = b.text ? String(b.text).slice(0, 8000) : null;
    let audio = null, mime = null;
    if (b.audio) {
      if (typeof b.audio !== 'string' || !AUDIO_MIME.test(String(b.mime || ''))) return bad(res, 'That recording format is not supported.');
      audio = Buffer.from(b.audio, 'base64'); mime = String(b.mime).split(';')[0];
      if (audio.length > 6 * 1024 * 1024) return bad(res, 'The recording is too long. Keep it under 3 minutes.');
    }
    if (!audio && (!text || text.trim().length < 40)) return bad(res, 'Record it, or write at least a few sentences.');
    const secs = Number.isFinite(Number(b.seconds)) ? Math.min(600, Math.round(Number(b.seconds))) : null;
    const cycle = await currentCycle();
    const first = (await q('SELECT 1 FROM submissions WHERE user_id=$1 AND module_key=$2 AND kind=$3 AND cycle=$4 AND counts', [req.user.id, key, kind, cycle])).rowCount === 0;
    const r = await q('INSERT INTO submissions (user_id,module_key,text_answer,audio,audio_mime,audio_seconds,status,kind,counts,cycle) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id', [req.user.id, key, text, audio, mime, secs, AUTO() ? 'processing' : 'submitted', kind, first, cycle]);
    await audit(req, `${kind}.submit`, key, audio ? 'audio' : 'text');
    if (AUTO()) enqueue(r.rows[0].id);
    res.json({ id: r.rows[0].id, counts: first, status: AUTO() ? 'processing' : 'submitted', points: (kind === 'practice' ? PRACTICE[key] : EXPLAIN[key]).points });
  } catch (e) { next(e); }
});
meProgramme.get('/explain/result/:id', async (req, res, next) => {
  try {
    const r = await q('SELECT id,module_key,kind,counts,status,rubric,review_comment,transcript,auto,needs_human,human_requested,created_at,reviewed_at FROM submissions WHERE id=$1 AND user_id=$2', [Number(req.params.id), req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});
meProgramme.post('/explain/:id/ask-jack', async (req, res, next) => {
  try {
    const r = await q('UPDATE submissions SET needs_human=TRUE, human_requested=TRUE WHERE id=$1 AND user_id=$2 RETURNING id', [Number(req.params.id), req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    await audit(req, 'explain.ask_jack', req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
meProgramme.patch('/explain/:id/points', async (req, res, next) => {
  try {
    const pts = Array.isArray(req.body?.points) ? req.body.points.filter((x) => Number.isInteger(x) && x >= 0 && x < 20) : [];
    const r = await q('UPDATE submissions SET self_points=$3 WHERE id=$1 AND user_id=$2', [Number(req.params.id), req.user.id, JSON.stringify(pts)]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

meProgramme.get('/survey', async (req, res, next) => {
  try { const r = await q('SELECT answers FROM survey_responses WHERE user_id=$1', [req.user.id]); res.json({ questions: SURVEY, done: r.rowCount > 0 }); } catch (e) { next(e); }
});
meProgramme.post('/survey', async (req, res, next) => {
  try {
    const a = req.body?.answers || {}; const out = {};
    for (const x of SURVEY) {
      const v = a[x.key];
      if (x.type === 'scale5') { if (!(Number.isInteger(v) && v >= 1 && v <= 5)) return bad(res, 'Answer every rating question.'); out[x.key] = v; }
      else if (x.type === 'nps') { if (!(Number.isInteger(v) && v >= 0 && v <= 10)) return bad(res, 'Give a score from 0 to 10.'); out[x.key] = v; }
      else if (x.type === 'choice') { if (!x.o.includes(v)) return bad(res, 'Pick one answer for each choice question.'); out[x.key] = v; }
      else out[x.key] = v ? String(v).slice(0, 2000) : '';
    }
    await q('INSERT INTO survey_responses (user_id,answers) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET answers=$2, created_at=now()', [req.user.id, out]);
    await audit(req, 'survey.submit', null);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Weekly challenge: four questions mixed from modules the trainee has already started. Interleaved retrieval; it does not change levels.
async function challengeState(uid) {
  const r = await q("SELECT created_at FROM quiz_attempts WHERE user_id=$1 AND kind='challenge' ORDER BY created_at DESC", [uid]);
  const wk = (d) => { const x = new Date(d); const day = (x.getUTCDay() + 6) % 7; x.setUTCHours(0, 0, 0, 0); x.setUTCDate(x.getUTCDate() - day); return x.getTime(); };
  const weeks = [...new Set(r.rows.map((x) => wk(x.created_at)))].sort((a, b) => b - a);
  const thisWeek = wk(new Date());
  // "Weeks active" never resets: a busy client week costs nothing, and coming back always counts.
  const plan = await q("SELECT started_on FROM plans WHERE user_id=$1 AND started_on IS NOT NULL ORDER BY version LIMIT 1", [uid]);
  const start = plan.rows[0]?.started_on ? wk(plan.rows[0].started_on) : null;
  const inPlan = start ? weeks.filter((w) => w >= start) : weeks;
  const weeksSoFar = start ? Math.min(12, Math.max(1, Math.floor((thisWeek - start) / (7 * 864e5)) + 1)) : null;
  return { doneThisWeek: weeks[0] === thisWeek, weeksActive: Math.min(inPlan.length, 12), weeksSoFar, total: r.rowCount };
}
meProgramme.get('/challenge', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const touched = await q("SELECT DISTINCT split_part(item_key,'.',1) AS k FROM plan_progress WHERE user_id=$1 UNION SELECT DISTINCT module_key FROM quiz_attempts WHERE user_id=$1 AND kind IN ('check','scenario')", [uid]);
    let keys = touched.rows.map((r) => r.k).filter((k) => POOLS[k]);
    if (keys.length < 2) keys = ['foundations', 'platform', 'ai', 'teams'];
    res.json({ ...(await challengeState(uid)), items: drawMixed(keys, 4, { reserve: await reserveOpen() }).map(publicItem) });
  } catch (e) { next(e); }
});
meProgramme.post('/challenge', async (req, res, next) => {
  try {
    const ans = validAnswers(req.body, () => true);
    if (!ans || ans.length !== 4) return bad(res, 'Answer all four questions.');
    const g = grade(ans);
    await q("INSERT INTO quiz_attempts (user_id,module_key,correct,total,knowledge,cbm,kind,answers) VALUES ($1,'challenge',$2,$3,$4,$5,'challenge',$6)", [req.user.id, g.correct, g.total, g.knowledge, g.cbm, compact(g)]);
    res.json({ ...g, ...(await challengeState(req.user.id)) });
  } catch (e) { next(e); }
});

// Trainee choice: keep the first two focus scenarios and choose the third from the next two in priority. The change
// becomes a draft plan that the KUDO Trainer approves, like any other change to the plan's structure.
meProgramme.get('/plan/options', async (req, res, next) => {
  try {
    const ctx = await loadContext(req.user.id); const u = ctx.users.find((x) => x.id === req.user.id);
    const pr = await q("SELECT data FROM plans WHERE user_id=$1 AND status='approved' ORDER BY version DESC LIMIT 1", [req.user.id]);
    const plan = pr.rows[0]?.data; if (!plan) return res.json({ canChoose: false });
    const pending = (await q("SELECT 1 FROM plans WHERE user_id=$1 AND status='draft'", [req.user.id])).rowCount > 0;
    if (plan.focusPinned || plan.focus.length < 3) return res.json({ canChoose: false, reason: plan.focusPinned ? 'Your KUDO Trainer chose your focus areas with you.' : null });
    const levels = computeLevels(u, ctx, { forPlanning: true });
    const pri = personalPriority(u, levels, ctx).filter((p) => p.gapPts >= 5 && !plan.focus.slice(0, 2).includes(p.scenario));
    const options = pri.slice(0, 3).map((p) => ({ scenario: p.scenario, label: SCENARIOS.find((x) => x.key === p.scenario)?.label || p.scenario, gap: Math.round(p.gapPts), current: p.scenario === plan.focus[2] }));
    res.json({ canChoose: options.length > 1, pending, keep: plan.focus.slice(0, 2), options });
  } catch (e) { next(e); }
});
meProgramme.post('/plan/focus', async (req, res, next) => {
  try {
    const third = String(req.body?.third || '');
    const pr = await q("SELECT data FROM plans WHERE user_id=$1 AND status='approved' ORDER BY version DESC LIMIT 1", [req.user.id]);
    const plan = pr.rows[0]?.data; if (!plan || plan.focusPinned || plan.focus.length < 3) return bad(res, 'Your focus areas cannot be changed here. Ask your KUDO Trainer.');
    const ctx = await loadContext(req.user.id); const u = ctx.users.find((x) => x.id === req.user.id);
    const allowed = personalPriority(u, computeLevels(u, ctx, { forPlanning: true }), ctx).filter((p) => p.gapPts >= 5 && !plan.focus.slice(0, 2).includes(p.scenario)).slice(0, 3).map((p) => p.scenario);
    if (!allowed.includes(third)) return bad(res, 'Pick one of the suggested scenarios.');
    const ov = { ...(u.plan_overrides || {}), traineeFocus: [...plan.focus.slice(0, 2), third] };
    await q('UPDATE users SET plan_overrides=$2 WHERE id=$1', [req.user.id, ov]);
    await audit(req, 'plan.focus.choice', third);
    const status = await refreshPlan(req.user.id);
    res.json({ ok: true, status });
  } catch (e) { next(e); }
});

// Spaced review: questions the trainee missed or guessed on come back one week later, then three weeks after the miss.
// A right answer given with some certainty on the second return closes the question; a miss starts the clock again.
// Practice only: it never changes levels or the recorded score.
const DAY = 864e5;
async function spacedDue(uid) {
  const r = await q("SELECT kind, answers, created_at FROM quiz_attempts WHERE user_id=$1 AND kind IN ('check','challenge','spaced') ORDER BY created_at", [uid]);
  const st = new Map(); // id -> { t0, reviews, closed }
  for (const a of r.rows) for (const x of a.answers || []) {
    if (!x.id || !itemById(x.id)) continue;
    const weak = Number(x.score) < 0.999 || x.conf === 1;
    const cur = st.get(x.id);
    if (a.kind === 'spaced') {
      if (!cur || cur.closed) continue;
      if (weak) st.set(x.id, { t0: new Date(a.created_at), reviews: 0 });
      else { cur.reviews++; if (cur.reviews >= 2) cur.closed = true; }
    } else if (weak) st.set(x.id, { t0: new Date(a.created_at), reviews: 0 });
  }
  const now = Date.now();
  const due = [...st.entries()].filter(([, v]) => !v.closed && now - v.t0 >= (v.reviews === 0 ? 7 : 21) * DAY).map(([id]) => id);
  return { due, waiting: [...st.values()].filter((v) => !v.closed).length - due.length };
}
meProgramme.get('/review', async (req, res, next) => {
  try {
    const d = await spacedDue(req.user.id);
    const items = d.due.slice(0, 6).map(itemById);
    res.json({ due: d.due.length, waiting: d.waiting, items: items.map(publicItem) });
  } catch (e) { next(e); }
});
meProgramme.post('/review', async (req, res, next) => {
  try {
    const d = await spacedDue(req.user.id); const ok = new Set(d.due);
    const ans = validAnswers(req.body, (x) => ok.has(x.id));
    if (!ans) return bad(res, 'These questions are not due for review. Reload the page.');
    const g = grade(ans);
    if (g.error) return bad(res, g.error);
    await q("INSERT INTO quiz_attempts (user_id,module_key,correct,total,knowledge,cbm,kind,answers,counts) VALUES ($1,'spaced',$2,$3,$4,$5,'spaced',$6,FALSE)", [req.user.id, g.correct, g.total, g.knowledge, g.cbm, compact(g)]);
    res.json({ ...g, counts: false });
  } catch (e) { next(e); }
});

meProgramme.post('/items/:key/done', async (req, res, next) => {
  try {
    const key = req.params.key;
    const p = await programmeFor(req.user.id);
    const it = p.state?.items.find((i) => i.key === key);
    if (!it) return res.status(404).json({ error: 'Not in your plan.' });
    if (!SELF_TICK.includes(it.kind)) return bad(res, 'This one is completed automatically.');
    const note = String(req.body?.note || '').slice(0, 2000) || null;
    await q(`INSERT INTO plan_progress (user_id,item_key,status,note) VALUES ($1,$2,'done',$3)
             ON CONFLICT (user_id,item_key) DO UPDATE SET note=COALESCE(EXCLUDED.note, plan_progress.note), completed_at=now()`, [req.user.id, key, note]);
    await audit(req, 'item.done', key);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
meProgramme.delete('/items/:key/done', async (req, res, next) => {
  try { await q('DELETE FROM plan_progress WHERE user_id=$1 AND item_key=$2 AND signed_off_at IS NULL', [req.user.id, req.params.key]); res.json({ ok: true }); } catch (e) { next(e); }
});
meProgramme.get('/missed', async (req, res, next) => {
  try {
    const r = await q(`SELECT qu.qnum, qu.scenario, qu.question, qu.answer FROM question_results qr JOIN questions qu ON qu.round_id=qr.round_id AND qu.qnum=qr.qnum
                        WHERE qr.user_id=$1 AND NOT qr.correct AND qr.round_id=(SELECT r.id FROM rounds r JOIN question_results x ON x.round_id=r.id WHERE x.user_id=$1 ORDER BY r.sort DESC LIMIT 1) ORDER BY qu.qnum`, [req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// ------------------------------------------------------------------ admin routes
export const adminProgramme = Router();

const SIGNAL_WORDS = {
  teams: ['teams', 'microsoft', 'lobby', 'tenant', 'sync meeting'], zoom: ['zoom', 'encryption', 'waiting room', 'e2e'],
  onsite: ['onsite', 'on-site', 'venue', 'qr', 'mobile link', 'wi-fi', 'wifi', 'access point', 'mixing desk'],
  hybrid: ['hybrid', 'dante', 'audio manager', 'bosch', 'televic', 'taiden', 'venue audio'],
  platform: ['platform', 'host', 'recording', 'grace period', 'participant link', 'viewer', 'content tab'],
  widget: ['widget', 'iframe', 'embed', 'obs', 'vb-cable', 'ingest'], external: ['google meet', 'webex', 'on24', 'external meeting'],
  meetnow: ['meet now', 'kudo live', 'two-way', 'one-way'], rtmp: ['rtmp', 'youtube', 'facebook', 'stream key', 'ibm'],
  hls: ['hls', 'broadcast', 'large meeting'], hi: ['interpreter', 'interpretation', 'booth', 'marketplace', 'language services'],
  ai: ['ai ', 'captions', 'speech and captions', 'speech & captions', 'language detection', 'glossary', 'speedometer'],
};
const NEG = ["not sure", "don't know", 'do not know', "didn't know", 'confus', 'unclear', 'struggl', 'wrong', 'forgot', 'mistake', "couldn't", 'hesitat', 'guess', 'unsure', 'no idea', 'lost'];
const POS = ['confident', 'clear', 'correct', 'explained well', 'nailed', 'solid', 'knew', 'well done', 'spot on', 'great answer', 'comfortable'];
export function suggestSignals(text) {
  const t = ` ${String(text || '').toLowerCase()} `;
  const sentences = t.split(/(?<=[.!?\n])\s+/);
  const out = [];
  for (const [s, words] of Object.entries(SIGNAL_WORDS)) {
    const hits = sentences.filter((x) => words.some((w) => x.includes(w)));
    if (hits.length < 2) continue;
    const neg = hits.filter((x) => NEG.some((w) => x.includes(w))).length, pos = hits.filter((x) => POS.some((w) => x.includes(w))).length;
    out.push({ scenario: s, rating: neg > pos ? 'gap' : pos > neg ? 'solid' : 'developing', mentions: hits.length, example: hits.find((x) => NEG.some((w) => x.includes(w))) || hits[0] });
  }
  return out.sort((a, b) => b.mentions - a.mentions).map((x) => ({ ...x, example: x.example.trim().slice(0, 220) }));
}

adminProgramme.get('/programme', async (_req, res, next) => {
  try {
    const ctx = await refreshAll();
    const plans = (await q("SELECT user_id,version,status,data,started_on FROM plans WHERE status IN ('draft','approved')")).rows;
    const rows = ctx.users.map((u) => {
      const mine = plans.filter((p) => p.user_id === u.id);
      const approved = mine.find((p) => p.status === 'approved'), draft = mine.find((p) => p.status === 'draft');
      const st = approved ? liveState(u, approved, ctx) : null;
      const awaiting = st ? st.items.filter((i) => i.kind === 'practice' && i.done && !i.signed_off).length : 0;
      return {
        id: u.id, name: u.name, team: u.team, region: u.region, demo: u.is_demo,
        status: approved ? (draft ? 'changes' : 'approved') : 'draft', focus: (draft || approved)?.data.focus || [],
        progress: st?.progress || null, week: st?.week || null, readiness: st?.readiness || null, next: st?.next[0]?.title || null,
        jackNext: st?.jackNext.map((i) => i.title) || [], awaiting,
      };
    });
    res.json({ settings: ctx.settings, rows });
  } catch (e) { next(e); }
});

adminProgramme.put('/programme/settings', async (req, res, next) => {
  try {
    const goal = String(req.body?.goal || '').trim(), target = Number(req.body?.target);
    if (!goal || goal.length > 400) return bad(res, 'Write the goal in 400 characters or fewer.');
    if (!(target >= 50 && target <= 100)) return bad(res, 'Target must be between 50 and 100.');
    await q("INSERT INTO app_settings (key,value) VALUES ('programme',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [{ goal, target }]);
    await audit(req, 'programme.settings', null, `${target}%`);
    await refreshAll();
    res.json({ ok: true });
  } catch (e) { next(e); }
});

adminProgramme.post('/programme/approve-all', async (req, res, next) => {
  try {
    await refreshAll();
    const r = await q("SELECT DISTINCT user_id FROM plans WHERE status='draft'");
    for (const x of r.rows) await approvePlan(x.user_id, req.user.id);
    await audit(req, 'programme.approve_all', null, `${r.rowCount} plans`);
    res.json({ approved: r.rowCount });
  } catch (e) { next(e); }
});

adminProgramme.put('/curriculum/:key/video', async (req, res, next) => {
  try {
    const key = req.params.key; if (!MODULE_BY_KEY[key]) return res.status(404).json({ error: 'Not found.' });
    const url = String(req.body?.url || '').trim();
    if (url) { let u; try { u = new URL(url); } catch { return bad(res, 'Paste a full link starting with https://'); } if (u.protocol !== 'https:') return bad(res, 'Use an https link.'); }
    const v = await videoLinks(); if (url) v[key] = url.slice(0, 1000); else delete v[key];
    await q("INSERT INTO app_settings (key,value) VALUES ('videos',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [v]);
    await audit(req, 'curriculum.video', key, url ? 'set' : 'cleared');
    res.json({ ok: true, video: v[key] || null });
  } catch (e) { next(e); }
});
adminProgramme.get('/curriculum', async (_req, res) => { const vids = await videoLinks(); const faqs = (await q("SELECT id,module_key,question,answer FROM field_notes WHERE status='published' AND kind='faq'")).rows; res.json({ modules: MODULES.map((m) => ({ ...m, faq: faqs.filter((f) => f.module_key === m.key), caseStudy: CASES[m.key] || null, video: vids[m.key] || null, pool: POOLS[m.key], walkthroughFull: WALKTHROUGHS[m.key] || null, explainFull: EXPLAIN[m.key] || null, practiceFull: PRACTICE[m.key] || null })), rubric: RUBRIC, decisions: SOURCE_DECISIONS, depth: DEPTH, folder: ACADEMY_FOLDER, baseline: BASELINE.length }); });

adminProgramme.get('/trainees/:id/programme', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await refreshPlan(id);
    const ctx = await loadContext(id);
    const u = ctx.users.find((x) => x.id === id); if (!u) return res.status(404).json({ error: 'Not found.' });
    const { draft, approved } = await plansOf(id);
    const inputs = (await q(`SELECT i.id,i.kind,i.happened_on,i.title,i.link,i.body,i.signals,i.item_key,i.shared_summary,a.name AS author FROM inputs i LEFT JOIN users a ON a.id=i.author_id WHERE i.user_id=$1 ORDER BY i.happened_on DESC, i.id DESC`, [id])).rows;
    const attempts = (ctx.attempts.get(id) || []).map(({ module_key, item_key, correct, total, counts, kind, created_at }) => ({ module_key, item_key, correct, total, counts, kind, created_at })).reverse();
    const { levels } = buildPlan(u, ctx);
    res.json({
      user: { id: u.id, name: u.name, team: u.team, learning_pref: u.profile?.learning_pref || null, demo: u.is_demo },
      overrides: u.plan_overrides || {}, settings: ctx.settings, phases: PHASES, modules: moduleMeta(),
      approved: approved ? { version: approved.version, approved_at: approved.approved_at, started_on: approved.started_on, plan: approved.data, state: liveState(u, approved, ctx) } : null,
      draft: draft ? { version: draft.version, created_at: draft.created_at, plan: draft.data, state: liveState(u, { ...draft, started_on: approved?.started_on || null }, ctx), diff: diffPlans(approved?.data, draft.data) } : null,
      levels: SCENARIOS.map((s) => ({ scenario: s.key, short: s.short, ...levels.per[s.key] })),
      inputs, attempts,
    });
  } catch (e) { next(e); }
});

adminProgramme.get('/trainees/:id/preview', async (req, res, next) => {
  try { res.json(await programmeFor(Number(req.params.id), { useDraft: req.query.draft === '1' })); } catch (e) { next(e); }
});

adminProgramme.post('/trainees/:id/programme/approve', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await refreshPlan(id);
    if (!(await approvePlan(id, req.user.id))) return bad(res, 'There is no draft to approve.');
    await audit(req, 'programme.approve', String(id));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

adminProgramme.put('/trainees/:id/programme/overrides', async (req, res, next) => {
  try {
    const id = Number(req.params.id); const b = req.body || {};
    const focus = Array.isArray(b.focus) ? b.focus.filter((s) => SCENARIO_KEYS.includes(s)).slice(0, 3) : [];
    const skip = Array.isArray(b.skip) ? b.skip.filter((s) => typeof s === 'string' && /^[a-z0-9.]{1,40}$/.test(s)).slice(0, 80) : [];
    const message = b.message ? String(b.message).slice(0, 1000) : null;
    const prevOv = (await q('SELECT plan_overrides FROM users WHERE id=$1', [id])).rows[0]?.plan_overrides || {};
    await q('UPDATE users SET plan_overrides=$2 WHERE id=$1', [id, { ...(prevOv.traineeFocus ? { traineeFocus: prevOv.traineeFocus } : {}), focus, skip, message }]);
    await audit(req, 'programme.overrides', String(id), JSON.stringify({ focus, skip: skip.length }));
    await refreshPlan(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

adminProgramme.post('/trainees/:id/items/:key/signoff', async (req, res, next) => {
  try {
    const id = Number(req.params.id), key = req.params.key;
    if (!/^[a-z0-9.]{1,40}$/.test(key)) return bad(res, 'Invalid item.');
    await q(`INSERT INTO plan_progress (user_id,item_key,status,signed_off_by,signed_off_at) VALUES ($1,$2,'done',$3,now())
             ON CONFLICT (user_id,item_key) DO UPDATE SET signed_off_by=$3, signed_off_at=now()`, [id, key, req.user.id]);
    await audit(req, 'item.signoff', `${id}:${key}`);
    await refreshPlan(id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
adminProgramme.post('/trainees/:id/items/:key/done', async (req, res, next) => {
  try {
    const id = Number(req.params.id), key = req.params.key;
    if (!/^[a-z0-9.]{1,40}$/.test(key)) return bad(res, 'Invalid item.');
    if (req.body?.undo) await q('DELETE FROM plan_progress WHERE user_id=$1 AND item_key=$2', [id, key]);
    else await q(`INSERT INTO plan_progress (user_id,item_key,status) VALUES ($1,$2,'done') ON CONFLICT DO NOTHING`, [id, key]);
    await audit(req, req.body?.undo ? 'item.undo' : 'item.done_by_admin', `${id}:${key}`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

adminProgramme.post('/inputs/suggest', (req, res) => res.json({ signals: suggestSignals(req.body?.text) }));

adminProgramme.post('/trainees/:id/inputs', async (req, res, next) => {
  try {
    const id = Number(req.params.id); const b = req.body || {};
    if (!['one_to_one', 'recording', 'observation', 'other'].includes(b.kind)) return bad(res, 'Choose the type of input.');
    const title = String(b.title || '').trim(); if (!title) return bad(res, 'Give it a short title.');
    if (b.happened_on && !/^\d{4}-\d{2}-\d{2}$/.test(b.happened_on)) return bad(res, 'Date must be YYYY-MM-DD.');
    if (b.link && !/^https:\/\//i.test(b.link)) return bad(res, 'Link must start with https://');
    const body = b.body ? String(b.body).slice(0, 200000) : null;
    const signals = Array.isArray(b.signals) ? b.signals.filter((s) => SCENARIO_KEYS.includes(s?.scenario) && ['gap', 'developing', 'solid'].includes(s?.rating)).map((s) => ({ scenario: s.scenario, rating: s.rating, note: s.note ? String(s.note).slice(0, 300) : null })) : [];
    const itemKey = b.item_key && /^[a-z0-9.]{1,40}$/.test(b.item_key) ? b.item_key : null;
    const r = await q(`INSERT INTO inputs (user_id,author_id,kind,happened_on,title,link,body,signals,item_key,shared_summary)
                       VALUES ($1,$2,$3,COALESCE($4::date,CURRENT_DATE),$5,$6,$7,$8,$9,$10) RETURNING id`,
      [id, req.user.id, b.kind, b.happened_on || null, title.slice(0, 200), b.link || null, body, JSON.stringify(signals), itemKey, b.shared_summary ? String(b.shared_summary).slice(0, 2000) : null]);
    await audit(req, 'input.add', String(id), `${b.kind}, ${signals.length} signals`);
    const status = await refreshPlan(id);
    res.json({ id: r.rows[0].id, planChanged: status === 'draft' });
  } catch (e) { next(e); }
});
adminProgramme.delete('/inputs/:id', async (req, res, next) => {
  try {
    const r = await q('DELETE FROM inputs WHERE id=$1 RETURNING user_id', [Number(req.params.id)]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    await audit(req, 'input.delete', req.params.id);
    await refreshPlan(r.rows[0].user_id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ------------------------------------------------------------------ admin: explain-it reviews and feedback
adminProgramme.get('/reviews', async (_req, res, next) => {
  try {
    const r = await q(`SELECT s.id,s.user_id,u.name,s.module_key,s.kind,s.counts,s.text_answer,s.transcript,s.auto,s.needs_human,s.human_requested,s.audio_seconds,(s.audio IS NOT NULL) AS has_audio,s.self_points,s.status,s.rubric,s.review_comment,s.created_at,s.reviewed_at
                         FROM submissions s JOIN users u ON u.id=s.user_id ORDER BY (s.needs_human AND s.status <> 'reviewed') DESC, s.created_at DESC LIMIT 150`);
    res.json({ rubric: RUBRIC, items: r.rows.map((x) => ({ ...x, module: MODULE_BY_KEY[x.module_key]?.title || x.module_key, prompt: (x.kind === 'practice' ? PRACTICE : EXPLAIN)[x.module_key]?.prompt, points: (x.kind === 'practice' ? PRACTICE : EXPLAIN)[x.module_key]?.points || [] })) });
  } catch (e) { next(e); }
});
adminProgramme.get('/submissions/:id/audio', async (req, res, next) => {
  try {
    const r = await q('SELECT audio,audio_mime FROM submissions WHERE id=$1 AND audio IS NOT NULL', [Number(req.params.id)]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    res.setHeader('Content-Type', r.rows[0].audio_mime || 'audio/webm'); res.setHeader('Cache-Control', 'private, no-store');
    res.send(r.rows[0].audio);
  } catch (e) { next(e); }
});
adminProgramme.post('/submissions/:id/review', async (req, res, next) => {
  try {
    const id = Number(req.params.id); const rb = req.body?.rubric || {};
    const scores = {}; for (const c of RUBRIC) { const v = rb[c.key]; if (![1, 2, 3].includes(v)) return bad(res, 'Score every criterion from 1 to 3.'); scores[c.key] = v; }
    const comment = req.body?.comment ? String(req.body.comment).slice(0, 2000) : null;
    const r = await q("UPDATE submissions SET status='reviewed', rubric=$2, review_comment=$3, reviewer_id=$4, reviewed_at=now(), needs_human=FALSE WHERE id=$1 RETURNING user_id,module_key,kind", [id, scores, comment, req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    const { user_id: uid, module_key: mk } = r.rows[0];
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / RUBRIC.length;
    const rating = avg >= 2.5 ? 'solid' : avg >= 1.75 ? 'developing' : 'gap';
    const scenario = MODULE_BY_KEY[mk]?.scenario || MODULE_BY_KEY[mk]?.related?.[0] || null;
    const recorded = (await q('SELECT counts FROM submissions WHERE id=$1', [id])).rows[0]?.counts;
    if (!recorded) { await audit(req, 'review.practice_attempt', String(id)); return res.json({ ok: true, rating, planChanged: false, practiceOnly: true }); }
    if (r.rows[0].kind === 'practice' && rating !== 'gap') await q(`INSERT INTO plan_progress (user_id,item_key,status,signed_off_by,signed_off_at) VALUES ($1,$2,'done',$3,now()) ON CONFLICT (user_id,item_key) DO UPDATE SET signed_off_by=$3, signed_off_at=now()`, [uid, `${mk}.practice`, req.user.id]);
    await q(`INSERT INTO inputs (user_id,author_id,kind,title,signals,shared_summary) VALUES ($1,$2,'recording',$3,$4,$5)`,
      [uid, req.user.id, `${r.rows[0].kind === 'practice' ? 'Practice' : 'Explain-it'} review: ${MODULE_BY_KEY[mk]?.title || mk}`, JSON.stringify(scenario ? [{ scenario, rating }] : []), comment]);
    await audit(req, 'explain.review', String(id), `${avg.toFixed(2)} ${rating}`);
    const status = await refreshPlan(uid);
    res.json({ ok: true, rating, planChanged: status === 'draft' });
  } catch (e) { next(e); }
});

adminProgramme.get('/feedback', async (_req, res, next) => {
  try {
    const [mods, comments, surveys, attempts] = await Promise.all([
      q(`SELECT module_key, count(*)::int n, avg(clear)::float clear, avg(relevant)::float relevant, avg(confidence)::float confidence FROM module_feedback WHERE ${DEMO_FILTER} GROUP BY module_key`),
      q(`SELECT module_key, comment, created_at FROM module_feedback WHERE ${DEMO_FILTER} AND comment IS NOT NULL AND comment <> '' ORDER BY created_at DESC LIMIT 200`),
      q(`SELECT answers, created_at FROM survey_responses WHERE ${DEMO_FILTER} ORDER BY created_at DESC`),
      q(`SELECT module_key, answers FROM quiz_attempts WHERE ${DEMO_FILTER} AND kind='check' AND counts AND module_key <> 'baseline'`),
    ]);
    const agree = await q(`SELECT kind, auto, rubric FROM submissions WHERE ${DEMO_FILTER} AND status='reviewed' AND auto IS NOT NULL AND rubric IS NOT NULL`);
    // Item analysis: which questions are missed most, and which are answered wrongly with high certainty (a sign of a misconception).
    const items = new Map();
    for (const a of attempts.rows) for (const x of a.answers || []) {
      if (!x.id) continue;
      const it = items.get(x.id) || { id: x.id, n: 0, score: 0, confWrong: 0 };
      it.n++; it.score += Number(x.score ?? (x.ok ? 1 : 0)); if (x.conf === 3 && Number(x.score) === 0) it.confWrong++;
      items.set(x.id, it);
    }
    const stats = itemStats(attempts.rows);
    const agreement = autoAgreement(agree.rows);
    const hardest = [...items.values()].filter((x) => x.n >= 2).map((x) => ({ ...x, rate: Math.round((x.score / x.n) * 100), q: itemById(x.id)?.q, module: itemById(x.id)?.module })).sort((a, b) => a.rate - b.rate).slice(0, 15);
    const sv = surveys.rows.map((r) => r.answers);
    const nps = sv.length ? Math.round(((sv.filter((a) => a.nps >= 9).length - sv.filter((a) => a.nps <= 6).length) / sv.length) * 100) : null;
    const avgOf = (k) => (sv.length ? sv.reduce((t, a) => t + (a[k] || 0), 0) / sv.length : null);
    res.json({
      modules: MODULES.map((m) => ({ key: m.key, title: m.title, ...(mods.rows.find((r) => r.module_key === m.key) || { n: 0 }) })),
      comments: comments.rows.map((c) => ({ ...c, module: MODULE_BY_KEY[c.module_key]?.title || c.module_key })),
      survey: { n: sv.length, nps, averages: Object.fromEntries(SURVEY.filter((x) => x.type === 'scale5').map((x) => [x.q, avgOf(x.key)])), applied: SURVEY.find((x) => x.key === 'applied').o.map((o) => ({ o, n: sv.filter((a) => a.applied === o).length })), texts: SURVEY.filter((x) => x.type === 'text').map((x) => ({ q: x.q, answers: sv.map((a) => a[x.key]).filter(Boolean) })) },
      hardest, stats, agreement,
    });
  } catch (e) { next(e); }
});

// Classical item analysis on first attempts (scores of record): success rate (P), discrimination (correlation of the item
// with the rest of the check) and, for single-answer items, how often each option was picked. Needs about 20 answers
// per item before the numbers mean much; fewer are shown but marked.
function itemStats(rows) {
  const per = new Map();
  for (const a of rows) {
    const ans = (a.answers || []).filter((x) => x.id);
    const total = ans.reduce((t, x) => t + Number(x.score || 0), 0);
    for (const x of ans) {
      const it = per.get(x.id) || { id: x.id, s: [], rest: [], picks: {} };
      const sc = Number(x.score || 0); it.s.push(sc); it.rest.push(ans.length > 1 ? (total - sc) / (ans.length - 1) : 0);
      if (Number.isInteger(x.pick)) it.picks[x.pick] = (it.picks[x.pick] || 0) + 1;
      per.set(x.id, it);
    }
  }
  const corr = (a, b) => { const n = a.length; if (n < 3) return null; const ma = a.reduce((t, v) => t + v, 0) / n, mb = b.reduce((t, v) => t + v, 0) / n;
    let num = 0, da = 0, db = 0; for (let i = 0; i < n; i++) { num += (a[i] - ma) * (b[i] - mb); da += (a[i] - ma) ** 2; db += (b[i] - mb) ** 2; }
    return da && db ? num / Math.sqrt(da * db) : null; };
  return [...per.values()].map((it) => {
    const src = itemById(it.id); const n = it.s.length; const p = it.s.reduce((t, v) => t + v, 0) / n; const d = corr(it.s, it.rest);
    const verdict = n < 20 ? 'too few answers yet' : d != null && d < 0 ? 'check the key: strong trainees miss it more' : p < 0.3 ? 'too hard or unclear: review' : p > 0.95 ? 'too easy: everyone gets it' : d != null && d < 0.15 ? 'does not separate strong from weak: revise' : 'keep';
    const options = src?.t === 'mcq' ? src.o.map((o, i) => ({ o, key: i === src.a, n: it.picks[i] || 0 })) : null;
    const dead = options ? options.filter((o) => !o.key && o.n === 0).length : 0;
    return { id: it.id, module: src?.module, q: src?.q, t: src?.t, n, p: Math.round(p * 100), d: d == null ? null : Math.round(d * 100) / 100, verdict, options, deadDistractors: n >= 20 ? dead : null };
  }).sort((a, b) => (a.module || '').localeCompare(b.module || '') || a.id.localeCompare(b.id, undefined, { numeric: true }));
}

// How often the automatic review agrees with the KUDO Trainer on the same submission, per rubric line and on the overall rating.
function autoAgreement(rows) {
  const lines = RUBRIC.map((c) => ({ key: c.key, label: c.label, n: 0, exact: 0, within1: 0 }));
  let ratingN = 0, ratingSame = 0;
  const rate = (r) => { const k = ['accurate', 'complete', 'handover'].filter((x) => r?.[x]); if (!k.length) return null; const avg = k.reduce((t, x) => t + Number(r[x]), 0) / k.length; return avg >= 2.5 ? 'solid' : avg >= 1.75 ? 'developing' : 'gap'; };
  for (const r of rows) {
    const a = r.auto?.rubric, h = r.rubric; if (!a || !h) continue;
    for (const l of lines) { if (a[l.key] == null || h[l.key] == null) continue; l.n++; const diff = Math.abs(Number(a[l.key]) - Number(h[l.key])); if (!diff) l.exact++; if (diff <= 1) l.within1++; }
    const ra = r.auto?.rating, rh = rate(h); if (ra && rh) { ratingN++; if (ra === rh) ratingSame++; }
  }
  return { n: rows.length, lines: lines.map((l) => ({ ...l, exactPct: l.n ? Math.round((l.exact / l.n) * 100) : null, within1Pct: l.n ? Math.round((l.within1 / l.n) * 100) : null })), rating: { n: ratingN, samePct: ratingN ? Math.round((ratingSame / ratingN) * 100) : null }, enough: rows.length >= 30 };
}

// ------------------------------------------------------------------ test trainees
adminProgramme.get('/demo', async (_req, res, next) => {
  try { res.json((await q('SELECT id,email,name,must_change_password,last_login_at,created_at FROM users WHERE is_demo ORDER BY name')).rows); } catch (e) { next(e); }
});
adminProgramme.post('/demo', async (req, res, next) => {
  try {
    const first = String(req.body?.name || '').trim().replace(/[^A-Za-z -]/g, '').slice(0, 30);
    if (!first) return bad(res, 'Give the tester\'s first name.');
    const email = `demo.${first.toLowerCase().replace(/[^a-z]+/g, '.')}@kudo.ai`;
    if ((await q('SELECT 1 FROM users WHERE lower(email)=$1', [email])).rowCount) return bad(res, 'That test trainee already exists. Reset it instead.');
    const id = await createDemo(email, `Test Trainee (${first})`);
    if (!id) return bad(res, 'Could not create it: the generic password is not set on the server.');
    await audit(req, 'demo.create', email);
    res.json({ id, email });
  } catch (e) { next(e); }
});
adminProgramme.post('/demo/:id/reset', async (req, res, next) => {
  try {
    const id = await resetDemo(Number(req.params.id));
    if (!id) return res.status(404).json({ error: 'Not a test trainee.' });
    await audit(req, 'demo.reset', String(id));
    res.json({ id });
  } catch (e) { next(e); }
});

export { getSettings, MODULE_FOR_SCENARIO };
