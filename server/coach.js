// Virtual coach: trainees ask about the tool, their programme and their performance.
// Every answer comes from the trainee's own data (programme, levels, tests, sandbox runs, sessions) and from the
// fixed description of how the Academy works below. Two modes:
//  - built in (always on): recognises the common questions and answers from the data, with links;
//  - free-form with Claude, only when ANTHROPIC_API_KEY is set (added by the owner in Railway, never in the repo):
//    the same data and rules go to the model, which must answer from them alone. If the call fails, the built-in
//    answer is used.
// Questions are not stored. Only the trainee's own data is ever loaded.
import { Router } from 'express';
import { q } from './db.js';
import { programmeFor, progressFor } from './programme.js';
import { PHASES, PASS, targetFor } from './engine.js';
import { MODULE_BY_KEY } from './curriculum.js';
import { SANDBOX } from './sandboxes.js';

export const coachRouter = Router();

// ------------------------------------------------------------------ how the Academy works (shared by both modes)
export const KNOWLEDGE = `
PAGES
- Home: the programme at a glance: your goal, progress, readiness, focus areas, your 12 weeks, your level per scenario, notes from your KUDO Trainer, your cards. The "Continue my training" button opens My training.
- My training: where you work. This week's steps first (with the weekly challenge), why your three focus areas, review practice, then your plan week by week. "Coming up with your KUDO Trainer" lists your next sessions.
- Each module has three steps. Step 1 Learn: the lesson as a short story on slides (or One page). Step 2 Practise: the sandbox (a replica of the KUDO screens and of the client's tools) or a written or recorded task. Step 3 Prove it: the module check.
- My results: every test, the sandbox exercises, untaken modules folded away.
- My progress: how each test moved your level, scenario by scenario, against where you started.
- My collection: your cards.
- Guided tour (menu): the walk-through, any time.

THE PROGRAMME
- 12 weeks, self-paced within each week, in four phases: Warm-up (weeks 1-2: baseline, foundations, kick-off), Build (weeks 3-7: your focus scenarios in depth), Broaden (weeks 8-10: the other scenarios, cross-cutting topics and spaced reviews), Prove it (weeks 11-12: a mock client call with your KUDO Trainer and the retest).
- Three focus areas are picked from your results, your clients and the team priorities. You can ask to swap the third one; your KUDO Trainer approves the change.
- Sessions with your KUDO Trainer (kick-off, coaching 1:1 on your biggest gap, mid-point check-in, mock client call) are planned for a given week. Your KUDO Trainer books the exact time with you in that week. If several kick-offs or check-ins fall due together, your KUDO Trainer may run one group session instead.
- Group sessions, when your KUDO Trainer schedules them, appear with their date, time and topic.

HOW YOU ARE SCORED
- Module check (Step 3): mixed formats; the pass mark is 80%. Your first attempt is your result of record; retakes are practice and never change it. You also say how sure you are of each answer.
- Your level per scenario is an estimate that starts from the October Self Assessment and live knowledge test, and moves only with tests: the first attempt of each module check, decision walkthrough and explain-it recording (a review by your KUDO Trainer replaces the automatic score). Lessons, practice and retakes never move it. Small moves within the estimate's range do not change your plan.
- Targets depend on what your role needs on that scenario: Set up 80%, Hand over 70%, Know 60%. Bands: Ready (at target), Nearly there (within 10 points), Developing (50 or more), Gap (below 50).
- Explain-it recordings and written practice are reviewed automatically within a minute (key points covered, clarity, whether you said when to hand over); your KUDO Trainer spot-checks some, and you can ask for a human review.
- Sandbox exercises: outcome 70%, path 20% (detours, mistakes, hints), time 10%; exercises that start with a client call score outcome 45%, client call 20%, solution 15%, path 10%, time 10%. Pass mark 80%; your first run is your result of record. Sandbox runs do not move your level for now.
- The weekly challenge (four mixed questions, two minutes) and spaced reviews keep things fresh and never change your score.
- Cards: First step comes at your first connection; the others are earned by work in the Academy (scenario cards need your target on the combined assessment plus a lesson or test on that topic).
`.trim();

