// The programme engine. It turns the inputs we hold about a trainee (Self Assessment, knowledge test, missed questions,
// profile, in-app checks, practice sign-offs and the Academy team's inputs such as 1:1 notes or call reviews) into:
//   1. a level estimate per scenario (where you are now),
//   2. a 12-week personal plan in four phases (what the next three months look like),
//   3. a projection (where you will be at the end).
// Plans are versioned. A new structure is saved as a draft and only reaches the trainee once the Academy owner approves it.
// Progress (ticks, check scores, levels) is live and never needs approval.
// Design notes (from evidence-based training practice): diagnose first, then a roadmap ordered by personal priority;
// advance on mastery (80% on a check); retrieval practice and feedback after every lesson; spaced review weeks later;
// practice that produces proof; coaching where the gap is largest; a final transfer task (mock client call) and a retest.
import { q } from './db.js';
import { SCENARIOS, SCENARIO_KEYS, CRITICAL_STEPS } from './scenarios.js';
import { MODULES, MODULE_BY_KEY, MODULE_FOR_SCENARIO, DEPTH } from './curriculum.js';
import { computePriorities, latestByUser } from './scoring.js';
import { WALKTHROUGHS, EXPLAIN } from './curriculum-extra.js';

export const PASS = 0.8;
export const WEEKS = 12;
export const DEFAULT_SETTINGS = {
  goal: 'Be the person clients trust with KUDO: set up and run every scenario your role covers, and know exactly when to hand over to Technical Support.',
  target: 80,
};
export const PHASES = [
  { n: 1, name: 'Warm-up', weeks: [1, 2], aim: 'Baseline, foundations and your kick-off with your KUDO Trainer.' },
  { n: 2, name: 'Build', weeks: [3, 7], aim: 'Your focus scenarios, in depth: learn, practise, prove it.' },
  { n: 3, name: 'Broaden', weeks: [8, 10], aim: 'The rest of the scenarios and the cross-cutting topics, plus spaced reviews.' },
  { n: 4, name: 'Prove it', weeks: [11, 12], aim: 'A mock client call with your KUDO Trainer and the retest.' },
];
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n) => Math.round(n);
export const band = (v, target = 80) => (v == null ? { key: 'none', label: 'No data' } : v >= target ? { key: 'ready', label: 'Ready' } : v >= target - 10 ? { key: 'nearly', label: 'Nearly there' } : v >= 50 ? { key: 'developing', label: 'Developing' } : { key: 'gap', label: 'Gap' });
const PREF_TIP = {
  'Short Videos': 'Start with the explainer video, then read the lesson.',
  'Written Guides & Articles': 'Start with the lesson, then the Help Center articles.',
  'Practising real scenarios / Roleplay with a colleague': 'Do the practice task first with a colleague, then read the lesson to fill the gaps.',
  'Live Sessions': 'Ask your KUDO Trainer for a live walkthrough of this scenario at the next team session.',
  '1:1 Coaching': 'Bring your questions to your coaching session with your KUDO Trainer.',
};
const SIGNAL_EFFECT = { gap: (v) => Math.min(v, 45), developing: (v) => clamp(v, 50, 69), solid: (v) => Math.max(v, 80) };
// Target per depth level: you need less on a scenario you hand over than on one you run yourself.
export const targetFor = (depth, target) => (depth === 'handover' ? target - 10 : depth === 'know' ? target - 20 : target);
const depthOf = (s) => MODULE_BY_KEY[MODULE_FOR_SCENARIO[s]]?.depth || 'setup';
const label = (k) => SCENARIOS.find((s) => s.key === k)?.label || k;
const short = (k) => SCENARIOS.find((s) => s.key === k)?.short || k;

export async function getSettings() {
  const r = await q("SELECT value FROM app_settings WHERE key='programme'");
  return { ...DEFAULT_SETTINGS, ...(r.rows[0]?.value || {}) };
}

