// My Activities: everything done on an account, for the trainee and for the Academy team.
// Connections are kept as visits: a visit starts with the first request after 30 minutes without any, and its
// last-seen time moves forward (at most once a minute) while the person keeps using the Academy. Nothing else is
// stored: no IP address, only whether it was a phone, a tablet or a computer. An admin taking the courses as a
// test trainee is not counted as that trainee's activity.
import { Router } from 'express';
import { q } from './db.js';
import { MODULE_BY_KEY } from './curriculum.js';
import { SANDBOX } from './sandboxes.js';
import { CATALOG } from './collectibles.js';

const GAP_MIN = 30;
const lastWrite = new Map(); // user id -> ms of the last visit write in this process

const deviceOf = (ua = '') => (/iPad|Tablet/i.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/i.test(ua) ? 'Phone' : 'Computer');

/** Express middleware: keep the current visit of a signed-in user up to date. Never blocks or fails the request. */
export function trackVisit(req, _res, next) {
  const u = req.user;
  if (!u || req.realAdmin || u.must_change_password || !req.path.startsWith('/api/')) return next();
  const now = Date.now(), last = lastWrite.get(u.id) || 0;
  if (now - last < 60e3) return next();
  lastWrite.set(u.id, now);
  (async () => {
    const r = await q(`UPDATE user_visits SET last_seen_at=now(), requests=requests+1 WHERE id=(SELECT id FROM user_visits WHERE user_id=$1 AND last_seen_at > now() - ($2 || ' minutes')::interval ORDER BY id DESC LIMIT 1) RETURNING id`, [u.id, String(GAP_MIN)]);
    if (!r.rowCount) await q('INSERT INTO user_visits (user_id,device) VALUES ($1,$2)', [u.id, deviceOf(req.get('user-agent'))]);
  })().catch((e) => console.error('Visit tracking:', e.message));
  next();
}

const pct = (c, t) => (t ? Math.round((Number(c) / Number(t)) * 100) : null);
const modTitle = (k) => (k === 'baseline' ? 'Baseline check' : MODULE_BY_KEY[k]?.title || k);
const SBX_TITLE = { 'platform-1': 'Run a meeting, add a language live, find the recording', 'platform-2': 'Send the right link to each person', 'hi-1': 'Set up a Human Interpretation meeting', 'rtmp-1': 'Stream a meeting to YouTube (RTMP)', 'hls-1': 'Broadcast to the client\'s web page (HLS)', 'widget-1': 'Put the KUDO widget on an event page', 'ringcentral-1': 'Give the RingCentral producer the Widget ID', 'zoom-1': 'KUDO AI translation in Zoom', 'teams-1': 'Add KUDO to a Teams meeting', 'meet-1': 'KUDO AI translation in Google Meet', 'webex-1': 'KUDO AI translation in Webex' };
const STEP_KIND = { lesson: 'Learn', practice: 'Practise', scenario: 'Decide', explain: 'Explain it', check: 'Prove it', review: 'Spaced review', baseline: 'Baseline check', missed: 'Missed questions', teach: 'Teach-back', pair: 'Pairing', one_to_one: 'With the KUDO Trainer', survey: 'Survey', milestone: 'Milestone' };