// ------------------------------------------------------------------ the trainee's own data
const MON = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const ymd = (d) => new Date(d).toISOString().slice(0, 10);
const nice = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Brussels' });
const niceShort = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/Brussels' });
const hrefFor = (it) => (it.module ? `#module-${it.module}` : '#training');

export async function coachContext(uid, now = new Date()) {
  const p = await programmeFor(uid);
  const prog = await progressFor(uid).catch(() => null);
  const st = p.state || null;
  const start = st?.started_on ? new Date(new Date(st.started_on).getTime() + 12 * 3600e3) : null; // the local day the plan started
  const weekRange = (w) => (start ? { from: new Date(start.getTime() + (w - 1) * 7 * 864e5), to: new Date(start.getTime() + ((w - 1) * 7 + 6) * 864e5) } : null);
  const items = (st?.items || []).map((it) => { const r = weekRange(it.week); return { key: it.key, title: it.title, kind: it.kind, week: it.week, owner: it.owner || 'you', done: !!it.done, minutes: it.minutes, module: it.module || null, why: it.why || null, from: r?.from || null, to: r?.to || null }; });
  const sandbox = (await q('SELECT scenario,score,record,created_at FROM sandbox_runs WHERE user_id=$1 ORDER BY created_at', [uid])).rows;
  const groups = (await q('SELECT title,topic,starts_at,minutes,link FROM group_sessions WHERE starts_at >= $1 ORDER BY starts_at LIMIT 5', [new Date(now.getTime() - 3600e3)])).rows;
  const cards = (await q('SELECT count(*)::int n FROM collectibles WHERE user_id=$1', [uid])).rows[0]?.n || 0;
  return {
    today: now, name: (p.user?.name || '').split(' ')[0], status: p.status, goal: p.settings?.goal, message: p.message || null,
    week: st?.week || null, weeks: st?.weeks || 12, start, progress: st?.progress || null, readiness: st?.readiness || null, trajectory: st?.trajectory || [],
    focus: (p.plan?.focus || []).map((s) => ({ scenario: s, reason: p.plan?.focusReasons?.[s] || null, level: st?.levels?.find((l) => l.scenario === s) || null })),
    levels: (st?.levels || []).map((l) => ({ scenario: l.scenario, label: l.short || l.label, now: l.now, start: l.baseline, target: l.target, band: l.band?.label, focus: !!l.focus })),
    items, sandbox, groups, cards,
    feed: (prog?.feed || []).map((f) => ({ at: f.at, what: f.moduleTitle, kind: f.kind, scenario: f.short, score: f.score, from: f.from, to: f.to })),
    attempts: (prog?.attempts || []).map((a) => ({ at: a.at, kind: a.kind, module: a.moduleTitle, pct: a.pct, record: a.record })),
  };
}

// ------------------------------------------------------------------ built-in answers
const has = (t, re) => re.test(t);
const bullets = (arr) => arr.map((x) => `- ${x}`).join('\n');
const range = (r) => (r ? `${niceShort(r.from)} to ${niceShort(r.to)}` : '');

