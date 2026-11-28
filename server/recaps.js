// Module recaps: when every step of a module in the trainee's plan is done, KUDOG congratulates them with the score of
// each task and the module score. Scores are the system's own (first attempt, automatic review): nobody waits for the
// KUDO Trainer. Below the pass mark, or below where they started, KUDOG is supportive and says how to train on it.
import { Router } from 'express';
import { q } from './db.js';
import { programmeFor } from './programme.js';
import { MODULE_BY_KEY } from './curriculum.js';
import { SANDBOX } from './sandboxes.js';
import { PASS, explainScore } from './engine.js';
import { POOLS } from './assess.js';

const STEP = ['lesson', 'practice', 'scenario', 'explain', 'check'];
const LABEL = { lesson: 'Lesson', practice: 'Practice task', scenario: 'Decide walkthrough', explain: 'Explain it to the client', check: 'Course test' };

/** The recap of one module for one trainee, or null when the module is not in their plan. */
export async function moduleRecap(uid, key, prog = null) {
  const m = MODULE_BY_KEY[key]; if (!m) return null;
  prog ||= await programmeFor(uid);
  const items = (prog.state?.items || []).filter((i) => i.module === key && i.owner === 'you' && STEP.includes(i.kind));
  if (!items.length) return null;
  const [subs, runs, seen] = await Promise.all([
    q("SELECT kind,status,rubric,auto,counts FROM submissions WHERE user_id=$1 AND module_key=$2 ORDER BY created_at", [uid, key]),
    q('SELECT scenario,score,record FROM sandbox_runs WHERE user_id=$1 AND scenario = ANY($2) AND record', [uid, Object.keys(SANDBOX).filter((k) => SANDBOX[k] === key)]),
    q('SELECT shown_at FROM module_recaps WHERE user_id=$1 AND module_key=$2', [uid, key]),
  ]);
  const processing = subs.rows.some((s) => s.status === 'processing');
  const tasks = items.map((i) => ({ kind: i.kind, key: i.key, label: LABEL[i.kind], done: i.done, score: i.kind === 'lesson' ? null : i.recorded ?? null }));
  for (const r of runs.rows) tasks.push({ kind: 'sandbox', key: r.scenario, label: 'Sandbox exercise', sandbox: r.scenario, done: true, score: r.score });
  // A practice done in the sandbox has no written submission: its score is the sandbox run.
  const pr = tasks.find((t) => t.kind === 'practice'); if (pr && pr.score == null && runs.rowCount) pr.note = 'Done in the sandbox';
  const scored = tasks.filter((t) => t.score != null);
  const overall = scored.length ? Math.round(scored.reduce((a, t) => a + t.score, 0) / scored.length) : null;
  const complete = items.every((i) => i.done) && !processing;
  const level = (prog.state?.levels || []).find((l) => l.scenario === m.scenario) || null;
  const initial = level ? level.baseline : null;
  const below = overall != null && (overall < PASS * 100 || (initial != null && overall < initial));
  const firstAuto = (kind) => subs.rows.find((s) => (s.kind || 'explain') === kind && s.counts !== false && s.auto);
  const missed = ['explain', 'practice'].flatMap((k) => (firstAuto(k)?.auto?.missed || []).map((x) => x.point)).slice(0, 3);
  const review = (prog.state?.items || []).find((i) => i.key === `review.${key}` && !i.done) || null;
  const next = (prog.state?.next || []).find((i) => i.module !== key) || null;
  return {
    key, title: m.title, complete, shown: !!seen.rows[0]?.shown_at, tasks, overall, pass: Math.round(PASS * 100),
    initial, scenario: level ? level.label : null, verdict: overall == null ? 'done' : below ? 'support' : 'great',
    weak: scored.filter((t) => t.score < PASS * 100).map((t) => t.kind), missed, poolSize: POOLS[key]?.length || null,
    review: review ? { week: review.week, title: review.title } : null, next: next ? { title: next.title, module: next.module || null } : null,
    explainScored: subs.rows.some((s) => s.kind === 'explain' && explainScore(s.rubric) != null),
  };
}

export const recapRouter = Router();
/** The next completed module whose recap the trainee has not seen yet (one at a time). */
recapRouter.get('/recaps/pending', async (req, res, next) => {
  try {
    const prog = await programmeFor(req.user.id);
    const mods = [...new Set((prog.state?.items || []).filter((i) => i.module && STEP.includes(i.kind)).map((i) => i.module))];
    const shown = new Set((await q('SELECT module_key FROM module_recaps WHERE user_id=$1', [req.user.id])).rows.map((r) => r.module_key));
    for (const k of mods) {
      if (shown.has(k)) continue;
      const r = await moduleRecap(req.user.id, k, prog);
      if (r?.complete) return res.json({ recap: r });
    }
    res.json({ recap: null });
  } catch (e) { next(e); }
});
recapRouter.get('/modules/:key/recap', async (req, res, next) => {
  try { const r = await moduleRecap(req.user.id, req.params.key); return r ? res.json({ recap: r }) : res.status(404).json({ error: 'Not in your plan.' }); } catch (e) { next(e); }
});
recapRouter.post('/recaps/:key/seen', async (req, res, next) => {
  try {
    const r = await moduleRecap(req.user.id, req.params.key);
    if (!r?.complete) return res.status(409).json({ error: 'This module is not complete yet.' });
    await q('INSERT INTO module_recaps (user_id,module_key,overall,shown_at) VALUES ($1,$2,$3,now()) ON CONFLICT (user_id,module_key) DO UPDATE SET shown_at=now()', [req.user.id, req.params.key, r.overall]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});