/** Load everything the engine needs, for one user or for all trainees. */
export async function loadContext(userId = null) {
  const [users, scoreRows, rounds, qres, attempts, inputs, progress, crit, settings, subs, surveys] = await Promise.all([
    q(`SELECT id,name,email,region,team,weight,demand_scenario,struggle_scenarios,profile,plan_overrides,is_demo,role,is_trainee,last_login_at
         FROM users WHERE (role='trainee' OR is_trainee) AND active ORDER BY name`),
    q(`SELECT s.user_id,s.scenario,s.pct,s.correct,s.total,r.kind,r.sort,r.id AS round_id,r.taken_on FROM scores s JOIN rounds r ON r.id=s.round_id`),
    q('SELECT id,key,label,kind,taken_on,sort FROM rounds ORDER BY sort,id'),
    q(`SELECT qr.user_id, qr.round_id, qr.qnum, qr.correct, qu.scenario, qu.question, qu.answer
         FROM question_results qr JOIN questions qu ON qu.round_id=qr.round_id AND qu.qnum=qr.qnum`),
    q(`SELECT id,user_id,module_key,item_key,correct::float AS correct,total,knowledge::float AS knowledge,kind,counts,answers,created_at FROM quiz_attempts ${userId ? 'WHERE user_id=$1' : ''} ORDER BY created_at`, userId ? [userId] : undefined),
    q(`SELECT id,user_id,kind,happened_on,title,link,signals,item_key,shared_summary,created_at FROM inputs ${userId ? 'WHERE user_id=$1' : ''} ORDER BY happened_on, id`, userId ? [userId] : undefined),
    q(`SELECT user_id,item_key,status,note,signed_off_at,completed_at FROM plan_progress ${userId ? 'WHERE user_id=$1' : ''}`, userId ? [userId] : undefined),
    q('SELECT key, critical_steps FROM scenario_settings'),
    getSettings(),
    q(`SELECT id,user_id,module_key,kind,counts,status,rubric,auto,created_at FROM submissions ${userId ? 'WHERE user_id=$1' : ''} ORDER BY created_at`, userId ? [userId] : undefined),
    q(`SELECT user_id,created_at FROM survey_responses ${userId ? 'WHERE user_id=$1' : ''}`, userId ? [userId] : undefined),
  ]);
  const critical = { ...CRITICAL_STEPS }; for (const r of crit.rows) critical[r.key] = r.critical_steps;
  const real = users.rows.filter((u) => !u.is_demo);
  const self = latestByUser(scoreRows.rows, 'self'), live = latestByUser(scoreRows.rows, 'live');
  const teamPriority = Object.fromEntries(computePriorities({ users: real, selfByUser: self, liveByUser: live, critical }).map((p) => [p.scenario, p]));
  // How far self ratings sit above test scores across the team, used to correct self-only estimates.
  let sSum = 0, lSum = 0;
  for (const u of real) for (const s of SCENARIO_KEYS) { const a = self.get(u.id)?.[s], b = live.get(u.id)?.[s]; if (a && b && b.total) { sSum += a.pct; lSum += b.pct; } }
  const calibration = sSum ? clamp(lSum / sSum, 0.5, 1.1) : 0.85;
  const teamLive = {};
  for (const s of SCENARIO_KEYS) { const v = real.map((u) => live.get(u.id)?.[s]).filter((x) => x && x.total); teamLive[s] = v.length ? v.reduce((a, x) => a + x.correct, 0) / v.reduce((a, x) => a + x.total, 0) * 100 : 50; }
  const latestRound = (uid, kind) => { const rs = scoreRows.rows.filter((r) => r.user_id === uid && r.kind === kind).sort((a, b) => b.sort - a.sort); return rs[0] ? rounds.rows.find((r) => r.id === rs[0].round_id) : null; };
  const by = (rows) => { const m = new Map(); for (const r of rows) { if (!m.has(r.user_id)) m.set(r.user_id, []); m.get(r.user_id).push(r); } return m; };
  return {
    users: users.rows, self, live, rounds: rounds.rows, teamPriority, calibration, teamLive, settings, latestRound,
    qres: by(qres.rows), attempts: by(attempts.rows), inputs: by(inputs.rows), progress: by(progress.rows), subs: by(subs.rows), surveys: new Set(surveys.rows.map((r) => r.user_id)),
  };
}

// An explain-it rubric as a 0-100 score: accuracy, completeness and hand-over, each 1 to 3 (clarity is feedback only).
export const explainScore = (r) => { const k = ['accurate', 'complete', 'handover'].filter((x) => [1, 2, 3].includes(r?.[x])); return k.length ? ((k.reduce((t, x) => t + r[x], 0) / k.length - 1) / 2) * 100 : null; };