function monthsIn(t, today) {
  const found = [];
  for (const [i, m] of MON.entries()) { const re = new RegExp(`\\b(${m}|${m.slice(0, 3)})\\b`, 'i'); const at = t.search(re); if (at >= 0) found.push({ i, at }); }
  found.sort((a, b) => a.at - b.at);
  const y = today.getFullYear();
  const monthDate = (i, end) => { let yr = y; if (i > today.getMonth()) yr -= 1; return end ? new Date(Date.UTC(yr, i + 1, 0, 23, 59)) : new Date(Date.UTC(yr, i, 1)); };
  if (found.length >= 2) return { from: monthDate(found[0].i), to: monthDate(found[found.length - 1].i, true), label: `${MON[found[0].i][0].toUpperCase() + MON[found[0].i].slice(1)} to ${MON[found.at(-1).i][0].toUpperCase() + MON[found.at(-1).i].slice(1)}` };
  if (found.length === 1) return { from: monthDate(found[0].i), to: monthDate(found[0].i, true), label: MON[found[0].i][0].toUpperCase() + MON[found[0].i].slice(1) };
  if (/last month/i.test(t)) { const d = new Date(Date.UTC(y, today.getMonth() - 1, 1)); return { from: d, to: new Date(Date.UTC(y, today.getMonth(), 0, 23, 59)), label: 'last month' }; }
  if (/this month/i.test(t)) return { from: new Date(Date.UTC(y, today.getMonth(), 1)), to: today, label: 'this month' };
  return null;
}

