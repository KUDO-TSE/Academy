// A test trainee halfway through the Quarter's Program (week 6 of 12), so the Academy team can see what a trainee
// looks like mid-way: courses done in Month 1 and early Month 2, course tests of record (one below the pass mark,
// then retaken), decision walkthroughs, explain-it recordings, practice signed off, sandbox runs, weekly challenges
// and the cards that follow from them. Fictional data on an is_demo account: never counted in team figures.
import { q } from './db.js';
import { createDemo } from './demo.js';
import { refreshPlan, approvePlan } from './engine.js';
import { MODULE_BY_KEY } from './curriculum.js';
import { EXPLAIN, PRACTICE, WALKTHROUGHS } from './curriculum-extra.js';
import { SANDBOX } from './sandboxes.js';

export const HALFWAY_EMAIL = 'demo.halfway@kudo.ai';
export const isHalfway = (email) => String(email || '').toLowerCase() === HALFWAY_EMAIL;

const DAY = 864e5;
const CURRENT_WEEK = 6; // weeks 1 to 5 done, week 6 started
// Course test results of record, in plan order: mostly passes, one below the pass mark (retaken as practice).
const TEST_PCT = [83, 100, 67, 83, 100, 83, 83, 100];
const WALK = [[8, 9], [7, 9], [9, 9], [6, 9]];
const RUBRICS = [{ accurate: 3, complete: 3, clear: 3, handover: 3 }, { accurate: 3, complete: 2, clear: 3, handover: 3 }, { accurate: 2, complete: 2, clear: 3, handover: 3 }];
const COURSE = new Set(['lesson', 'practice', 'scenario', 'explain', 'check']);

const points = (list, n) => (list || []).map((p, i) => ({ point: typeof p === 'string' ? p : p.point || String(p), covered: i < n, status: i < n ? 'covered' : 'missed' }));
const textFor = (title) => `With the client, I would start from what they need on the day, then explain how ${title} works for them, who does what, and when I would bring in Technical Support or Language Services.`;