/** Where the trainee is now: a 0-100 estimate per scenario, with where it came from. */
export function computeLevels(u, ctx, { forPlanning = false } = {}) {
  const self = ctx.self.get(u.id) || {}, live = ctx.live.get(u.id) || {};
  const liveRound = ctx.latestRound(u.id, 'live'), selfRound = ctx.latestRound(u.id, 'self');
  const since = liveRound?.taken_on || selfRound?.taken_on || null;
  const lo = live.overall, so = self.overall;
  const per = {};
  for (const s of SCENARIO_KEYS) {
    const sp = self[s]?.pct ?? null, lv = live[s];
    const prior = clamp(sp != null ? sp * ctx.calibration : ctx.teamLive[s]);
    let est, source, note;
    if (lv && lv.total) { est = (lv.correct * 100 + 1.5 * prior) / (lv.total + 1.5); source = 'test'; note = `${lv.correct}/${lv.total} on the knowledge test`; }
    else if (lo && lo.pct != null && sp != null && so?.pct) { est = clamp(sp * (lo.pct / so.pct)); source = 'estimated'; note = 'Estimated from your overall test score and your Self Assessment'; }
    else if (lo && lo.pct != null) { est = lo.pct; source = 'estimated'; note = 'Estimated from your overall test score'; }
    else if (sp != null) { est = sp * ctx.calibration; source = 'self'; note = 'Estimated from your Self Assessment, adjusted to how the team scored on the test'; }
    else { est = ctx.teamLive[s]; source = 'none'; note = 'No result yet: team average used'; }
    per[s] = { scenario: s, baseline: round(est), est, source, note, self: sp, live: lv?.total ? round(lv.pct) : null, history: [] };
  }
  // Events after the latest assessment, in order.
  const after = (d) => !since || new Date(d) >= new Date(since);
  const events = [];
  // Only results of record count: the first attempt in the cycle. Retakes are practice.
  for (const a of ctx.attempts.get(u.id) || []) if (after(a.created_at) && a.counts !== false) events.push({ at: a.created_at, type: 'attempt', a });
  for (const i of ctx.inputs.get(u.id) || []) if (after(i.happened_on)) events.push({ at: i.happened_on, type: 'input', i });
  // Explain-it recordings of record count like a test: the automatic score, replaced by the KUDO Trainer's when they review it.
  for (const sb of ctx.subs.get(u.id) || []) if ((sb.kind || 'explain') === 'explain' && sb.counts !== false && ['auto', 'reviewed'].includes(sb.status) && sb.rubric && after(sb.created_at)) events.push({ at: sb.created_at, type: 'explain', sb });
  events.sort((x, y) => new Date(x.at) - new Date(y.at));
  for (const e of events) {
    if (e.type === 'attempt') {
      const a = e.a;
      if (a.module_key === 'baseline') {
        for (const s of SCENARIO_KEYS) {
          const mine = (a.answers || []).filter((x) => x.scenario === s);
          if (!mine.length) continue;
          const sc = (mine.reduce((t, x) => t + (x.knowledge ?? (x.ok ? 1 : 0)), 0) / mine.length) * 100;
          const from = per[s].est;
          per[s].est = 0.65 * per[s].est + 0.35 * sc; per[s].history.push({ at: a.created_at, what: 'Baseline check', v: round(per[s].est), from: round(from), score: round(sc), module: 'baseline', kind: 'baseline' });
          if (per[s].source !== 'test') { per[s].source = 'check'; per[s].note = 'Updated by your baseline check'; }
        }
        continue;
      }
      const s = MODULE_BY_KEY[a.module_key]?.scenario; if (!s || forPlanning || a.kind === 'challenge' || a.kind === 'spaced') continue;
      // The level uses the certainty-adjusted score: a lucky low-certainty answer counts half.
      const sc = ((a.knowledge ?? a.correct) / a.total) * 100;
      const w = a.kind === 'scenario' ? 0.4 : 0.6;
      const from = per[s].est;
      per[s].est = (1 - w) * per[s].est + w * sc; per[s].source = 'check';
      per[s].note = a.kind === 'scenario' ? `Updated by your ${short(s)} decision walkthrough` : `Updated by your ${MODULE_BY_KEY[a.module_key].title} check`;
      per[s].history.push({ at: a.created_at, what: a.kind === 'scenario' ? 'Walkthrough' : 'Module check', v: round(per[s].est), from: round(from), score: round(sc), module: a.module_key, kind: a.kind });
    } else if (e.type === 'explain' && !forPlanning) {
      const sb = e.sb, s = MODULE_BY_KEY[sb.module_key]?.scenario; if (!s) continue;
      const sc = explainScore(sb.rubric); if (sc == null) continue;
      const from = per[s].est, reviewed = sb.status === 'reviewed';
      per[s].est = 0.5 * per[s].est + 0.5 * sc; per[s].source = 'check';
      per[s].note = `Updated by your ${MODULE_BY_KEY[sb.module_key].title} explain-it${reviewed ? ', reviewed by your KUDO Trainer' : ''}`;
      per[s].history.push({ at: sb.created_at, what: 'Explain it', v: round(per[s].est), from: round(from), score: round(sc), module: sb.module_key, kind: 'explain', reviewed });
    } else if (e.type === 'input' && forPlanning) {
      // The KUDO Trainer's 1:1 signals shape the plan; the level shown to the trainee moves only with test results.
      for (const sig of e.i.signals || []) {
        if (!per[sig.scenario] || !SIGNAL_EFFECT[sig.rating]) continue;
        per[sig.scenario].est = SIGNAL_EFFECT[sig.rating](per[sig.scenario].est); per[sig.scenario].source = 'coach';
        per[sig.scenario].note = `Updated after "${e.i.title}"`; per[sig.scenario].history.push({ at: e.i.happened_on, what: e.i.title, v: round(per[sig.scenario].est) });
      }
    }
  }
  for (const s of SCENARIO_KEYS) per[s].est = round(clamp(per[s].est));
  return { per, liveRound, selfRound, hasPerScenarioTest: SCENARIO_KEYS.some((s) => per[s].source === 'test') };
}

/** Personal priority per scenario: size of the gap, weighted by what the team needs and what this person's clients bring. */
export function personalPriority(u, levels, ctx) {
  const target = ctx.settings.target;
  return SCENARIO_KEYS.map((s) => {
    const L = levels.per[s];
    const tg = targetFor(depthOf(s), target);
    const gap = Math.max(0, tg - L.est) / tg;
    const teamP = ctx.teamPriority[s]?.priority ?? 30;
    const m = MODULE_BY_KEY[MODULE_FOR_SCENARIO[s]];
    const over = L.self != null && L.live != null && L.self - L.live >= 15;
    const under = L.self != null && L.live != null && L.live - L.self >= 15;
    let w = gap * (0.6 + 0.4 * teamP / 100);
    const why = [];
    if (u.demand_scenario === s) { w *= 1.4; why.push('the scenario your clients bring you most'); }
    if ((u.struggle_scenarios || []).includes(s)) { w *= 1.2; why.push('a topic you said you find hard'); }
    if (over) { w *= 1.15; why.push(`you rated yourself ${round(L.self)}% and scored ${L.live}%`); }
    if (m?.depth === 'handover') w *= 0.7;
    if ((ctx.teamPriority[s]?.tier ?? 3) === 1) why.push('a Tier 1 priority for the team');
    return { scenario: s, module: m?.key, weight: w, gap, gapPts: tg - L.est, over, under, why };
  }).sort((a, b) => b.weight - a.weight);
}