const INTENTS = [
  { key: 'group', re: /\bgroup\b|team session|workshop|everyone together|all trainees/i },
  { key: 'session', re: /1[:\s-]?(on|to)?[:\s-]?1|one[- ]to[- ]one|\bsession|coaching|check-?in|kick-?off|mock (client )?call|meet (with )?(my )?(coach|trainer|jack)|\bmeeting with\b|book(ed)? .*(trainer|coach)/i },
  { key: 'progress', re: /progress|progression|improv|evolv|from \w+ to \w+|between \w+ and \w+|since|how am i doing|how have i done|so far/i },
  { key: 'score', re: /scor|evaluat|grade|graded|marked|pass mark|result of record|how .*(level|calculated|measured)|\btarget|band/i },
  { key: 'next', re: /what'?s next|what is next|next step|what (should|do|shall) i do|to ?do|this week|what now|\bdue\b|where do i start|continue/i },
  { key: 'focus', re: /focus|why (is|am|do)|why this|why these/i },
  { key: 'weak', re: /weak|gap|strong|best|worst|ready on|results?\b|how did i do/i },
  { key: 'sandbox', re: /sandbox|exercise|replica|simulat/i },
  { key: 'cards', re: /card|collection|badge/i },
  { key: 'where', re: /where (can|do|is|are)|find|how do i (open|get|see)|navigate|which page/i },
];

export function builtInAnswer(question, c) {
  const t = String(question || '').toLowerCase();
  const intent = INTENTS.find((x) => has(t, x.re))?.key || 'help';
  const links = [];
  if (c.status !== 'approved' && ['next', 'session', 'focus', 'progress'].includes(intent)) {
    return { intent, text: 'Your programme is being finalised: your KUDO Trainer is reviewing the plan built from your results. Once it is approved, I can tell you what is next, when your sessions are and how you are progressing. Meanwhile, your results are under My results.', links: [{ label: 'My results', href: '#results' }] };
  }
  const mine = c.items.filter((i) => i.owner === 'you');
  const trainer = c.items.filter((i) => i.owner !== 'you' && !i.done).sort((a, b) => a.week - b.week);

  if (intent === 'next') {
    const due = mine.filter((i) => !i.done && i.week <= c.week).sort((a, b) => a.week - b.week);
    const list = (due.length ? due : mine.filter((i) => !i.done).sort((a, b) => a.week - b.week)).slice(0, 4);
    if (!list.length) return { intent, text: 'Everything on your side is done. Well done. Your KUDO Trainer has the last sessions.', links: [{ label: 'My training', href: '#training' }] };
    list.forEach((i) => links.push({ label: i.title, href: hrefFor(i) }));
    return { intent, links, text: `You are in week ${c.week} of ${c.weeks}. ${due.length ? `Due now (${due.length} step${due.length > 1 ? 's' : ''}):` : 'You are ahead of your plan. Next up:'}\n${bullets(list.map((i) => `${i.title} · about ${i.minutes} min${i.week < c.week ? ` (from week ${i.week})` : ''}`))}${trainer[0] ? `\n\nNext with your KUDO Trainer: ${trainer[0].title}, planned in week ${trainer[0].week} (${range(trainer[0])}).` : ''}` };
  }

  if (intent === 'group') {
    if (!c.groups.length) return { intent, text: 'No group session is scheduled yet. When your KUDO Trainer schedules one, it appears here and on My training with its date, time and topic. If several kick-offs or check-ins fall due together, your KUDO Trainer may run one group session instead of separate ones.', links: [{ label: 'My training', href: '#training' }] };
    const g = c.groups[0];
    if (g.link) links.push({ label: 'Join link', href: g.link });
    return { intent, links, text: `The next group session is "${g.title}" on ${nice(g.starts_at)} at ${new Date(g.starts_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' })} (Brussels time), ${g.minutes} minutes.${g.topic ? `\nTopic: ${g.topic}` : ''}${c.groups.length > 1 ? `\n\nAfter that:\n${bullets(c.groups.slice(1).map((x) => `${niceShort(x.starts_at)}: ${x.title}`))}` : ''}` };
  }

  if (intent === 'session') {
    if (!trainer.length) return { intent, text: 'All your sessions with your KUDO Trainer are done or none are left in your plan.', links: [{ label: 'My training', href: '#training' }] };
    const n = trainer[0];
    links.push({ label: 'My training', href: '#training' });
    return { intent, links, text: `Your next session is "${n.title}", planned in week ${n.week} (${range(n)}).${n.why ? ` ${n.why}` : ''}\n\nHow it is scheduled: your plan sets the week, and your KUDO Trainer books the exact time with you during that week. You find it on My training, under "Coming up with your KUDO Trainer", and on Home in your 12 weeks.${trainer.length > 1 ? `\n\nAfter that:\n${bullets(trainer.slice(1, 4).map((x) => `${x.title}: week ${x.week} (${range(x)})`))}` : ''}${c.groups.length ? `\n\nThere is also a group session on ${niceShort(c.groups[0].starts_at)}: ${c.groups[0].title}.` : ''}` };
  }

  if (intent === 'progress') {
    const win = monthsIn(t, c.today);
    const r = c.readiness;
    if (!win) {
      const changes = c.feed.slice(0, 4);
      return { intent, links: [{ label: 'My progress', href: '#progress' }], text: `Your readiness across the 12 scenarios: ${r ? `${r.start}% when you started, ${r.now}% now, and your plan takes you to ${r.end}%.` : 'not available yet.'}${c.progress ? ` You have done ${c.progress.done} of ${c.progress.total} steps.` : ''}${changes.length ? `\n\nLatest changes to your level:\n${bullets(changes.map((f) => `${niceShort(f.at)}, ${f.what}: ${f.scenario} ${f.from}% → ${f.to}%`))}` : '\n\nYour level has not moved yet: only tests move it (module checks, decision walkthroughs, explain-it recordings).'}` };
    }
    const inWin = (d) => new Date(d) >= win.from && new Date(d) <= win.to;
    if (c.start && win.to < c.start) return { intent, links: [{ label: 'My results', href: '#results' }], text: `Your programme started on ${nice(c.start)}, so there is no Academy activity for ${win.label}. Your starting point comes from the October Self Assessment and live knowledge test, on My results.` };
    const ch = c.feed.filter((f) => inWin(f.at)), tests = c.attempts.filter((a) => inWin(a.at) && a.record), runs = c.sandbox.filter((s) => inWin(s.created_at) && s.record);
    const atDate = (d) => { if (!c.start) return null; const w = Math.max(0, Math.floor((new Date(d) - c.start) / (7 * 864e5)) + 1); const pts = c.trajectory.filter((x) => x.week <= w); return pts.length ? pts.at(-1).v : null; };
    const a = atDate(win.from < c.start ? c.start : win.from), b = atDate(win.to > c.today ? c.today : win.to);
    if (!ch.length && !tests.length && !runs.length) return { intent, links: [{ label: 'My progress', href: '#progress' }], text: `No tests or level changes for ${win.label}${c.start && win.from < c.start ? ` (your programme started on ${nice(c.start)})` : ''}. ${r ? `Overall readiness is ${r.now}% now (${r.start}% at the start).` : ''}` };
    links.push({ label: 'My progress', href: '#progress' });
    return { intent, links, text: `Your progress for ${win.label}:${a != null && b != null ? `\n- Readiness: ${a}% → ${b}%` : ''}${tests.length ? `\n- Tests taken: ${tests.length}${tests.filter((x) => x.pct != null).length ? `, average ${Math.round(tests.filter((x) => x.pct != null).reduce((s, x) => s + x.pct, 0) / tests.filter((x) => x.pct != null).length)}%` : ''}` : ''}${runs.length ? `\n- Sandbox exercises: ${runs.length}, average ${Math.round(runs.reduce((s, x) => s + x.score, 0) / runs.length)}%` : ''}${ch.length ? `\n\nWhat moved your level:\n${bullets(ch.map((f) => `${niceShort(f.at)}, ${f.what}: ${f.scenario} ${f.from}% → ${f.to}%`))}` : ''}` };
  }

  if (intent === 'score') {
    const f = c.focus.map((x) => x.level).filter(Boolean);
    return { intent, links: [{ label: 'My progress', href: '#progress' }, { label: 'My results', href: '#results' }], text: `Module checks: the pass mark is ${Math.round(PASS * 100)}%, and your first attempt is your result of record; retakes are practice.\n\nYour level per scenario starts from the October assessment and moves only with tests: the first attempt of each module check, decision walkthrough and explain-it recording (a review by your KUDO Trainer replaces the automatic score). Lessons, practice, retakes, the weekly challenge and spaced reviews never change it.\n\nTargets depend on what your role needs: Set up 80%, Hand over 70%, Know 60%.${f.length ? ` For your focus areas: ${f.map((l) => `${l.short} ${l.now}% (target ${l.target}%)`).join(', ')}.` : ''}\n\nSandbox exercises score outcome, path and time (plus the client call and your choice when there is one); 80% passes, first run counts. They do not move your level for now.` };
  }

  if (intent === 'focus') {
    if (!c.focus.length) return { intent, text: 'You are already at target on every scenario: your plan keeps it sharp and proves it.', links: [{ label: 'My training', href: '#training' }] };
    const named = c.focus.find((x) => x.level && t.includes(String(x.level.short || '').toLowerCase().replace(/\.$/, '')));
    if (named) return { intent, links: [{ label: 'My training', href: '#training' }], text: `${named.level.label} is a focus area${named.reason ? ` because ${named.reason}` : ''}. You are at ${named.level.now}%, and your target is ${named.level.target}%.` };
    return { intent, links: [{ label: 'My training', href: '#training' }], text: `Your three focus areas:\n${bullets(c.focus.map((x) => `${x.level?.label || x.scenario}: ${x.level ? `${x.level.now}% → target ${x.level.target}%` : ''}${x.reason ? `, because ${x.reason}` : ''}`))}\n\nYou can ask to swap the third one on My training; your KUDO Trainer approves the change.` };
  }

  if (intent === 'weak') {
    const sorted = [...c.levels].sort((a, b) => (a.now - a.target) - (b.now - b.target));
    const ready = c.levels.filter((l) => l.now >= l.target);
    return { intent, links: [{ label: 'My results', href: '#results' }, { label: 'My progress', href: '#progress' }], text: `Biggest gaps to your target:\n${bullets(sorted.slice(0, 3).map((l) => `${l.label}: ${l.now}% (target ${l.target}%, ${l.band})`))}${ready.length ? `\n\nAt target: ${ready.map((l) => l.label.replace(/\.$/, '')).join(', ')}.` : ''}${c.attempts.filter((a) => a.record).length ? `\n\nTests of record so far: ${c.attempts.filter((a) => a.record).length}.` : ''}` };
  }

  if (intent === 'sandbox') {
    const passed = new Set(c.sandbox.filter((s) => s.record && s.score >= 80).map((s) => s.scenario));
    const all = Object.keys(SANDBOX);
    return { intent, links: [{ label: 'My results', href: '#results' }], text: `Sandbox exercises are hands-on tasks on a replica of the KUDO screens and of the client's own tools, inside the lessons (Step 2). You have passed ${passed.size} of ${all.length}.${all.filter((k) => !passed.has(k)).length ? `\n\nStill to pass: ${all.filter((k) => !passed.has(k)).map((k) => MODULE_BY_KEY[SANDBOX[k]]?.title || k).join('; ')}.` : ''}\n\nScoring: outcome, path and time (plus the client call and your choice when there is one). 80% passes; your first run counts.` };
  }

  if (intent === 'cards') return { intent, links: [{ label: 'My collection', href: '#collection' }], text: `You have ${c.cards} card${c.cards === 1 ? '' : 's'}. First step comes at your first connection; the others are earned by work in the Academy, for example reaching your target on a scenario after a lesson or test on it, or passing sandbox exercises.` };

  if (intent === 'where') {
    return { intent, links: [{ label: 'Home', href: '#programme' }, { label: 'My training', href: '#training' }, { label: 'My results', href: '#results' }, { label: 'My progress', href: '#progress' }], text: 'Where things are:\n- Home: your programme at a glance, with "Continue my training".\n- My training: this week\'s steps, the weekly challenge, your focus areas, your plan week by week, and your next sessions with your KUDO Trainer.\n- Each lesson: Step 1 Learn (slides), Step 2 Practise (sandbox or task), Step 3 Prove it (the check).\n- My results: every test and sandbox exercise.\n- My progress: how each test moved your level.\n- My collection: your cards. The Guided tour is in the menu.' };
  }

  return { intent: 'help', links: [], text: 'I can help with your programme, your results and how the Academy works. Try one of the questions below.' };
}

// ------------------------------------------------------------------ free-form with Claude (optional)
const fmtCtx = (c) => JSON.stringify({
  today: ymd(c.today), first_name: c.name, programme_status: c.status, goal: c.goal, message_from_trainer: c.message,
  week: c.week, weeks: c.weeks, started_on: c.start ? ymd(c.start) : null, steps: c.progress, readiness: c.readiness,
  readiness_by_week: c.trajectory, focus: c.focus.map((f) => ({ scenario: f.level?.label || f.scenario, reason: f.reason })),
  levels: c.levels, plan: c.items.map((i) => ({ title: i.title, kind: i.kind, owner: i.owner === 'you' ? 'you' : 'KUDO Trainer', week: i.week, dates: i.from ? `${ymd(i.from)} to ${ymd(i.to)}` : null, done: i.done, minutes: i.minutes, link: hrefFor(i) })),
  level_changes: c.feed.map((f) => ({ ...f, at: ymd(f.at) })), tests: c.attempts.map((a) => ({ ...a, at: ymd(a.at) })),
  sandbox_runs: c.sandbox.map((s) => ({ exercise: s.scenario, score: s.score, first_run: s.record, at: ymd(s.created_at) })),
  group_sessions: c.groups.map((g) => ({ title: g.title, topic: g.topic, starts_at: new Date(g.starts_at).toISOString(), minutes: g.minutes, link: g.link })), cards: c.cards,
});

const SYSTEM = (c) => `You are the virtual coach in the KUDO Academy, a 12-week training programme for KUDO's client-facing staff. You speak to ${c.name || 'the trainee'}.
Answer ONLY from the trainee's data and the description of the Academy below. If the answer is not there, say you do not know and suggest asking their KUDO Trainer; never guess dates, scores, rules or product facts. Do not teach KUDO product content beyond pointing to the right lesson.
Be brief and warm: two to six short lines, plain English, "you". Use "- " bullets for lists. Dates as "Mon 7 Dec". Always write KUDO in capitals. Link to pages with markdown links whose target starts with "#" (for example [My training](#training), [the lesson](#module-rtmp)); no other links except a group session's join link.
The coach role ("your KUDO Trainer") is a person; you are not them.

HOW THE ACADEMY WORKS
${KNOWLEDGE}

THE TRAINEE'S DATA (JSON)
${fmtCtx(c)}`;

async function claudeAnswer(history, question, c) {
  const key = process.env.ANTHROPIC_API_KEY; if (!key) return null;
  const messages = [...history.slice(-8).map((m) => ({ role: m.role === 'coach' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 2000) })), { role: 'user', content: String(question).slice(0, 2000) }];
  while (messages.length && messages[0].role !== 'user') messages.shift();
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: process.env.COACH_MODEL || 'claude-sonnet-5-5', max_tokens: 600, system: SYSTEM(c), messages }),
    signal: AbortSignal.timeout(25000),
  });
  if (!r.ok) throw new Error(`Claude ${r.status}`);
  const j = await r.json();
  const text = (j.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  return text || null;
}

