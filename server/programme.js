import { Router } from 'express';
import { q, audit } from './db.js';
import { SCENARIOS, SCENARIO_KEYS } from './scenarios.js';
import { MODULES, MODULE_BY_KEY, MODULE_FOR_SCENARIO, DEPTH, SOURCE_DECISIONS, ACADEMY_FOLDER } from './curriculum.js';
import { loadContext, refreshPlan, refreshAll, approvePlan, diffPlans, liveState, buildPlan, getSettings, PASS, PHASES } from './engine.js';

const bad = (res, msg) => res.status(400).json({ error: msg });
const SELF_TICK = ['lesson', 'practice', 'missed', 'teach'];
const moduleMeta = () => MODULES.map(({ key, title, scenario, track, depth, minutes, delivery, summary }) => ({ key, title, scenario, track, depth, minutes, delivery, summary }));

// Baseline check: the first question of every scenario module.
export const BASELINE = MODULES.filter((m) => m.scenario).map((m) => ({ ...m.quiz[0], module: m.key, scenario: m.scenario }));
const publicQuiz = (qs) => qs.map((x, i) => ({ i, q: x.q, o: x.o, scenario: x.scenario || null, scenarioShort: SCENARIOS.find((s) => s.key === x.scenario)?.short || null }));

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
    const key = req.params.key;
    if (key === 'baseline') return res.json({ key, title: 'Baseline check', summary: 'One question per scenario. It replaces estimates with real answers so your plan is aimed at the right gaps.', quiz: publicQuiz(BASELINE), attempts: (await q("SELECT correct,total,created_at FROM quiz_attempts WHERE user_id=$1 AND module_key='baseline' ORDER BY created_at DESC", [req.user.id])).rows });
    const m = MODULE_BY_KEY[key]; if (!m) return res.status(404).json({ error: 'Not found.' });
    const { quiz, ...rest } = m;
    const at = await q('SELECT correct,total,item_key,created_at FROM quiz_attempts WHERE user_id=$1 AND module_key=$2 ORDER BY created_at DESC', [req.user.id, key]);
    const prog = await q('SELECT item_key,note,completed_at,signed_off_at FROM plan_progress WHERE user_id=$1 AND item_key LIKE $2', [req.user.id, `${key}.%`]);
    res.json({ ...rest, quiz: publicQuiz(quiz), pass: PASS, attempts: at.rows, progress: prog.rows, scenarioLabel: SCENARIOS.find((s) => s.key === m.scenario)?.label || null, related: (m.related || []).map((s) => SCENARIOS.find((x) => x.key === s)?.short || s) });
  } catch (e) { next(e); }
});

meProgramme.post('/modules/:key/attempt', async (req, res, next) => {
  try {
    const key = req.params.key;
    const qs = key === 'baseline' ? BASELINE : MODULE_BY_KEY[key]?.quiz;
    if (!qs) return res.status(404).json({ error: 'Not found.' });
    const ans = req.body?.answers;
    if (!Array.isArray(ans) || ans.length !== qs.length || ans.some((a) => !Number.isInteger(a) || a < 0 || a > 5)) return bad(res, 'Answer every question first.');
    const itemKey = typeof req.body?.item_key === 'string' && /^[a-z0-9.]{1,40}$/.test(req.body.item_key) ? req.body.item_key : null;
    const results = qs.map((x, i) => ({ i, choice: ans[i], ok: ans[i] === x.a, a: x.a, why: x.why, scenario: x.scenario || MODULE_BY_KEY[key]?.scenario || null }));
    const correct = results.filter((r) => r.ok).length;
    await q('INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,answers) VALUES ($1,$2,$3,$4,$5,$6)', [req.user.id, key, itemKey, correct, qs.length, JSON.stringify(results.map(({ i, choice, ok, scenario }) => ({ i, choice, ok, scenario })))]);
    await audit(req, 'check.attempt', key, `${correct}/${qs.length}`);
    const status = await refreshPlan(req.user.id);
    res.json({ correct, total: qs.length, passed: key === 'baseline' || correct / qs.length >= PASS, results, planChanged: status === 'draft' });
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

adminProgramme.get('/curriculum', (_req, res) => res.json({ modules: MODULES, decisions: SOURCE_DECISIONS, depth: DEPTH, folder: ACADEMY_FOLDER, baseline: BASELINE.length }));

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

export { getSettings, MODULE_FOR_SCENARIO };