/** Build the plan structure (what gets approved). */
export const STABLE_POINTS = 15; // a level change smaller than this is within the noise of a 6-question check
export function buildPlan(u, ctx, { keepFocus = null } = {}) {
  // Structure is planned from assessments, the baseline check and the KUDO Trainer's inputs only. The trainee's own module checks
  // move their live levels and progress but do not reshuffle the plan, so approved plans stay stable.
  const levels = computeLevels(u, ctx, { forPlanning: true });
  const target = ctx.settings.target;
  const ov = u.plan_overrides || {};
  const pri = personalPriority(u, levels, ctx);
  const priBy = Object.fromEntries(pri.map((p) => [p.scenario, p]));
  const pref = u.profile?.learning_pref || null;
  const tip = PREF_TIP[pref] || null;
  const missed = (ctx.qres.get(u.id) || []).filter((r) => !r.correct && r.round_id === levels.liveRound?.id);
  const missedBy = (s) => missed.filter((r) => r.scenario === s);

  const focusPinned = Array.isArray(ov.focus) && ov.focus.length > 0;
  const traineeChoice = !focusPinned && Array.isArray(ov.traineeFocus) && ov.traineeFocus.length ? ov.traineeFocus.filter((s) => SCENARIO_KEYS.includes(s)).slice(0, 3) : null;
  let focus = focusPinned ? ov.focus.filter((s) => SCENARIO_KEYS.includes(s)).slice(0, 3) : traineeChoice || keepFocus || pri.filter((p) => p.gapPts >= 5).slice(0, 3).map((p) => p.scenario);
  const items = [];
  const placed = new Set();
  // Content is gathered in blocks (one course, or one task) in teaching order; weeks are given out afterwards so that
  // every week carries a similar load. Items added outside a block keep the week they are given.
  const blocks = []; let cur = null;
  const add = (it) => { (cur ? cur.items : items).push({ owner: 'you', mandatory: false, minutes: 20, ...it }); };
  const block = (phase, fn, extra = {}) => { cur = { phase, items: [], ...extra }; fn(); if (cur.items.length) blocks.push(cur); cur = null; };
  const reasonFor = (s) => {
    const L = levels.per[s], p = priBy[s]; const bits = [];
    if (L.live != null) bits.push(`you scored ${L.live}% on the October test`); else bits.push(`your current estimate is ${L.est}%`);
    const mq = missedBy(s); if (mq.length) bits.push(`you missed ${mq.length} question${mq.length > 1 ? 's' : ''} on it`);
    bits.push(...(p?.why || []));
    return bits.join(', ');
  };
  const moduleItems = (mkey, { phase, week, full, focusItem = false, s = null }) => {
    const m = MODULE_BY_KEY[mkey]; placed.add(mkey);
    const why = s ? `In your plan because ${reasonFor(s)}.` : null;
    if (!full) { add({ key: `${mkey}.check`, kind: 'check', module: mkey, scenario: s, phase, week, title: `Quick check: ${m.title}`, why: s ? `Your estimate is ${levels.per[s].est}%, so a check is enough to confirm it.` : 'A short check to confirm what you know.', minutes: 10 }); return; }
    const practiceFirst = s && (priBy[s]?.over || pref === 'Practising real scenarios / Roleplay with a colleague');
    const lesson = { key: `${mkey}.lesson`, kind: 'lesson', module: mkey, scenario: s, phase, week, title: `Learn: ${m.title}`, why, tip, minutes: m.minutes, mandatory: focusItem };
    const practice = { key: `${mkey}.practice`, kind: 'practice', module: mkey, scenario: s, phase, week, title: `Practise: ${m.title}`, why: practiceFirst && priBy[s]?.over ? 'Try it first: doing the task shows where the gaps are before you read.' : 'Do it, then submit it in the lesson (written or recorded). It is reviewed within a minute and signed off when it passes.', minutes: 30, mandatory: focusItem, signoff: focusItem };
    if (focusItem || m.depth === 'setup') { if (practiceFirst) add(practice), add(lesson); else add(lesson), add(practice); } else add(lesson);
    if (WALKTHROUGHS[mkey] && (focusItem || m.depth === 'setup')) add({ key: `${mkey}.scenario`, kind: 'scenario', module: mkey, scenario: s, phase, week, title: `Decide: ${WALKTHROUGHS[mkey].title}`, why: 'A realistic client situation. Your choices get feedback straight away.', minutes: 10, mandatory: focusItem });
    if (EXPLAIN[mkey] && focusItem) add({ key: `${mkey}.explain`, kind: 'explain', module: mkey, scenario: s, phase, week, title: `Explain it: ${m.title}`, why: 'Record yourself (or write it) explaining this to a client. It is reviewed automatically and your KUDO Trainer spot-checks it.', minutes: 15, mandatory: true });
    add({ key: `${mkey}.check`, kind: 'check', module: mkey, scenario: s, phase, week, title: `Check: ${m.title}`, why: `Your first attempt is the score we keep (aim for ${Math.round(PASS * 100)}%). Retake it afterwards as often as you like to practise.`, minutes: 10, mandatory: focusItem });
  };

  // Phase 1: Warm-up: the kick-off, the baseline, the foundations, the platform and the October questions
  add({ key: 'kickoff', kind: 'one_to_one', phase: 1, week: 1, title: 'Kick-off with your KUDO Trainer', why: 'Agree your goal and walk through this plan together.', owner: 'jack', minutes: 30, mandatory: true });
  const estimatedFocus = focus.some((s) => ['self', 'estimated', 'none'].includes(levels.per[s].source));
  if (!levels.hasPerScenarioTest || estimatedFocus) block(1, () => add({ key: 'baseline', kind: 'baseline', phase: 1, title: 'Baseline check: one question per scenario', why: 'You have no per-scenario test result yet, so this short check replaces the estimate and sharpens your plan.', minutes: 15, mandatory: true }));
  const tgt = (s) => targetFor(depthOf(s), target);
  const coreReady = ['ai', 'hi', 'platform'].every((s) => levels.per[s].est >= tgt(s));
  block(1, () => moduleItems('foundations', { phase: 1, full: !coreReady }));
  if (!focus.includes('platform')) block(1, () => moduleItems('platform', { phase: 1, full: levels.per.platform.est < tgt('platform'), s: 'platform' }));
  if (missed.length) block(1, () => add({ key: 'missed', kind: 'missed', phase: 1, title: `Revisit the ${missed.length} question${missed.length > 1 ? 's' : ''} you missed in October`, why: 'Answer each one out loud before revealing the answer: retrieval makes it stick.', minutes: 20, mandatory: true }));

  // Phase 2: Build: the focus scenarios in depth, each with its coaching session when planned
  const coachMax = pref === '1:1 Coaching' ? 2 : 1;
  const coachOn = new Set(focus.filter((s) => levels.per[s].est < 50 || pref === '1:1 Coaching').sort((a, b) => levels.per[a].est - levels.per[b].est).slice(0, coachMax));
  focus.forEach((s) => {
    const mk = MODULE_FOR_SCENARIO[s];
    block(2, () => {
      moduleItems(mk, { phase: 2, full: true, focusItem: true, s });
      if (coachOn.has(s)) add({ key: `coach.${mk}`, kind: 'one_to_one', module: mk, scenario: s, phase: 2, title: `Coaching with your KUDO Trainer: ${short(s)}`, why: levels.per[s].est < 50 ? 'Your biggest gap, so you get a 1:1 on it.' : 'You said 1:1 coaching works best for you.', owner: 'jack', minutes: 30 });
    }, { focus: s });
  });
  if (focus.includes('ai') || levels.per.ai.est < tgt('ai')) block(2, () => moduleItems('glossary', { phase: 2, full: true }));

  // Phase 3: Broaden: the other scenarios and the cross-cutting topics, by personal priority
  const rest = pri.filter((p) => !focus.includes(p.scenario) && !placed.has(p.module));
  const restCross = ['glossary', 'network', 'marketplace', 'ringcentral'].filter((k) => !placed.has(k));
  // A scenario already at target only needs a quick check: those confirm what you know, so they go to Prove it (week 11).
  const quick = [];
  [...rest.map((p) => ({ mk: p.module, s: p.scenario, full: levels.per[p.scenario].est < tgt(p.scenario) })), ...restCross.map((k) => ({ mk: k, s: null, full: true }))]
    .forEach((x) => { if (x.full) block(3, () => moduleItems(x.mk, { phase: 3, full: true, s: x.s })); else quick.push(x); });
  pri.filter((p) => p.under && levels.per[p.scenario].est >= tgt(p.scenario)).slice(0, 1).forEach((p) => block(3, () => add({ key: `teach.${p.module}`, kind: 'teach', module: p.module, scenario: p.scenario, phase: 3, title: `Teach ${short(p.scenario)} to a colleague`, why: `You scored ${levels.per[p.scenario].live}%, well above your own rating. You know more than you think: explaining it locks it in.`, minutes: 30 })));

  // ---- Weeks. Weeks 1 to 10 carry the courses; 11 and 12 are for proving it. Each phase gets weeks in proportion to
  // its work, then its courses are spread so that no week is much heavier than another. A course stays in one week,
  // except a long one, which may split into "learn and practise" and, the week after, "decide, explain and check".
  const CONTENT_WEEKS = 10;
  const mineMin = (b) => b.items.filter((i) => i.owner === 'you').reduce((t, i) => t + (i.minutes || 0), 0);
  const splitOf = (b) => { const k = b.items.findIndex((i) => ['scenario', 'explain', 'check'].includes(i.kind)); return k > 0 && k < b.items.length ? [{ ...b, items: b.items.slice(0, k) }, { ...b, items: b.items.slice(k) }] : null; };
  const groups = [1, 2, 3].map((n) => blocks.filter((b) => b.phase === n));
  const work = groups.map((g) => g.reduce((t, b) => t + mineMin(b), 0));
  const total = work.reduce((t, x) => t + x, 0) || 1;
  // Split the long courses first ("learn and practise", then "decide, explain and check" the week after).
  const avgWeek = total / CONTENT_WEEKS;
  groups.forEach((g) => {
    for (let guard = 0; guard < 20; guard++) {
      const i = g.findIndex((b) => mineMin(b) > avgWeek * 1.3 && splitOf(b));
      if (i < 0) break;
      g.splice(i, 1, ...splitOf(g[i]));
    }
  });
  // Order-preserving split of a phase into k weeks, keeping its heaviest week as light as possible.
  const partition = (ms, k) => {
    const n = ms.length;
    const pre = [0]; ms.forEach((m) => pre.push(pre.at(-1) + m));
    const best = Array.from({ length: k + 1 }, () => Array(n + 1).fill(Infinity)), cut = Array.from({ length: k + 1 }, () => Array(n + 1).fill(0));
    best[0][0] = 0;
    for (let j = 1; j <= k; j++) for (let i = j; i <= n; i++) for (let x = j - 1; x < i; x++) { const v = Math.max(best[j - 1][x], pre[i] - pre[x]); if (v < best[j][i]) { best[j][i] = v; cut[j][i] = x; } }
    const at = Array(n); let i = n;
    for (let j = k; j >= 1; j--) { const x = cut[j][i]; for (let y = x; y < i; y++) at[y] = j - 1; i = x; }
    const loads = Array(k).fill(0); ms.forEach((m, y) => { loads[at[y]] += m; });
    return { at, loads };
  };
  // Try every way to share the ten weeks between the three phases (each at least one week, never more weeks than it has
  // courses) and keep the one whose heaviest week is lightest, then the most even.
  let alloc = null, plans = null, bestScore = null;
  for (let a = 1; a <= CONTENT_WEEKS - 2; a++) for (let b2 = 1; a + b2 <= CONTENT_WEEKS - 1; b2++) {
    const ks = [a, b2, CONTENT_WEEKS - a - b2];
    if (ks.some((k, i) => (groups[i].length ? k > groups[i].length : k > 1))) continue;
    const ps = groups.map((g, i) => (g.length ? partition(g.map(mineMin), ks[i]) : { at: [], loads: [0] }));
    const loads = ps.flatMap((x) => x.loads), score = [Math.max(...loads), loads.reduce((t, l) => t + (l - avgWeek) ** 2, 0)];
    if (!bestScore || score[0] < bestScore[0] - 5 || (Math.abs(score[0] - bestScore[0]) <= 5 && score[1] < bestScore[1])) { bestScore = score; alloc = ks; plans = ps; }
  }
  if (!alloc) { // fewer courses than weeks: one course a week, the remaining weeks as buffers at the end of each phase
    alloc = groups.map((g) => Math.max(1, g.length)); let i = 0; while (alloc.reduce((t, x) => t + x, 0) < CONTENT_WEEKS) alloc[(i++) % 3]++;
    while (alloc.reduce((t, x) => t + x, 0) > CONTENT_WEEKS) alloc[alloc.indexOf(Math.max(...alloc))]--;
    plans = groups.map((g, gi) => ({ at: g.map((_, y) => Math.min(y, alloc[gi] - 1)) }));
  }
  const phaseWeeks = []; let w0 = 1;
  groups.forEach((g, gi) => {
    const n = alloc[gi]; phaseWeeks.push([w0, w0 + n - 1]);
    const at = plans[gi].at;
    g.forEach((b, i) => b.items.forEach((it) => items.push({ ...it, phase: gi + 1, week: w0 + at[i] })));
    w0 += n;
  });
  phaseWeeks.push([CONTENT_WEEKS + 1, CONTENT_WEEKS + 2]);
  const phaseOfWeek = (w) => phaseWeeks.findIndex(([a, b]) => w >= a && w <= b) + 1 || 4;
  const weekOf = (key) => items.find((i) => i.key === key)?.week;

  // Fixed points: the mid-point review halfway, a spaced review three weeks after each focus course, then in week 11 a
  // final review of each focus scenario before the mock client call, and in week 12 the survey and the retest.
  add({ key: 'midpoint', kind: 'one_to_one', phase: phaseOfWeek(6), week: 6, title: 'Mid-point check-in with your KUDO Trainer', why: 'Review progress and adjust the second half of your plan.', owner: 'jack', minutes: 20, mandatory: true });
  focus.forEach((s) => {
    const mk = MODULE_FOR_SCENARIO[s], wk = Math.min(CONTENT_WEEKS, (weekOf(`${mk}.check`) || weekOf(`${mk}.lesson`) || 5) + 3);
    add({ key: `review.${mk}`, kind: 'review', module: mk, scenario: s, phase: phaseOfWeek(wk), week: wk, title: `Spaced review: ${short(s)}`, why: 'Weeks after learning it, retrieve it again. This is what makes it last.', minutes: 10, mandatory: true });
    add({ key: `review.final.${mk}`, kind: 'review', module: mk, scenario: s, phase: 4, week: CONTENT_WEEKS + 1, title: `Final review: ${short(s)}`, why: 'One last retrieval before the mock call and the retest.', minutes: 10, mandatory: true });
  });
  quick.forEach((x) => moduleItems(x.mk, { phase: 4, week: CONTENT_WEEKS + 1, full: false, s: x.s }));
  const lead = focus[0];
  add({ key: 'mock', kind: 'one_to_one', phase: 4, week: CONTENT_WEEKS + 1, title: `Mock client call with your KUDO Trainer${lead ? `: ${short(lead)}` : ''}`, why: 'Your KUDO Trainer plays the client. You set up the scenario, answer the hard questions and say when you would hand over.', owner: 'jack', minutes: 30, mandatory: true });
  add({ key: 'survey', kind: 'survey', phase: 4, week: CONTENT_WEEKS + 2, title: 'Tell us how the programme worked for you', why: 'Ten questions. Your answers shape the next round of the Academy.', minutes: 5 });
  add({ key: 'retest', kind: 'milestone', phase: 4, week: CONTENT_WEEKS + 2, title: 'Retest: the January knowledge test', why: 'Same format as October, so your progress is measured like for like.', owner: 'jack', minutes: 45, mandatory: true });
  const phases = PHASES.map((p, i) => ({ ...p, weeks: phaseWeeks[i] }));

  const skip = new Set(Array.isArray(ov.skip) ? ov.skip : []);
  const kept = items.filter((i) => !skip.has(i.key)).sort((a, b) => a.week - b.week || (a.owner === 'jack' ? -1 : 0) - (b.owner === 'jack' ? -1 : 0));
  const targets = Object.fromEntries(SCENARIO_KEYS.map((s) => [s, tgt(s)]));
  const projected = Object.fromEntries(SCENARIO_KEYS.map((s) => [s, Math.max(levels.per[s].est, tgt(s))]));
  const data = {
    built_at: new Date().toISOString(),
    target, goal: ctx.settings.goal, phases,
    focus, focusPinned, focusChosen: !!traineeChoice, focusReasons: Object.fromEntries(focus.map((s) => [s, reasonFor(s)])),
    learning_pref: pref, tip,
    baseline: Object.fromEntries(SCENARIO_KEYS.map((s) => [s, { v: levels.per[s].est, source: levels.per[s].source }])),
    baseline_round: levels.liveRound?.id ?? null,
    projected, targets,
    items: kept, skipped: items.filter((i) => skip.has(i.key)).map((i) => ({ key: i.key, title: i.title })),
    rationale: [
      levels.hasPerScenarioTest ? 'Levels start from the October knowledge test, blended with the Self Assessment.' : 'No per-scenario test result: levels are estimated, and a baseline check is added in week 1.',
      focusPinned ? 'Focus scenarios were chosen by your KUDO Trainer.' : `Focus: the ${focus.length} scenarios with the highest personal priority (gap to ${target}%, team priority, client demand, stated struggle, over-confidence).`,
      pref ? `Learning preference "${pref}" shapes the order and format.` : 'No learning preference recorded.',
    ],
  };
  const signature = JSON.stringify([focus, kept.map((i) => `${i.key}@${i.week}`), phases.map((p) => p.weeks)]);
  return { data, signature, levels };
}