// ------------------------------------------------------------------ routes
const usage = new Map(); // user -> timestamps in the last hour (no question text is kept)
coachRouter.post('/coach', async (req, res, next) => {
  try {
    const question = String(req.body?.message || '').trim().slice(0, 500);
    if (!question) return res.status(400).json({ error: 'Ask a question.' });
    const now = Date.now(), list = (usage.get(req.user.id) || []).filter((x) => now - x < 3600e3);
    if (list.length >= 40) return res.status(429).json({ error: 'That is a lot of questions for one hour. Try again a little later.' });
    list.push(now); usage.set(req.user.id, list);
    const c = await coachContext(req.user.id);
    const base = builtInAnswer(question, c);
    let ai = null;
    if (process.env.ANTHROPIC_API_KEY) { try { ai = await claudeAnswer(Array.isArray(req.body?.history) ? req.body.history : [], question, c); } catch (e) { console.error('coach:', e.message); } }
    res.json(ai ? { text: ai, links: [], mode: 'ai' } : { ...base, mode: 'built-in' });
  } catch (e) { next(e); }
});
coachRouter.get('/coach', (_req, res) => res.json({ ai: !!process.env.ANTHROPIC_API_KEY }));
coachRouter.get('/group-sessions', async (_req, res, next) => {
  try { res.json({ sessions: (await q('SELECT id,title,topic,starts_at,minutes,link FROM group_sessions WHERE starts_at >= now() - interval \'1 hour\' ORDER BY starts_at LIMIT 5')).rows }); } catch (e) { next(e); }
});

