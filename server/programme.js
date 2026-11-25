import { Router } from 'express';
import { q, audit } from './db.js';
import { SCENARIOS, SCENARIO_KEYS } from './scenarios.js';
import { MODULES, MODULE_BY_KEY, MODULE_FOR_SCENARIO, DEPTH, SOURCE_DECISIONS, ACADEMY_FOLDER } from './curriculum.js';
import { POOLS, draw, drawMixed, publicItem, grade, walk, walkthroughIntro, itemById } from './assess.js';
import { EXPLAIN, RUBRIC, SURVEY, WALKTHROUGHS } from './curriculum-extra.js';
import { loadContext, refreshPlan, refreshAll, approvePlan, diffPlans, liveState, buildPlan, getSettings, PASS, PHASES } from './engine.js';

const bad = (res, msg) => res.status(400).json({ error: msg });
const SELF_TICK = ['lesson', 'practice', 'missed', 'teach'];
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

meProgramme.get('/modules/:key', async (req, res, next) => {
  try {
    const key = req.params.key, uid = req.user.id;
    if (key === 'baseline') return res.json({ key, title: 'Baseline check', summary: 'One question per scenario. It replaces estimates with real answers so your plan is aimed at the right gaps.', check: BASELINE.map(publicItem), attempts: (await q("SELECT correct::float AS correct,total,created_at FROM quiz_attempts WHERE user_id=$1 AND module_key='baseline' ORDER BY created_at DESC", [uid])).rows });
    const m = MODULE_BY_KEY[key]; if (!m) return res.status(404).json({ error: 'Not found.' });
    const { quiz, ...rest } = m; void quiz;
    const [at, prog, fb, subs] = await Promise.all([
      q("SELECT correct::float AS correct,total,knowledge::float AS knowledge,kind,item_key,created_at FROM quiz_attempts WHERE user_id=$1 AND module_key=$2 ORDER BY created_at DESC", [uid, key]),
      q('SELECT item_key,note,completed_at,signed_off_at FROM plan_progress WHERE user_id=$1 AND item_key LIKE $2', [uid, `${key}.%`]),
      q('SELECT 1 FROM module_feedback WHERE user_id=$1 AND module_key=$2', [uid, key]),
      q('SELECT id,status,rubric,review_comment,text_answer,audio_seconds,(audio IS NOT NULL) AS has_audio,self_points,created_at,reviewed_at FROM submissions WHERE user_id=$1 AND module_key=$2 ORDER BY created_at DESC', [uid, key]),
    ]);
    res.json({
      ...rest, check: draw(key).map(publicItem), poolSize: POOLS[key].length, pass: PASS,
      attempts: at.rows.filter((a) => a.kind === 'check'), walkAttempts: at.rows.filter((a) => a.kind === 'scenario'),
      progress: prog.rows, feedbackGiven: fb.rowCount > 0,
      walkthrough: walkthroughIntro(key), explain: EXPLAIN[key] ? { prompt: EXPLAIN[key].prompt, points: subs.rowCount ? EXPLAIN[key].points : null } : null, submissions: subs.rows, rubric: RUBRIC,
      scenarioLabel: SCENARIOS.find((s) => s.key === m.scenario)?.label || null, related: (m.related || []).map((s) => SCENARIOS.find((x) => x.key === s)?.short || s),
    });
  } catch (e) { next(e); }
});

function validAnswers(body, allowed) {
  const ans = body?.answers;
  if (!Array.isArray(ans) || ans.length < 1 || ans.length > 15) return null;
  const ids = new Set();
  for (const a of ans) { if (typeof a?.id !== 'string' || ids.has(a.id) || !itemById(a.id) || !allowed(itemById(a.id))) return null; ids.add(a.id); }
  return ans;
}
const compact = (g) => JSON.stringify(g.results.map((r) => ({ id: r.id, score: r.score, knowledge: r.knowledge, conf: r.conf ?? null, scenario: r.scenario || null })));

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
    await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,knowledge,cbm,kind,answers) VALUES ($1,$2,$3,$4,$5,$6,$7,'check',$8)", [req.user.id, key, itemKey, g.correct, g.total, g.knowledge, g.cbm, compact(g)]);
    await audit(req, 'check.attempt', key, `${g.correct}/${g.total}`);
    const status = await refreshPlan(req.user.id);
    res.json({ ...g, passed: key === 'baseline' || g.correct / g.total >= PASS, planChanged: status === 'draft' });
  } catch (e) { next(e); }
});