export async function createHalfway(email = HALFWAY_EMAIL, name = 'Test Trainee (Halfway)') {
  const id = await createDemo(email, name);
  if (!id) return null;
  const now = Date.now();
  const start = new Date(now - ((CURRENT_WEEK - 1) * 7 + 2) * DAY); start.setHours(9, 0, 0, 0);
  const startDay = start.toISOString().slice(0, 10);
  await q('UPDATE plans SET started_on=$2 WHERE user_id=$1', [id, startDay]);
  await q('UPDATE users SET tour_seen_at=now() WHERE id=$1', [id]);

  // Tests only move a level after the knowledge test the plan starts from: keep each test after that date.
  const since = (await q("SELECT max(r.taken_on) AS d FROM rounds r JOIN scores s ON s.round_id=r.id WHERE s.user_id=$1 AND r.kind='live'", [id])).rows[0]?.d;
  const floor = since ? new Date(since).getTime() + 1.5 * DAY : 0;
  const cycle = (await q("SELECT COALESCE(max(id),0)::int AS c FROM rounds WHERE kind='live'")).rows[0].c;

  const plan = (await q("SELECT data FROM plans WHERE user_id=$1 AND status='approved' ORDER BY version DESC LIMIT 1", [id])).rows[0]?.data;
  const items = plan?.items || [];
  const dayIn = (w, k) => new Date(start.getTime() + ((w - 1) * 7 + Math.min(4, k)) * DAY + (10 + (k % 3) * 2) * 3600e3);

  // What is done: everything up to week 5, and the first step of the first course of week 6.
  const firstOfSix = items.find((i) => i.week === CURRENT_WEEK && i.module && COURSE.has(i.kind) && (i.owner || 'you') === 'you');
  const done = items.filter((i) => i.week && i.week < CURRENT_WEEK).concat(firstOfSix ? [firstOfSix] : []);
  const perWeek = {};
  const natural = new Map(done.map((it) => { const k = (perWeek[it.week] = (perWeek[it.week] || 0) + 1) - 1; return [it.key, dayIn(it.week, k)]; }));
  // Test dates: as planned when the knowledge test came before the plan; otherwise spread, in the same order,
  // between the day after the test and yesterday.
  const tests = done.filter((i) => ['check', 'scenario', 'explain'].includes(i.kind) && !String(i.key).startsWith('review.')).map((i) => natural.get(i.key).getTime());
  const t0 = Math.min(...tests), t1 = Math.max(...tests), lo = Math.max(floor, t0), hi = Math.min(now - DAY, Math.max(t1, lo + DAY));
  let tn = 0;
  const daytime = (ms) => { const d = new Date(ms), hr = d.getUTCHours(); if (hr < 8 || hr > 17) { d.setUTCHours(9 + (tn % 8), (tn * 17) % 60, 0, 0); } tn++; return Math.min(d.getTime(), now - 3600e3); };
  const testAt = (t) => new Date(daytime(t0 >= floor || t1 === t0 ? Math.min(t, now - 3600e3) : lo + ((t - t0) / (t1 - t0)) * (hi - lo)));
  let ti = 0, wi = 0, ri = 0;
  const finished = new Map(); // module -> test pct, for the course recaps
  for (const it of done) {
    const at = natural.get(it.key);
    const mk = it.module, m = MODULE_BY_KEY[mk];
    if (it.kind === 'check' && m && !String(it.key).startsWith('review.')) {
      const pct = TEST_PCT[ti++ % TEST_PCT.length], total = 6, correct = Math.round((pct / 100) * total);
      const knowledge = correct === total ? correct : correct - 0.5 * (ti % 2);
      const when = testAt(at.getTime());
      await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,knowledge,cbm,kind,answers,counts,cycle,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,'check','[]',TRUE,$8,$9)", [id, mk, it.key, correct, total, knowledge, correct * 2 - (total - correct) * 2, cycle, when]);
      if (correct / total < 0.8) await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,knowledge,cbm,kind,answers,counts,cycle,created_at) VALUES ($1,$2,$3,6,6,6,12,'check','[]',FALSE,$4,$5)", [id, mk, it.key, cycle, new Date(when.getTime() + DAY / 2 > now ? now - 1800e3 : when.getTime() + DAY / 2)]);
      finished.set(mk, pct);
    } else if (it.kind === 'scenario' && WALKTHROUGHS[mk]) {
      const [c, t] = WALK[wi++ % WALK.length];
      await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,kind,answers,counts,cycle,created_at) VALUES ($1,$2,$3,$4,$5,'scenario','[]',TRUE,$6,$7)", [id, mk, it.key, c, t, cycle, testAt(at.getTime())]);
    } else if (it.kind === 'explain' && EXPLAIN[mk]) {
      const rubric = RUBRICS[ri++ % RUBRICS.length], pts = EXPLAIN[mk].points || [], cov = rubric.complete === 3 ? pts.length : Math.max(1, pts.length - 1);
      const auto = { rubric, feedbackOnly: ['clear'], rating: 'solid', points: points(pts, cov), missed: [], flags: [], note: `You covered ${cov} of ${pts.length} key points.` };
      const reviewed = ri === 1; // the first one was also reviewed by the KUDO Trainer
      await q("INSERT INTO submissions (user_id,module_key,text_answer,status,kind,counts,cycle,rubric,auto,review_comment,reviewed_at,created_at) VALUES ($1,$2,$3,$4,'explain',TRUE,$5,$6,$7,$8,$9,$9)",
        [id, mk, textFor(m?.title || mk), reviewed ? 'reviewed' : 'auto', cycle, rubric, auto, reviewed ? 'Clear and complete, and you said when to hand over. Well done.' : auto.note, testAt(at.getTime())]);
    } else if (it.kind === 'practice' && PRACTICE[mk]) {
      const pts = PRACTICE[mk].points || [];
      const auto = { rubric: { accurate: 3, complete: 3, clear: 3, handover: 3 }, feedbackOnly: ['clear'], rating: 'solid', points: points(pts, pts.length), missed: [], flags: [], note: `You covered ${pts.length} of ${pts.length} key points.` };
      await q("INSERT INTO submissions (user_id,module_key,text_answer,status,kind,counts,cycle,rubric,auto,review_comment,reviewed_at,created_at) VALUES ($1,$2,$3,'auto','practice',TRUE,$4,$5,$6,$7,$8,$8)", [id, mk, textFor(m?.title || mk), cycle, auto.rubric, auto, auto.note, at]);
      // The sandbox exercises of this course, done during the practice step.
      const keys = Object.entries(SANDBOX).filter(([, v]) => v === mk).map(([k]) => k);
      for (const [n, key] of keys.entries()) {
        const score = [90, 100, 80][n % 3];
        await q('INSERT INTO sandbox_runs (user_id,scenario,score,result,record,seconds,created_at) VALUES ($1,$2,$3,$4,TRUE,$5,$6)', [id, key, score, { score, hints: score === 100 ? 0 : 1, traps: [], expert: 180 }, score === 100 ? 170 : 260, at]);
      }
    }
    await q("INSERT INTO plan_progress (user_id,item_key,status,note,signed_off_at,completed_at) VALUES ($1,$2,'done',$3,$4,$5) ON CONFLICT (user_id,item_key) DO NOTHING",
      [id, it.key, it.kind === 'practice' ? 'Reviewed automatically: solid' : null, it.kind === 'practice' ? at : null, at]);
  }
  // The weekly challenge, once in each finished week.
  for (let w = 1; w < CURRENT_WEEK; w++) await q("INSERT INTO quiz_attempts (user_id,module_key,correct,total,knowledge,cbm,kind,answers,created_at) VALUES ($1,'challenge',$2,4,$2,$3,'challenge','[]',$4)", [id, w % 3 ? 4 : 3, w % 3 ? 8 : 4, dayIn(w, 3)]);
  // Course recaps already shown for the courses that are complete.
  const doneKeys = new Set(done.map((i) => i.key));
  for (const [mk, pct] of finished) {
    const mine = items.filter((i) => i.module === mk && COURSE.has(i.kind));
    if (mine.every((i) => doneKeys.has(i.key))) await q('INSERT INTO module_recaps (user_id,module_key,overall,shown_at) VALUES ($1,$2,$3,now()) ON CONFLICT DO NOTHING', [id, mk, pct]);
  }
  await refreshPlan(id); await approvePlan(id, null);
  // The approved plan may have moved a step (a spaced review, say) into the first five weeks: those are done too.
  const fin = (await q("SELECT data FROM plans WHERE user_id=$1 AND status='approved' ORDER BY version DESC LIMIT 1", [id])).rows[0]?.data?.items || [];
  for (const it of fin.filter((i) => i.week && i.week < CURRENT_WEEK)) {
    const at = new Date(Math.min(now - 3600e3, Math.max(dayIn(it.week, 4).getTime(), floor)));
    // A spaced review is complete once it is taken: retrieved from memory, 5 of 6.
    if (it.kind === 'review' && !(await q('SELECT 1 FROM quiz_attempts WHERE user_id=$1 AND item_key=$2', [id, it.key])).rowCount) await q("INSERT INTO quiz_attempts (user_id,module_key,item_key,correct,total,knowledge,cbm,kind,answers,counts,cycle,created_at) VALUES ($1,$2,$3,5,6,5,8,'check','[]',TRUE,$4,$5)", [id, it.module, it.key, cycle, at]);
    await q("INSERT INTO plan_progress (user_id,item_key,status,completed_at) VALUES ($1,$2,'done',$3) ON CONFLICT (user_id,item_key) DO NOTHING", [id, it.key, at]);
  }
  // Cards follow from the work above; they are shown as already seen, dated across the weeks.
  try {
    const { syncCollection } = await import('./collectibles.js');
    await syncCollection(id);
    // Each card is dated from the work that earned it: First step at the start, Off the blocks at the first lesson,
    // Month 1 cleared at its last step, the others spread over the activity in order.
    const evs = (await q(`SELECT t FROM (SELECT completed_at AS t FROM plan_progress WHERE user_id=$1 UNION ALL SELECT created_at FROM quiz_attempts WHERE user_id=$1
                          UNION ALL SELECT created_at FROM sandbox_runs WHERE user_id=$1) x ORDER BY t`, [id])).rows.map((r) => new Date(r.t));
    const firstLesson = (await q("SELECT min(completed_at) AS t FROM plan_progress WHERE user_id=$1 AND item_key LIKE '%.lesson'", [id])).rows[0]?.t;
    const m1 = fin.filter((i) => i.week && i.week <= 4).map((i) => i.key);
    const m1end = (await q('SELECT max(completed_at) AS t FROM plan_progress WHERE user_id=$1 AND item_key = ANY($2)', [id, m1])).rows[0]?.t;
    const cards = (await q("SELECT key FROM collectibles WHERE user_id=$1 AND key NOT IN ('first-step','first-lesson','phase-1') AND key NOT LIKE 'rules%' ORDER BY key", [id])).rows.map((r) => r.key);
    const fixed = { 'first-step': start, 'first-lesson': firstLesson || start, 'phase-1': m1end || start };
    cards.forEach((k, i) => { fixed[k] = evs.length ? evs[Math.min(evs.length - 1, Math.round(((i + 1) / (cards.length + 1)) * (evs.length - 1)))] : new Date(); });
    for (const [k, t] of Object.entries(fixed)) await q('UPDATE collectibles SET earned_at=$3 WHERE user_id=$1 AND key=$2', [id, k, t]);
    await q('UPDATE collectibles SET seen_at=now() WHERE user_id=$1', [id]);
  } catch (e) { console.warn('Halfway test trainee: cards not synced', e.message); }
  await seedVisits(id);
  console.log(`Halfway test trainee created: ${email}`);
  return id;
}