// Admin: the KUDO Trainer schedules group sessions (date, time, topic, link).
export const groupAdminRouter = Router();
groupAdminRouter.get('/group-sessions', async (_req, res, next) => { try { res.json({ sessions: (await q('SELECT id,title,topic,starts_at,minutes,link FROM group_sessions ORDER BY starts_at DESC LIMIT 50')).rows }); } catch (e) { next(e); } });
groupAdminRouter.post('/group-sessions', async (req, res, next) => {
  try {
    const b = req.body || {}; const title = String(b.title || '').trim().slice(0, 120); const at = new Date(b.starts_at);
    if (!title || Number.isNaN(at.getTime())) return res.status(400).json({ error: 'A title and a date and time are needed.' });
    const link = String(b.link || '').trim().slice(0, 500); if (link && !/^https:\/\//.test(link)) return res.status(400).json({ error: 'The link must start with https://' });
    const row = (await q('INSERT INTO group_sessions (title,topic,starts_at,minutes,link,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id', [title, String(b.topic || '').trim().slice(0, 500) || null, at, Math.max(5, Math.min(480, Number(b.minutes) || 60)), link || null, req.user.id])).rows[0];
    res.json({ id: row.id });
  } catch (e) { next(e); }
});
groupAdminRouter.delete('/group-sessions/:id', async (req, res, next) => { try { await q('DELETE FROM group_sessions WHERE id=$1', [Number(req.params.id)]); res.json({ ok: true }); } catch (e) { next(e); } });

export { PHASES, targetFor };