/** The whole log of one account: visits, totals and every activity, newest first. */
export async function activityFor(uid) {
  const [visits, steps, attempts, subs, runs, cards, plan] = await Promise.all([
    q('SELECT started_at,last_seen_at,device,requests FROM user_visits WHERE user_id=$1 ORDER BY started_at DESC LIMIT 400', [uid]),
    q('SELECT item_key,completed_at,signed_off_at FROM plan_progress WHERE user_id=$1', [uid]),
    q('SELECT module_key,item_key,kind,correct::float AS correct,total,counts,created_at FROM quiz_attempts WHERE user_id=$1', [uid]),
    q("SELECT module_key,kind,status,counts,rubric,created_at,reviewed_at FROM submissions WHERE user_id=$1 AND status<>'processing'", [uid]),
    q('SELECT scenario,score,record,seconds,created_at FROM sandbox_runs WHERE user_id=$1', [uid]),
    q("SELECT key,earned_at FROM collectibles WHERE user_id=$1 AND key NOT LIKE 'rules%'", [uid]),
    q("SELECT data FROM plans WHERE user_id=$1 AND status='approved' ORDER BY version DESC LIMIT 1", [uid]),
  ]);
  const items = new Map((plan.rows[0]?.data?.items || []).map((i) => [i.key, i]));
  const ev = [];
  for (const v of visits.rows) ev.push({ at: v.started_at, type: 'visit', title: 'Signed in', detail: `${v.device || 'Computer'}, ${Math.max(1, Math.round((new Date(v.last_seen_at) - new Date(v.started_at)) / 60e3))} min` });
  for (const s of steps.rows) {
    const it = items.get(s.item_key); if (!it) continue;
    // Tests, walkthroughs and recordings have their own line with the score; the step line is for the rest.
    if (['check', 'scenario', 'explain', 'review'].includes(it.kind)) continue;
    ev.push({ at: s.completed_at, type: 'step', title: it.title.replace(/^(Learn|Practise|Decide|Explain it|Check|Quick check):\s*/, ''), detail: `${STEP_KIND[it.kind] || 'Step'} done${s.signed_off_at ? ', signed off' : ''}`, module: it.module || null });
  }
  for (const a of attempts.rows) {
    const p = pct(a.correct, a.total), review = (a.item_key || '').startsWith('review.');
    if (a.kind === 'challenge') ev.push({ at: a.created_at, type: 'challenge', title: 'Weekly challenge', detail: `${Number(a.correct)} of ${a.total} right`, score: p });
    else if (a.kind === 'spaced') ev.push({ at: a.created_at, type: 'test', title: 'Spaced practice', detail: 'Practice, not scored', score: p });
    else if (a.kind === 'scenario') ev.push({ at: a.created_at, type: 'test', title: modTitle(a.module_key), detail: `Decision walkthrough${a.counts === false ? ', practice' : ''}`, score: p, record: a.counts !== false, module: a.module_key });
    else ev.push({ at: a.created_at, type: 'test', title: modTitle(a.module_key), detail: review ? 'Spaced review' : a.module_key === 'baseline' ? 'Baseline check' : a.counts === false ? 'Course test, retake (practice)' : 'Course test, result of record', score: p, record: a.counts !== false && !review, module: a.module_key });
  }
  for (const s of subs.rows) {
    const r = s.rubric, sc = r ? Math.round((((r.accurate || 0) + (r.complete || 0) + (r.handover || 0)) / 9) * 100) : null;
    ev.push({ at: s.created_at, type: 'recording', title: modTitle(s.module_key), detail: `${s.kind === 'practice' ? 'Practice task' : 'Explain it'}${s.status === 'reviewed' ? ', reviewed by the KUDO Trainer' : s.status === 'auto' ? ', automatic review' : ', waiting for review'}`, score: sc, module: s.module_key });
  }
  for (const r of runs.rows) ev.push({ at: r.created_at, type: 'sandbox', title: SBX_TITLE[r.scenario] || r.scenario, detail: `Sandbox exercise${r.record ? ', first run' : ', practice run'}${r.seconds ? `, ${Math.max(1, Math.round(r.seconds / 60))} min` : ''}`, score: r.score, module: SANDBOX[r.scenario] || null });
  const cat = new Map(CATALOG.map((c) => [c.key, c]));
  for (const c of cards.rows) { const k = cat.get(c.key); if (k) ev.push({ at: c.earned_at, type: 'card', title: k.title, detail: `Card earned, ${k.set}` }); }
  ev.sort((a, b) => new Date(b.at) - new Date(a.at));

  const mins = (v) => Math.max(1, Math.round((new Date(v.last_seen_at) - new Date(v.started_at)) / 60e3));
  const totalMin = visits.rows.reduce((t, v) => t + mins(v), 0);
  const days = new Set(visits.rows.map((v) => new Date(v.started_at).toISOString().slice(0, 10)));
  // Time per week over the last twelve weeks, oldest first.
  const weekStart = (d) => { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x.getTime(); };
  const thisWeek = weekStart(Date.now());
  const weeks = Array.from({ length: 12 }, (_, i) => ({ start: new Date(thisWeek - (11 - i) * 7 * 864e5).toISOString().slice(0, 10), minutes: 0, visits: 0 }));
  for (const v of visits.rows) { const k = Math.round((thisWeek - weekStart(v.started_at)) / (7 * 864e5)); if (k >= 0 && k < 12) { weeks[11 - k].minutes += mins(v); weeks[11 - k].visits += 1; } }
  return {
    totals: { visits: visits.rows.length, minutes: totalMin, days: days.size, activities: ev.filter((e) => e.type !== 'visit').length, last: visits.rows[0]?.last_seen_at || null, first: visits.rows.at(-1)?.started_at || null, thisWeek: weeks[11].minutes },
    weeks,
    visits: visits.rows.slice(0, 60).map((v) => ({ start: v.started_at, end: v.last_seen_at, minutes: mins(v), device: v.device })),
    events: ev.slice(0, 500),
  };
}

export const meActivity = Router();
meActivity.get('/activity', async (req, res, next) => { try { res.json(await activityFor(req.user.id)); } catch (e) { next(e); } });
export const adminActivity = Router();
adminActivity.get('/trainees/:id/activity', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!(await q('SELECT 1 FROM users WHERE id=$1', [id])).rowCount) return res.status(404).json({ error: 'Not found.' });
    res.json(await activityFor(id));
  } catch (e) { next(e); }
});
