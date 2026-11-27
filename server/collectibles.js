// Collectibles: cards trainees earn at meaningful milestones of their programme.
// Design rules (gamification and motivation review, revised with Nils on 26 Nov 2026):
//  - only "First step" is given at first connection; every other card needs work done in the Academy;
//  - a scenario card needs the scenario at target on the combined assessment (October baseline + Academy tests)
//    AND at least one lesson, test or sandbox exercise on that topic in the Academy;
//  - they reward mastery and real progress, not clicks; there is no leaderboard and no comparison with colleagues;
//  - every locked card says exactly how to earn it; cards never change a score or a level.
// Cards are worked out from existing data each time the trainee opens the app, then stored with the date earned.
import { Router } from 'express';
import { q } from './db.js';
import { SCENARIOS } from './scenarios.js';
import { MODULES, MODULE_BY_KEY } from './curriculum.js';
import { loadContext, liveState, PHASES, targetFor } from './engine.js';
import { SANDBOX } from './sandboxes.js';

const SANDBOX_N = Object.keys(SANDBOX).length;
// Modules that are not one of the 12 scenarios get a Topic card.
const TOPICS = MODULES.filter((m) => !SCENARIOS.some((s) => s.key === m.key));
const SHORT = { foundations: 'Foundations', glossary: 'Glossary', network: 'IT & network', marketplace: 'Marketplace', ringcentral: 'RingCentral' };

// tier: bronze (getting going), silver (real progress), gold (mastery)
export const CATALOG = [
  // Journey: milestones of the 12 weeks
  { key: 'first-step', set: 'Journey', tier: 'bronze', title: 'First step', earn: 'Log in to the KUDO Academy for the first time.', glyph: 'step' },
  { key: 'first-lesson', set: 'Journey', tier: 'bronze', title: 'Off the blocks', earn: 'Complete your first lesson.', glyph: 'flag' },
  ...PHASES.map((p, i) => ({ key: `phase-${p.n}`, set: 'Journey', tier: i === 3 ? 'gold' : 'silver', title: `${p.short} cleared`, earn: `Finish every step of weeks ${p.weeks[0]} to ${p.weeks[1]} (${p.name}) that is yours to do.`, glyph: ['spark', 'build', 'broaden', 'trophy'][i] })),
  { key: 'client-ready', set: 'Journey', tier: 'gold', title: 'Client-ready', earn: 'Complete your mock client call with your KUDO Trainer.', glyph: 'handshake' },
  { key: 'graduate', set: 'Journey', tier: 'gold', title: 'Graduate', earn: 'Take the 3-month retest.', glyph: 'cap' },
  // Scenarios: the 12 client scenarios
  ...SCENARIOS.map((s) => ({ key: `sc-${s.key}`, set: 'Scenarios', tier: 'gold', title: s.short, earn: `Reach your target level on ${s.label} (October assessment and Academy tests combined), with at least one lesson, test or sandbox exercise on it in the Academy.`, glyph: `sc-${s.key}`, scenario: s.key })),
  // Topics: the cross-cutting modules
  ...TOPICS.map((m) => ({ key: `tp-${m.key}`, set: 'Topics', tier: 'silver', title: SHORT[m.key] || m.title, earn: `Reach your target on the ${m.title} module test (first attempt).`, glyph: `tp-${m.key}`, module: m.key })),
  // Hands-on: the sandbox
  { key: 'sbx-first', set: 'Hands-on', tier: 'bronze', title: 'Hands on', earn: 'Finish your first sandbox exercise.', glyph: 'cursor' },
  { key: 'sbx-pass', set: 'Hands-on', tier: 'silver', title: 'Clean run', earn: 'Pass a sandbox exercise (80% or more) on your first run.', glyph: 'check' },
  { key: 'sbx-pace', set: 'Hands-on', tier: 'silver', title: 'Expert pace', earn: 'Pass a sandbox exercise in the expert\'s time or faster.', glyph: 'stopwatch' },
  { key: 'sbx-flawless', set: 'Hands-on', tier: 'gold', title: 'Flawless', earn: 'Score 100% on a sandbox exercise on your first run: no hint, no mistake.', glyph: 'diamond' },
  { key: 'sbx-all', set: 'Hands-on', tier: 'gold', title: 'Sandbox master', earn: `Pass every sandbox exercise in the Academy: the ${SANDBOX_N} live today and each new one as it is added. This card stays yours only while you have passed them all.`, glyph: 'grid', live: true },
  // Craft: work done well
  { key: 'sharp', set: 'Craft', tier: 'silver', title: 'Sharp', earn: 'Pass 5 module tests on your first attempt.', glyph: 'pencil' },
  { key: 'climber', set: 'Craft', tier: 'silver', title: 'Climber', earn: 'Raise one scenario 15 points or more above your October level through Academy tests.', glyph: 'trend' },
  { key: 'best-calls', set: 'Craft', tier: 'silver', title: 'Best calls', earn: 'Make the best call at every step of a decision walkthrough.', glyph: 'compass' },
  { key: 'clear-voice', set: 'Craft', tier: 'silver', title: 'Clear voice', earn: 'Get a Solid result on a recorded or written explanation.', glyph: 'mic' },
  { key: 'self-aware', set: 'Craft', tier: 'silver', title: 'Self-aware', earn: 'Score 80% or more on a check with your certainty well judged.', glyph: 'target' },
  { key: 'comeback', set: 'Craft', tier: 'silver', title: 'Comeback', earn: 'Answer every question right in a spaced review of questions you once missed.', glyph: 'loop' },
  { key: 'teacher', set: 'Craft', tier: 'silver', title: 'Teacher', earn: 'Complete a teach-back with a colleague.', glyph: 'people' },
  { key: 'curious', set: 'Craft', tier: 'gold', title: 'Curious mind', earn: 'Ask a question in a session that your KUDO Trainer adds to the Academy.', glyph: 'bulb' },
  // Habit
  { key: 'regular-3', set: 'Habit', tier: 'bronze', title: 'Regular', earn: 'Be active 3 weeks (weekly challenge). Weeks do not need to be in a row.', glyph: 'cal3' },
  { key: 'regular-6', set: 'Habit', tier: 'silver', title: 'Steady', earn: 'Be active 6 weeks. Weeks do not need to be in a row.', glyph: 'cal6' },
  { key: 'regular-10', set: 'Habit', tier: 'gold', title: 'Committed', earn: 'Be active 10 weeks. Weeks do not need to be in a row.', glyph: 'cal10' },
];
const BY_KEY = new Map(CATALOG.map((c) => [c.key, c]));
const RULES_VERSION = '_rules-v2';
// Cards that follow the rule live (the only exception to "never taken back"): Sandbox master must cover every exercise.
const LIVE_KEYS = CATALOG.filter((c) => c.live).map((c) => c.key); // stored once per trainee when the revised rules are applied

