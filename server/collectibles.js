// Collectibles: cards trainees earn at meaningful milestones of their programme.
// Design rules (from the gamification and motivation review):
//  - they reward mastery and real progress, not clicks: a scenario card needs the scenario at target, a craft card a
//    piece of work done well;
//  - they are never taken back (no loss aversion), there is no leaderboard and no comparison with colleagues;
//  - every locked card says exactly how to earn it (transparent rules);
//  - they never change a score or a level.
// Cards are worked out from existing data each time the trainee opens the app, then stored with the date earned.
import { Router } from 'express';
import { q } from './db.js';
import { SCENARIOS } from './scenarios.js';
import { loadContext, liveState, PHASES } from './engine.js';

const SC = Object.fromEntries(SCENARIOS.map((s) => [s.key, s]));

// tier: bronze (getting going), silver (real progress), gold (mastery)
export const CATALOG = [
  { key: 'start', set: 'Journey', tier: 'bronze', title: 'Starting line', earn: 'Your programme is approved and ready.', glyph: 'flag' },
  ...PHASES.map((p, i) => ({ key: `phase-${p.n}`, set: 'Journey', tier: i === 3 ? 'gold' : 'silver', title: `${p.name} cleared`, earn: `Finish every step of the ${p.name} phase that is yours to do.`, glyph: ['spark', 'build', 'broaden', 'trophy'][i] })),
  { key: 'client-ready', set: 'Journey', tier: 'gold', title: 'Client-ready', earn: 'Complete your mock client call with your KUDO Trainer.', glyph: 'handshake' },
  { key: 'graduate', set: 'Journey', tier: 'gold', title: 'Graduate', earn: 'Take the 3-month retest.', glyph: 'cap' },
  ...SCENARIOS.map((s) => ({ key: `sc-${s.key}`, set: 'Scenarios', tier: 'gold', title: s.short, earn: `Reach your target level on ${s.label}.`, glyph: `sc-${s.key}`, scenario: s.key })),
  { key: 'first-step', set: 'Craft', tier: 'bronze', title: 'First step', earn: 'Complete your first step: a lesson, a check or a practice.', glyph: 'step' },
  { key: 'best-calls', set: 'Craft', tier: 'silver', title: 'Best calls', earn: 'Make the best call at every step of a decision walkthrough.', glyph: 'compass' },
  { key: 'clear-voice', set: 'Craft', tier: 'silver', title: 'Clear voice', earn: 'Get a Solid result on a recorded or written explanation.', glyph: 'mic' },
  { key: 'self-aware', set: 'Craft', tier: 'silver', title: 'Knows what they know', earn: 'Score 80% or more on a check with your certainty well judged.', glyph: 'target' },
  { key: 'comeback', set: 'Craft', tier: 'silver', title: 'Comeback', earn: 'Answer every question right in a spaced review of questions you once missed.', glyph: 'loop' },
  { key: 'teacher', set: 'Craft', tier: 'silver', title: 'Teacher', earn: 'Complete a teach-back with a colleague.', glyph: 'people' },
  { key: 'curious', set: 'Craft', tier: 'gold', title: 'Curious mind', earn: 'Ask a question in a session that your KUDO Trainer adds to the Academy.', glyph: 'bulb' },
  { key: 'regular-3', set: 'Habit', tier: 'bronze', title: 'Regular', earn: 'Be active 3 weeks (weekly challenge). Weeks do not need to be in a row.', glyph: 'cal3' },
  { key: 'regular-6', set: 'Habit', tier: 'silver', title: 'Steady', earn: 'Be active 6 weeks. Weeks do not need to be in a row.', glyph: 'cal6' },
  { key: 'regular-10', set: 'Habit', tier: 'gold', title: 'Committed', earn: 'Be active 10 weeks. Weeks do not need to be in a row.', glyph: 'cal10' },
];
const BY_KEY = new Map(CATALOG.map((c) => [c.key, c]));