/** Save a new draft if the structure changed since the latest approved (or draft) version. */
export async function refreshPlan(userId, ctx = null) {
  ctx = ctx || await loadContext(userId);
  const u = ctx.users.find((x) => x.id === userId); if (!u) return null;
  const r = await q("SELECT id,version,status,signature,data FROM plans WHERE user_id=$1 AND status IN ('draft','approved') ORDER BY version DESC", [userId]);
  const draft = r.rows.find((p) => p.status === 'draft'), approved = r.rows.find((p) => p.status === 'approved');
  let { data, signature } = buildPlan(u, ctx);
  // Stability: within the same assessment cycle, the focus only changes when a level has really moved. A swap driven by
  // differences under STABLE_POINTS (one question on a 6-question check) keeps the approved focus.
  const ad = approved?.data;
  if (ad && !data.focusPinned && !ad.focusPinned && !data.focusChosen && ad.baseline_round === data.baseline_round && JSON.stringify(ad.focus) !== JSON.stringify(data.focus)) {
    const swapped = [...new Set([...ad.focus, ...data.focus])].filter((s) => !(ad.focus.includes(s) && data.focus.includes(s)));
    const moved = swapped.some((s) => Math.abs((data.baseline[s]?.v ?? 0) - (ad.baseline?.[s]?.v ?? 0)) >= STABLE_POINTS);
    if (!moved) ({ data, signature } = buildPlan(u, ctx, { keepFocus: ad.focus }));
  }
  const maxV = (await q('SELECT COALESCE(max(version),0)::int v FROM plans WHERE user_id=$1', [userId])).rows[0].v;
  if (approved && approved.signature === signature) { if (draft) await q('DELETE FROM plans WHERE id=$1', [draft.id]); return 'unchanged'; }
  if (draft) { if (draft.signature !== signature) await q('UPDATE plans SET data=$2, signature=$3, created_at=now() WHERE id=$1', [draft.id, data, signature]); return 'draft'; }
  await q("INSERT INTO plans (user_id,version,status,data,signature) VALUES ($1,$2,'draft',$3,$4)", [userId, maxV + 1, data, signature]);
  return 'draft';
}
export async function refreshAll() {
  const ctx = await loadContext();
  for (const u of ctx.users) await refreshPlan(u.id, ctx);
  return ctx;
}