/** Which cards the trainee has earned now, from the data we hold. */
export async function earnedNow(uid) {
  const ctx = await loadContext(uid);
  const u = ctx.users.find((x) => x.id === uid); if (!u) return [];
  const got = new Set(['first-step']); // being here is the first connection
  const plan = (await q("SELECT version,status,data,started_on FROM plans WHERE user_id=$1 AND status='approved' ORDER BY version DESC LIMIT 1", [uid])).rows[0];
  const attempts = (ctx.attempts.get(uid) || []).filter((a) => a.module_key !== 'baseline');
  const progress = ctx.progress.get(uid) || [];
  const subs = ctx.subs?.get(uid) || [];
  const runs = (await q('SELECT scenario,score,record,seconds,result FROM sandbox_runs WHERE user_id=$1', [uid])).rows;

  // Work done in the Academy on a module: a lesson or step marked done, a test, a recording, a sandbox exercise.
  const touched = (mk) => progress.some((p) => String(p.item_key).startsWith(`${mk}.`)) || attempts.some((a) => a.module_key === mk)
    || subs.some((s) => s.module_key === mk) || runs.some((r) => SANDBOX[r.scenario] === mk);
  const firstCheck = (mk) => attempts.find((a) => a.module_key === mk && (a.kind || 'check') === 'check' && a.counts !== false && !(a.item_key || '').startsWith('review.'));
  const pct = (a) => (a && Number(a.total) > 0 ? (Number(a.correct) / Number(a.total)) * 100 : null);
  const target = plan?.data?.target ?? 80;

  if (progress.some((p) => String(p.item_key).endsWith('.lesson'))) got.add('first-lesson');
  if (plan) {
    const st = liveState(u, plan, ctx);
    for (const p of PHASES) { const mine = st.items.filter((i) => i.phase === p.n && (i.owner || 'you') === 'you'); if (mine.length && mine.every((i) => i.done)) got.add(`phase-${p.n}`); }
    if (st.items.some((i) => i.key === 'mock' && i.done)) got.add('client-ready');
    if (st.items.some((i) => i.key === 'retest' && i.done)) got.add('graduate');
    for (const l of st.levels) {
      if (l.now >= l.target && touched(l.scenario)) got.add(`sc-${l.scenario}`);
      if (l.baseline != null && l.now - l.baseline >= 15 && attempts.some((a) => a.module_key === l.scenario)) got.add('climber');
    }
    if (st.items.some((i) => i.kind === 'teach' && i.done)) got.add('teacher');
  }
  for (const m of TOPICS) { const s = pct(firstCheck(m.key)); if (s != null && s >= targetFor(MODULE_BY_KEY[m.key].depth, target)) got.add(`tp-${m.key}`); }

  // Hands-on
  const records = runs.filter((r) => r.record);
  if (runs.length) got.add('sbx-first');
  if (records.some((r) => r.score >= 80)) got.add('sbx-pass');
  if (runs.some((r) => r.score >= 80 && r.result?.expert > 0 && Number(r.seconds) <= r.result.expert)) got.add('sbx-pace');
  if (records.some((r) => r.score >= 100 && !Number(r.result?.hints) && !(r.result?.traps || []).length)) got.add('sbx-flawless');
  if (Object.keys(SANDBOX).every((k) => runs.some((r) => r.scenario === k && r.score >= 80))) got.add('sbx-all');

  // Craft
  const passedFirst = MODULES.filter((m) => { const s = pct(firstCheck(m.key)); return s != null && s >= 80; }).length;
  if (passedFirst >= 5) got.add('sharp');
  if (attempts.some((a) => a.kind === 'scenario' && Number(a.correct) >= Number(a.total) && Number(a.total) > 0)) got.add('best-calls');
  if (subs.some((s) => (s.status === 'reviewed' ? avgRubric(s.rubric) >= 2.5 : s.auto?.rating === 'solid'))) got.add('clear-voice');
  if ((await q("SELECT 1 FROM quiz_attempts WHERE user_id=$1 AND kind='check' AND cbm >= 2 AND correct >= 0.8 * total LIMIT 1", [uid])).rowCount) got.add('self-aware');
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

/** Store newly earned cards and return the full collection. Cards are never taken back, except once, when the
 *  revised rules (v2) replaced the first set: cards given under the old rules that the new rules do not grant are
 *  removed then, so everyone starts the programme with "First step" only. */
export async function syncCollection(uid) {
  const now = await earnedNow(uid);
  const migrated = (await q('SELECT 1 FROM collectibles WHERE user_id=$1 AND key=$2', [uid, RULES_VERSION])).rowCount;
  if (!migrated) {
    await q('DELETE FROM collectibles WHERE user_id=$1 AND NOT (key = ANY($2))', [uid, now]);
    await q('INSERT INTO collectibles (user_id,key,seen_at) VALUES ($1,$2,now()) ON CONFLICT DO NOTHING', [uid, RULES_VERSION]);
  }
  for (const k of now) await q('INSERT INTO collectibles (user_id,key) VALUES ($1,$2) ON CONFLICT DO NOTHING', [uid, k]);
  const lapsed = LIVE_KEYS.filter((k) => !now.includes(k));
  if (lapsed.length) await q('DELETE FROM collectibles WHERE user_id=$1 AND key = ANY($2)', [uid, lapsed]);
  const passedSbx = (await q('SELECT count(DISTINCT scenario)::int n FROM sandbox_runs WHERE user_id=$1 AND score >= 80 AND scenario = ANY($2)', [uid, Object.keys(SANDBOX)])).rows[0].n;
  const rows = (await q('SELECT key,earned_at,seen_at,bragged_at FROM collectibles WHERE user_id=$1', [uid])).rows;
  const mine = new Map(rows.map((r) => [r.key, r]));
  return CATALOG.map((c) => ({ ...c, progress: c.key === 'sbx-all' ? `${passedSbx} of ${SANDBOX_N} passed` : null, earned: mine.has(c.key), earned_at: mine.get(c.key)?.earned_at || null, bragged: !!mine.get(c.key)?.bragged_at, isNew: mine.has(c.key) && !mine.get(c.key).seen_at }));
}

// ---- Rarity: the share of real trainees (active, not test accounts) who hold each card. Anonymous counts only:
// nobody sees who has a card, only how rare it is.
export async function rarityCounts() {
  const who = "u.active AND NOT u.is_demo AND (u.role = 'trainee' OR u.is_trainee)";
  const total = (await q(`SELECT count(*)::int n FROM users u WHERE ${who}`)).rows[0].n;
  const rows = (await q(`SELECT c.key, count(*)::int n FROM collectibles c JOIN users u ON u.id = c.user_id WHERE ${who} AND c.key NOT LIKE '\\_%' GROUP BY c.key`)).rows;
  return { total, by: new Map(rows.map((r) => [r.key, r.n])) };
}
export function rarityOf(n, total) {
  if (!total) return null;
  const pct = (n / total) * 100;
  const label = n === 0 ? 'Unclaimed' : pct <= 5 ? 'Legendary' : pct <= 15 ? 'Epic' : pct <= 35 ? 'Rare' : pct <= 65 ? 'Uncommon' : 'Common';
  return { n, total, pct: n && pct < 1 ? 1 : Math.round(pct), label };
}
const withRarity = (cards, r) => cards.map((c) => ({ ...c, rarity: rarityOf(r.by.get(c.key) || 0, r.total) }));

export const collectiblesRouter = Router();
collectiblesRouter.get('/collectibles', async (req, res, next) => {
  try {
    const cards = withRarity(await syncCollection(req.user.id), await rarityCounts());
    res.json({ cards, earned: cards.filter((c) => c.earned).length, total: cards.length, brag: bragOn(req) });
  } catch (e) { next(e); }
});
collectiblesRouter.post('/collectibles/seen', async (req, res, next) => {
  try { await q('UPDATE collectibles SET seen_at=now() WHERE user_id=$1 AND seen_at IS NULL', [req.user.id]); res.json({ ok: true }); } catch (e) { next(e); }
});

// ---- Brag to the team: a trainee posts one earned card to the team's Slack channel, once per card.
// SLACK_WEBHOOK_URL (a Slack incoming webhook, added by the owner in Railway) turns it on; SLACK_CHANNEL_NAME only
// labels the button. Test accounts and admins stepping into a test trainee never post.
const TIER_LABEL = { bronze: ['Bronze', ':3rd_place_medal:'], silver: ['Silver', ':2nd_place_medal:'], gold: ['Gold', ':1st_place_medal:'] };
export const BRAG_LINES = [
  (n, c) => `Breaking news from the KUDO Academy: *${n}* just earned *${c}*. Autographs available on request.`,
  (n, c) => `Not to brag, but *${n}* is bragging: *${c}* is now in their collection.`,
  (n, c) => `Quick interruption to your day: *${n}* unlocked *${c}* in the KUDO Academy. You may now return to your meetings.`,
  (n, c) => `*${n}* just pulled *${c}* from the KUDO Academy deck. Please form an orderly queue to say well done.`,
  (n, c) => `Sound the airhorn :mega: *${n}* unlocked *${c}*. The rest of you have been warned.`,
  (n, c) => `*${n}* added *${c}* to their collection. Too early to call them a KUDO Champion? Probably. Are they acting like one anyway? Yes.`,
];
const slackEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const webhook = () => { const u = String(process.env.SLACK_WEBHOOK_URL || '').trim(); return /^https:\/\/hooks\.slack\.com\/services\/[\w/-]+$/.test(u) ? u : null; };
function bragOn(req) {
  const ok = !!webhook() && !req.user.is_demo && !req.realAdmin;
  return ok ? { on: true, channel: process.env.SLACK_CHANNEL_NAME || null, lines: BRAG_LINES.length } : { on: false };
}
function academyUrl() {
  const u = process.env.ACADEMY_URL || 'https://academy.kudo.ai';
  return /^https:\/\//.test(u) ? u.replace(/\/$/, '') : null;
}
export function bragMessage(user, card, { line = 0, note = '', earned = 0, total = CATALOG.length, rarity = null } = {}) {
  const first = slackEsc(String(user.name || '').trim().split(/\s+/)[0] || 'Someone');
  const [tier, medal] = TIER_LABEL[card.tier] || ['', ':star:'];
  const title = slackEsc(`${card.title}${tier ? ` (${tier})` : ''}`);
  const head = `${medal} ${BRAG_LINES[((Number(line) % BRAG_LINES.length) + BRAG_LINES.length) % BRAG_LINES.length](first, title)}`;
  const say = String(note || '').replace(/\s+/g, ' ').trim().slice(0, 140);
  const rare = rarity && rarity.n && rarity.pct <= 35 ? `  |  ${rarity.label}: only ${rarity.pct}% of trainees have it` : '';
  const ctx = `Earned for: ${slackEsc(card.earn)}  |  ${earned} of ${total} cards collected${rare}`;
  const url = academyUrl();
  const blocks = [{ type: 'section', text: { type: 'mrkdwn', text: head } }];
  if (say) blocks.push({ type: 'section', text: { type: 'mrkdwn', text: `> ${slackEsc(say)}` } });
  blocks.push({ type: 'context', elements: [{ type: 'mrkdwn', text: url ? `${ctx}  |  <${url}|Open the KUDO Academy>` : ctx }] });
  const plain = [head, say ? `"${slackEsc(say)}"` : null, ctx].filter(Boolean).join('\n');
  return { text: plain.replace(/:[a-z0-9_]+: ?/g, '').replace(/\*/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'), payload: { text: plain, blocks, unfurl_links: false } };
}
export const slack = { post: async (url, payload) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`Slack answered ${r.status}`);
} };
async function bragCard(req) {
  const cards = await syncCollection(req.user.id);
  const card = cards.find((c) => c.key === req.params.key);
  if (!card || !card.earned) return { err: [404, 'You have not earned that card yet.'] };
  if (card.bragged) return { err: [409, 'You already bragged about this card. Once is classy.'] };
  const r = await rarityCounts();
  return { card, earned: cards.filter((c) => c.earned).length, total: cards.length, rarity: rarityOf(r.by.get(card.key) || 0, r.total) };
}
collectiblesRouter.get('/collectibles/:key/brag', async (req, res, next) => {
  try {
    if (!bragOn(req).on) return res.status(409).json({ error: 'Sharing to Slack is not switched on.' });
    const b = await bragCard(req); if (b.err) return res.status(b.err[0]).json({ error: b.err[1] });
    res.json({ preview: bragMessage(req.user, b.card, { line: req.query.line, note: req.query.note, earned: b.earned, total: b.total, rarity: b.rarity }).text });
  } catch (e) { next(e); }
});
collectiblesRouter.post('/collectibles/:key/brag', async (req, res, next) => {
  try {
    if (!bragOn(req).on) return res.status(409).json({ error: 'Sharing to Slack is not switched on.' });
    const b = await bragCard(req); if (b.err) return res.status(b.err[0]).json({ error: b.err[1] });
    // Claim the brag first so a double click cannot post twice; give it back if Slack refuses.
    const claim = await q('UPDATE collectibles SET bragged_at=now() WHERE user_id=$1 AND key=$2 AND bragged_at IS NULL', [req.user.id, b.card.key]);
    if (!claim.rowCount) return res.status(409).json({ error: 'You already bragged about this card. Once is classy.' });
    const m = bragMessage(req.user, b.card, { line: req.body?.line, note: req.body?.note, earned: b.earned, total: b.total, rarity: b.rarity });
    try { await slack.post(webhook(), m.payload); } catch {
      await q('UPDATE collectibles SET bragged_at=NULL WHERE user_id=$1 AND key=$2', [req.user.id, b.card.key]);
      return res.status(502).json({ error: 'Slack did not take the message. Try again in a minute.' });
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});