/** Its connections for My Activities: one visit on each day it did something, from a little before the first
 * activity of the day to a little after the last, on a computer (on a phone now and then). */
export async function seedVisits(id) {
  if ((await q('SELECT 1 FROM user_visits WHERE user_id=$1', [id])).rowCount) return;
  const ev = (await q(`SELECT completed_at AS t FROM plan_progress WHERE user_id=$1 UNION ALL SELECT created_at FROM quiz_attempts WHERE user_id=$1
                       UNION ALL SELECT created_at FROM submissions WHERE user_id=$1 UNION ALL SELECT created_at FROM sandbox_runs WHERE user_id=$1`, [id])).rows.map((r) => new Date(r.t));
  // Events less than 90 minutes apart belong to the same connection.
  const clusters = [];
  for (const t of ev.sort((x, y) => x - y)) { const c = clusters.at(-1); if (c && t - c[1] < 90 * 60e3) c[1] = t; else clusters.push([t, t]); }
  let n = 0;
  for (const [a, b] of clusters) {
    const start = new Date(a.getTime() - (8 + (n % 4) * 3) * 60e3), end = new Date(Math.min(Date.now() - 60e3, Math.max(b.getTime(), a.getTime() + (18 + (n % 4) * 6) * 60e3) + (5 + (n % 5) * 2) * 60e3));
    await q('INSERT INTO user_visits (user_id,started_at,last_seen_at,device,requests) VALUES ($1,$2,$3,$4,$5)', [id, start, end, n % 5 === 3 ? 'Phone' : 'Computer', 20 + (n % 7) * 6]);
    n++;
  }
}

/** Create it once on start-up, so it exists in every environment without anyone typing a password. */
export async function ensureHalfway() {
  if ((await q("SELECT 1 FROM app_settings WHERE key='demo_halfway_2026'")).rowCount) {
    // Created before My Activities existed: give it its connections once.
    const u = (await q('SELECT id FROM users WHERE lower(email)=$1 AND is_demo', [HALFWAY_EMAIL])).rows[0];
    if (u) await seedVisits(u.id);
    return;
  }
  if (!(await q('SELECT 1 FROM users WHERE lower(email)=$1', [HALFWAY_EMAIL])).rowCount) await createHalfway();
  await q("INSERT INTO app_settings (key,value) VALUES ('demo_halfway_2026',$1) ON CONFLICT (key) DO NOTHING", [{ at: new Date().toISOString() }]);
}