export async function approvePlan(userId, adminId) {
  const r = await q("SELECT id FROM plans WHERE user_id=$1 AND status='draft' ORDER BY version DESC LIMIT 1", [userId]);
  if (!r.rowCount) return false;
  const prev = await q("SELECT started_on FROM plans WHERE user_id=$1 AND started_on IS NOT NULL ORDER BY version LIMIT 1", [userId]);
  await q("UPDATE plans SET status='superseded' WHERE user_id=$1 AND status='approved'", [userId]);
  await q("UPDATE plans SET status='approved', approved_at=now(), approved_by=$2, started_on=COALESCE($3, CURRENT_DATE) WHERE id=$1", [r.rows[0].id, adminId, prev.rows[0]?.started_on || null]);
  return true;
}

/** What changed between two plan versions, for the approval screen. */
export function diffPlans(a, b) {
  if (!a) return { first: true };
  const ka = new Map(a.items.map((i) => [i.key, i])), kb = new Map(b.items.map((i) => [i.key, i]));
  return {
    added: b.items.filter((i) => !ka.has(i.key)).map((i) => i.title),
    removed: a.items.filter((i) => !kb.has(i.key)).map((i) => i.title),
    moved: b.items.filter((i) => ka.has(i.key) && ka.get(i.key).week !== i.week).map((i) => `${i.title}: week ${ka.get(i.key).week} → ${i.week}`),
    focusBefore: a.focus, focusAfter: b.focus,
  };
}

