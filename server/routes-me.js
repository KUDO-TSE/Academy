import { Router } from 'express';
import { q } from './db.js';
import { SCENARIOS } from './scenarios.js';

export const meRouter = Router();

// Everything here is scoped to the signed-in user (req.user.id). No route takes a user id from the request.
async function myData(uid) {
  const [user, rounds, scores, qs, missed, plan, targets, notes] = await Promise.all([
    q('SELECT id,name,email,region,team,role,profile,last_login_at FROM users WHERE id=$1', [uid]),
    q('SELECT id,key,label,kind,taken_on,sort FROM rounds ORDER BY sort,id'),
    q('SELECT round_id,scenario,pct,correct,total FROM scores WHERE user_id=$1', [uid]),
    q(`SELECT qr.round_id, qr.qnum, qr.correct, qu.scenario, qu.level, qu.question, qu.answer
         FROM question_results qr JOIN questions qu ON qu.round_id=qr.round_id AND qu.qnum=qr.qnum
        WHERE qr.user_id=$1 ORDER BY qr.round_id, qr.qnum`, [uid]),
    q('SELECT 1'),
    q(`SELECT id,month,title,description,scenario,kind,delivery,due_date,link,status,completed_at
         FROM plan_items WHERE user_id=$1 ORDER BY month, due_date NULLS LAST, id`, [uid]),
    q('SELECT scenario,target_pct,due_date FROM targets WHERE user_id=$1', [uid]),
    q('SELECT id,body,created_at FROM notes WHERE user_id=$1 AND shared=TRUE ORDER BY created_at DESC', [uid]),
  ]);
  void missed;
  return {
    user: user.rows[0],
    scenarios: SCENARIOS.map(({ key, label, short }) => ({ key, label, short })),
    rounds: rounds.rows,
    scores: scores.rows.map((r) => ({ ...r, pct: Number(r.pct) })),
    questions: qs.rows,
    plan: plan.rows,
    targets: targets.rows.map((r) => ({ ...r, target_pct: Number(r.target_pct) })),
    notes: notes.rows,
  };
}

meRouter.get('/', async (req, res, next) => {
  try { res.json(await myData(req.user.id)); } catch (e) { next(e); }
});

meRouter.patch('/plan/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const status = req.body?.status;
    if (!Number.isInteger(id) || !['todo', 'in_progress', 'done'].includes(status)) return res.status(400).json({ error: 'Invalid request.' });
    const r = await q(
      `UPDATE plan_items SET status=$3, completed_at = CASE WHEN $3='done' THEN now() ELSE NULL END
        WHERE id=$1 AND user_id=$2 RETURNING id,status,completed_at`, [id, req.user.id, status]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});