/** Which cards the trainee has earned now, from the data we hold. */
export async function earnedNow(uid) {
  const ctx = await loadContext(uid);
  const u = ctx.users.find((x) => x.id === uid); if (!u) return [];
  const plan = (await q("SELECT version,status,data,started_on FROM plans WHERE user_id=$1 AND status='approved' ORDER BY version DESC LIMIT 1", [uid])).rows[0];
  const got = new Set();
  const attempts = ctx.attempts.get(uid) || [];
  const progress = ctx.progress.get(uid) || [];
  const subs = ctx.subs?.get(uid) || [];
  if (plan) {
    got.add('start');
    const st = liveState(u, plan, ctx);
    for (const p of PHASES) { const mine = st.items.filter((i) => i.phase === p.n && (i.owner || 'you') === 'you'); if (mine.length && mine.every((i) => i.done)) got.add(`phase-${p.n}`); }
    if (st.items.some((i) => i.key === 'mock' && i.done)) got.add('client-ready');
    if (st.items.some((i) => i.key === 'retest' && i.done)) got.add('graduate');
    for (const l of st.levels) if (l.now >= l.target) got.add(`sc-${l.scenario}`);
    if (st.items.some((i) => i.kind === 'teach' && i.done)) got.add('teacher');
  }
  if (attempts.some((a) => ['check', 'scenario', 'baseline'].includes(a.kind || 'check')) || progress.length || subs.length) got.add('first-step');
  if (attempts.some((a) => a.kind === 'scenario' && Number(a.correct) >= Number(a.total) && Number(a.total) > 0)) got.add('best-calls');
  if (subs.some((s) => (s.status === 'reviewed' ? avgRubric(s.rubric) >= 2.5 : s.auto?.rating === 'solid'))) got.add('clear-voice');
  const cbm = (await q("SELECT 1 FROM quiz_attempts WHERE user_id=$1 AND kind='check' AND cbm >= 2 AND correct >= 0.8 * total LIMIT 1", [uid])).rowCount;
  if (cbm) got.add('self-aware');
  if ((await q("SELECT 1 FROM quiz_attempts WHERE user_id=$1 AND kind='spaced' AND correct >= total AND total > 0 LIMIT 1", [uid])).rowCount) got.add('comeback');
  if (progress.some((p) => String(p.item_key).startsWith('teach.'))) got.add('teacher');
  // Curious mind: a question this trainee asked in a session became a FAQ entry or a check question.
  const curious = await q(`SELECT 1 FROM field_notes n JOIN sessions s ON s.id = n.session_id
                            CROSS JOIN LATERAL jsonb_array_elements(s.findings) f
                           WHERE n.status='published' AND (f->>'id')::int = n.finding_id AND $1 = ANY(s.user_ids)
                             AND lower(f->>'asker') = lower($2) LIMIT 1`, [uid, u.name]);
  if (curious.rowCount) got.add('curious');
  const weeks = (await q("SELECT count(DISTINCT date_trunc('week', created_at))::int n FROM quiz_attempts WHERE user_id=$1 AND kind='challenge'", [uid])).rows[0].n;
  for (const n of [3, 6, 10]) if (weeks >= n) got.add(`regular-${n}`);
  return [...got].filter((k) => BY_KEY.has(k));
}
const avgRubric = (r) => { const v = ['accurate', 'complete', 'handover'].map((k) => Number(r?.[k])).filter((x) => x > 0); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };

/** Store newly earned cards (never removes any) and return the full collection. */
export async function syncCollection(uid) {
  const now = await earnedNow(uid);
  for (const k of now) await q('INSERT INTO collectibles (user_id,key) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid, k]);
  const rows = (await q('SELECT key,earned_at,seen_at FROM collectibles WHERE user_id=$1', [uid])).rows;
  const mine = new Map(rows.map((r) => [r.key, r]));
  return CATALOG.map((c) => ({ ...c, earned: mine.has(c.key), earned_at: mine.get(c.key)?.earned_at || null, isNew: mine.has(c.key) && !mine.get(c.key).seen_at }));
}

export const collectiblesRouter = Router();
collectiblesRouter.get('/collectibles', async (req, res, next) => {
  try {
    const cards = await syncCollection(req.user.id);
    res.json({ cards, earned: cards.filter((c) => c.earned).length, total: cards.length });
  } catch (e) { next(e); }
});
collectiblesRouter.post('/collectibles/seen', async (req, res, next) => {
  try { await q('UPDATE collectibles SET seen_at=now() WHERE user_id=$1 AND seen_at IS NULL', [req.user.id]); res.json({ ok: true }); } catch (e) { next(e); }
});