/** The live view of a plan: item status, levels now, readiness, week. */
// The recorded score of a walkthrough, an explain-it or a practice task (first attempt; automatic review unless the KUDO
// Trainer has reviewed it), as 0-100. Null while there is nothing scored yet.
export function stepScore(it, attempts, subs) {
  if (it.kind === 'scenario') { const a = attempts.find((x) => x.module_key === it.module && x.kind === 'scenario' && x.counts !== false); return a ? round((a.correct / a.total) * 100) : null; }
  if (it.kind === 'explain' || it.kind === 'practice') {
    const sb = subs.filter((x) => x.module_key === it.module && (x.kind || 'explain') === it.kind && x.counts !== false && ['auto', 'reviewed'].includes(x.status))[0];
    const v = sb ? explainScore(sb.rubric) : null; return v == null ? null : round(v);
  }
  return null;
}
export function liveState(u, planRow, ctx) {
  const levels = computeLevels(u, ctx);
  const data = planRow.data, target = data.target;
  const attempts = ctx.attempts.get(u.id) || [], prog = new Map((ctx.progress.get(u.id) || []).map((p) => [p.item_key, p]));
  const inputs = ctx.inputs.get(u.id) || [];
  const start = planRow.started_on ? new Date(planRow.started_on) : null;
  // A check or review is complete once its recorded (first) attempt is made; the recorded score is what counts.
  const recorded = (mk, itemKey) => attempts.find((a) => a.module_key === mk && (a.kind || 'check') === 'check' && a.counts !== false && (itemKey ? a.item_key === itemKey : !(a.item_key || '').startsWith('review.')));
  const passed = (mk, itemKey) => !!recorded(mk, itemKey);
  const subs = ctx.subs?.get(u.id) || [];
  const latestLive = ctx.latestRound(u.id, 'live');
  const items = data.items.map((it) => {
    let done = false, how = null;
    if (it.kind === 'check') done = passed(it.module);
    else if (it.kind === 'review') done = passed(it.module, it.key);
    else if (it.kind === 'baseline') done = attempts.some((a) => a.module_key === 'baseline');
    else if (it.kind === 'scenario') done = attempts.some((a) => a.module_key === it.module && a.kind === 'scenario');
    else if (it.kind === 'explain') { const sb = subs.filter((x) => x.module_key === it.module && (x.kind || 'explain') === 'explain' && x.counts !== false)[0]; done = !!sb; const rt = sb?.status === 'reviewed' ? 'reviewed by your KUDO Trainer' : sb?.auto?.rating; how = sb ? (sb.status === 'processing' ? 'Being scored, about a minute' : rt ? `Recorded result: ${rt}` : null) : null; }
    else if (it.kind === 'survey') done = !!ctx.surveys?.has(u.id);
    else if (it.kind === 'one_to_one') { const inp = inputs.find((i) => i.item_key === it.key); done = !!inp || prog.has(it.key); how = inp ? `Logged by your KUDO Trainer on ${new Date(inp.happened_on).toISOString().slice(0, 10)}` : null; }
    else if (it.kind === 'milestone') done = !!(latestLive && data.baseline_round && latestLive.id !== data.baseline_round) || prog.has(it.key);
    else done = prog.has(it.key);
    const p = prog.get(it.key);
    const rec = it.kind === 'check' ? recorded(it.module) : it.kind === 'review' ? recorded(it.module, it.key) : null;
    // Every scored step shows its score as soon as the system has it: no need to wait for the KUDO Trainer.
    const score = rec ? round((rec.correct / rec.total) * 100) : stepScore(it, attempts, subs);
    return { ...it, done, how, note: p?.note || null, signed_off: !!p?.signed_off_at, best: score, recorded: score, below: score != null && score < PASS * 100 };
  });
  const week = start ? clamp(Math.floor((Date.now() - start.getTime()) / (7 * 864e5)) + 1, 1, WEEKS) : 1;
  const mine = items.filter((i) => i.owner === 'you');
  const doneN = items.filter((i) => i.done).length;
  // Pace compares the steps planned before this week with those done; the current week is still open.
  const expected = items.filter((i) => i.week < week).length;
  const doneBy = items.filter((i) => i.week < week && i.done).length;
  const levelRows = SCENARIOS.map((s) => {
    const L = levels.per[s.key]; const tg = data.targets?.[s.key] ?? targetFor(depthOf(s.key), target);
    return { scenario: s.key, label: s.label, short: s.short, now: L.est, baseline: data.baseline?.[s.key]?.v ?? L.baseline, source: L.source, note: L.note, target: tg, projected: Math.max(L.est, data.projected?.[s.key] ?? tg), band: band(L.est, tg), focus: data.focus.includes(s.key), depth: MODULE_BY_KEY[MODULE_FOR_SCENARIO[s.key]]?.depth, history: L.history };
  });
  const avg = (a) => round(a.reduce((x, y) => x + y, 0) / a.length);
  // Readiness week by week since the plan started: each scenario's level at the end of each week (from its history),
  // averaged. Week 0 is the start of the plan; the current week shows today's level.
  const trajectory = [];
  if (start) for (let w = 0; w <= week; w++) {
    const at = w === week ? Date.now() : start.getTime() + w * 7 * 864e5;
    const vals = levelRows.map((l) => {
      if (w === week) return l.now;
      const past = (l.history || []).filter((h) => { const t = new Date(h.at).getTime(); return t >= start.getTime() && t <= at; });
      return past.length ? past[past.length - 1].v : l.baseline;
    });
    trajectory.push({ week: w, v: avg(vals) });
  }
  // Readiness, test by test: the starting point (Self Assessment and knowledge test), then one point each time a
  // result moves a scenario's level, labelled with the module that moved it. This is the real-time view on Home.
  const progression = [{ at: planRow.started_on || null, v: avg(levelRows.map((l) => l.baseline)), what: 'Starting point', changes: [] }];
  {
    const cur = Object.fromEntries(levelRows.map((l) => [l.scenario, l.baseline]));
    const evs = levelRows.flatMap((l) => (l.history || []).filter((x) => x.v != null && (!start || new Date(x.at).getTime() >= start.getTime())).map((x) => ({ ...x, scenario: l.scenario, short: l.short })))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
    let last = null;
    for (const e of evs) {
      const from = cur[e.scenario]; cur[e.scenario] = e.v;
      const same = last && last.module === (e.module || null) && last.what === e.what && Math.abs(new Date(last.at) - new Date(e.at)) < 60000;
      if (!same) { last = { at: e.at, what: e.what, module: e.module || null, moduleTitle: MODULE_BY_KEY[e.module]?.title || null, score: e.score ?? null, changes: [] }; progression.push(last); }
      last.changes.push({ short: e.short, from: round(from), to: round(e.v) });
      last.v = avg(Object.values(cur));
    }
    if (progression.length > 41) progression.splice(1, progression.length - 41);
  }
  return {
    items, week, weeks: WEEKS, started_on: planRow.started_on, trajectory, progression,
    progress: { done: doneN, total: items.length, pct: items.length ? round((doneN / items.length) * 100) : 0, pace: expected ? (doneBy >= expected ? 'on' : doneBy >= expected - 2 ? 'close' : 'behind') : 'on' },
    next: mine.filter((i) => !i.done).slice(0, 3),
    jackNext: items.filter((i) => i.owner === 'jack' && !i.done).slice(0, 2),
    levels: levelRows,
    readiness: { start: avg(levelRows.map((l) => l.baseline)), now: avg(levelRows.map((l) => l.now)), end: avg(levelRows.map((l) => l.projected)), ready: levelRows.filter((l) => l.now >= l.target).length, of: levelRows.length },
    outcomes: Object.entries(DEPTH).map(([k, d]) => ({ depth: k, label: d.label, can: d.can, scenarios: levelRows.filter((l) => l.depth === k).map((l) => l.short) })).filter((o) => o.scenarios.length),
  };
}

export { MODULES, label as scenarioLabel };