meProgramme.post('/modules/:key/walk', async (req, res, next) => {
  try {
    const key = req.params.key;
    const r = walk(key, req.body?.path);
    if (r.error) return bad(res, r.error);
    if (r.end) {
      await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,kind,answers) VALUES ($1,$2,$3,$4,$5,'scenario',$6)", [req.user.id, key, `${key}.scenario`, r.score, r.max, JSON.stringify(req.body.path)]);
      await audit(req, 'walkthrough', key, `${r.score}/${r.max}`);
    }
    res.json(r);
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
    const key = req.params.key; if (!EXPLAIN[key]) return res.status(404).json({ error: 'Not found.' });
    const b = req.body || {};
    const text = b.text ? String(b.text).slice(0, 8000) : null;
    let audio = null, mime = null;
    if (b.audio) {
      if (typeof b.audio !== 'string' || !AUDIO_MIME.test(String(b.mime || ''))) return bad(res, 'That recording format is not supported.');
      audio = Buffer.from(b.audio, 'base64'); mime = String(b.mime).split(';')[0];
      if (audio.length > 6 * 1024 * 1024) return bad(res, 'The recording is too long. Keep it under 3 minutes.');
    }
    if (!audio && (!text || text.trim().length < 40)) return bad(res, 'Record your explanation, or write at least a few sentences.');
    const secs = Number.isFinite(Number(b.seconds)) ? Math.min(600, Math.round(Number(b.seconds))) : null;
    const r = await q('INSERT INTO submissions (user_id,module_key,text_answer,audio,audio_mime,audio_seconds) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [req.user.id, key, text, audio, mime, secs]);
    await audit(req, 'explain.submit', key, audio ? 'audio' : 'text');
    res.json({ id: r.rows[0].id, points: EXPLAIN[key].points });
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
  let streak = 0; let cursor = weeks[0] === thisWeek ? thisWeek : thisWeek - 7 * 864e5;
  for (const w of weeks) { if (w === cursor) { streak++; cursor -= 7 * 864e5; } else if (w < cursor) break; }
  return { doneThisWeek: weeks[0] === thisWeek, streak, total: r.rowCount };
}
meProgramme.get('/challenge', async (req, res, next) => {
  try {
    const uid = req.user.id;
    const touched = await q("SELECT DISTINCT split_part(item_key,'.',1) AS k FROM plan_progress WHERE user_id=$1 UNION SELECT DISTINCT module_key FROM quiz_attempts WHERE user_id=$1 AND kind IN ('check','scenario')", [uid]);
    let keys = touched.rows.map((r) => r.k).filter((k) => POOLS[k]);
    if (keys.length < 2) keys = ['foundations', 'platform', 'ai', 'teams'];
    res.json({ ...(await challengeState(uid)), items: drawMixed(keys, 4).map(publicItem) });
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

adminProgramme.get('/curriculum', (_req, res) => res.json({ modules: MODULES.map((m) => ({ ...m, pool: POOLS[m.key], walkthroughFull: WALKTHROUGHS[m.key] || null, explainFull: EXPLAIN[m.key] || null })), rubric: RUBRIC, decisions: SOURCE_DECISIONS, depth: DEPTH, folder: ACADEMY_FOLDER, baseline: BASELINE.length }));

adminProgramme.get('/trainees/:id/programme', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    await refreshPlan(id);
    const ctx = await loadContext(id);
    const u = ctx.users.find((x) => x.id === id); if (!u) return res.status(404).json({ error: 'Not found.' });
    const { draft, approved } = await plansOf(id);
    const inputs = (await q(`SELECT i.id,i.kind,i.happened_on,i.title,i.link,i.body,i.signals,i.item_key,i.shared_summary,a.name AS author FROM inputs i LEFT JOIN users a ON a.id=i.author_id WHERE i.user_id=$1 ORDER BY i.happened_on DESC, i.id DESC`, [id])).rows;
    const attempts = (ctx.attempts.get(id) || []).map(({ module_key, item_key, correct, total, created_at }) => ({ module_key, item_key, correct, total, created_at })).reverse();
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
    await q('UPDATE users SET plan_overrides=$2 WHERE id=$1', [id, { focus, skip, message }]);
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
    const r = await q(`SELECT s.id,s.user_id,u.name,s.module_key,s.text_answer,s.audio_seconds,(s.audio IS NOT NULL) AS has_audio,s.self_points,s.status,s.rubric,s.review_comment,s.created_at,s.reviewed_at
                         FROM submissions s JOIN users u ON u.id=s.user_id ORDER BY (s.status='submitted') DESC, s.created_at DESC LIMIT 100`);
    res.json({ rubric: RUBRIC, items: r.rows.map((x) => ({ ...x, module: MODULE_BY_KEY[x.module_key]?.title || x.module_key, prompt: EXPLAIN[x.module_key]?.prompt, points: EXPLAIN[x.module_key]?.points || [] })) });
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
    const r = await q("UPDATE submissions SET status='reviewed', rubric=$2, review_comment=$3, reviewer_id=$4, reviewed_at=now() WHERE id=$1 RETURNING user_id,module_key", [id, scores, comment, req.user.id]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    const { user_id: uid, module_key: mk } = r.rows[0];
    const avg = Object.values(scores).reduce((a, b) => a + b, 0) / RUBRIC.length;
    const rating = avg >= 2.5 ? 'solid' : avg >= 1.75 ? 'developing' : 'gap';
    const scenario = MODULE_BY_KEY[mk]?.scenario || MODULE_BY_KEY[mk]?.related?.[0] || null;
    await q(`INSERT INTO inputs (user_id,author_id,kind,title,signals,shared_summary) VALUES ($1,$2,'recording',$3,$4,$5)`,
      [uid, req.user.id, `Explain-it review: ${MODULE_BY_KEY[mk]?.title || mk}`, JSON.stringify(scenario ? [{ scenario, rating }] : []), comment]);
    await audit(req, 'explain.review', String(id), `${avg.toFixed(2)} ${rating}`);
    const status = await refreshPlan(uid);
    res.json({ ok: true, rating, planChanged: status === 'draft' });
  } catch (e) { next(e); }
});

adminProgramme.get('/feedback', async (_req, res, next) => {
  try {
    const [mods, comments, surveys, attempts] = await Promise.all([
      q('SELECT module_key, count(*)::int n, avg(clear)::float clear, avg(relevant)::float relevant, avg(confidence)::float confidence FROM module_feedback GROUP BY module_key'),
      q('SELECT module_key, comment, created_at FROM module_feedback WHERE comment IS NOT NULL AND comment <> \'\' ORDER BY created_at DESC LIMIT 200'),
      q('SELECT answers, created_at FROM survey_responses ORDER BY created_at DESC'),
      q("SELECT module_key, answers FROM quiz_attempts WHERE kind='check' AND module_key <> 'baseline'"),
    ]);
    // Item analysis: which questions are missed most, and which are answered wrongly with high certainty (a sign of a misconception).
    const items = new Map();
    for (const a of attempts.rows) for (const x of a.answers || []) {
      if (!x.id) continue;
      const it = items.get(x.id) || { id: x.id, n: 0, score: 0, confWrong: 0 };
      it.n++; it.score += Number(x.score ?? (x.ok ? 1 : 0)); if (x.conf === 3 && Number(x.score) === 0) it.confWrong++;
      items.set(x.id, it);
    }
    const hardest = [...items.values()].filter((x) => x.n >= 2).map((x) => ({ ...x, rate: Math.round((x.score / x.n) * 100), q: itemById(x.id)?.q, module: itemById(x.id)?.module })).sort((a, b) => a.rate - b.rate).slice(0, 15);
    const sv = surveys.rows.map((r) => r.answers);
    const nps = sv.length ? Math.round(((sv.filter((a) => a.nps >= 9).length - sv.filter((a) => a.nps <= 6).length) / sv.length) * 100) : null;
    const avgOf = (k) => (sv.length ? sv.reduce((t, a) => t + (a[k] || 0), 0) / sv.length : null);
    res.json({
      modules: MODULES.map((m) => ({ key: m.key, title: m.title, ...(mods.rows.find((r) => r.module_key === m.key) || { n: 0 }) })),
      comments: comments.rows.map((c) => ({ ...c, module: MODULE_BY_KEY[c.module_key]?.title || c.module_key })),
      survey: { n: sv.length, nps, averages: Object.fromEntries(SURVEY.filter((x) => x.type === 'scale5').map((x) => [x.q, avgOf(x.key)])), applied: SURVEY.find((x) => x.key === 'applied').o.map((o) => ({ o, n: sv.filter((a) => a.applied === o).length })), texts: SURVEY.filter((x) => x.type === 'text').map((x) => ({ q: x.q, answers: sv.map((a) => a[x.key]).filter(Boolean) })) },
      hardest,
    });
  } catch (e) { next(e); }
});

export { getSettings, MODULE_FOR_SCENARIO };
