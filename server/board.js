// The Academy owner's action board: everything waiting on the owner, by type and urgency, plus a suggested week
// that fits the owner's available hours. Tasks are derived from the live data, so doing the action clears the task.
import { Router } from 'express';
import { q, audit } from './db.js';
import { loadContext, refreshAll, liveState } from './engine.js';
import { MODULE_BY_KEY } from './curriculum.js';
import { itemById } from './assess.js';
import { SCENARIOS } from './scenarios.js';
const SCENARIO_LABEL = Object.fromEntries(SCENARIOS.map((x) => [x.key, x.label]));

export const boardRouter = Router();
const DAY = 864e5;
const DEFAULT_BOARD = { hours: 4, days: [1, 2, 3, 4, 5] };
const MIN = { approval: 10, review: 10, signoff: 5, nudge: 5, content: 30 };

const iso = (d) => new Date(d).toISOString().slice(0, 10);
function mondayOf(d) { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); x.setUTCDate(x.getUTCDate() - ((x.getUTCDay() + 6) % 7)); return x; }

async function boardSettings() {
  const r = await q("SELECT value FROM app_settings WHERE key='board'");
  return { ...DEFAULT_BOARD, ...(r.rows[0]?.value || {}) };
}

export async function buildBoard() {
  const ctx = await refreshAll();
  const [plans, subs, fb, attempts, state, settings, activity] = await Promise.all([
    q("SELECT user_id,version,status,data,started_on,created_at FROM plans WHERE status IN ('draft','approved')"),
    q("SELECT s.id,s.user_id,s.module_key,s.kind,s.created_at,s.status,s.human_requested,s.auto FROM submissions s WHERE s.needs_human AND s.status IN ('submitted','auto') ORDER BY s.created_at"),
    q('SELECT module_key, count(*)::int n, avg(clear)::float clear, avg(relevant)::float relevant, avg(confidence)::float confidence FROM module_feedback WHERE user_id IN (SELECT id FROM users WHERE NOT is_demo) GROUP BY module_key'),
    q("SELECT answers FROM quiz_attempts WHERE kind='check' AND counts AND module_key <> 'baseline' AND user_id IN (SELECT id FROM users WHERE NOT is_demo)"),
    q('SELECT task_key,snoozed_until,handled_at FROM board_tasks'),
    boardSettings(),
    q(`SELECT user_id, max(at) AS at FROM (
         SELECT user_id, completed_at AS at FROM plan_progress UNION ALL SELECT user_id, created_at FROM quiz_attempts
         UNION ALL SELECT user_id, created_at FROM submissions UNION ALL SELECT user_id, created_at FROM module_feedback) x GROUP BY user_id`),
  ]);
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const thisMon = mondayOf(today), nextMon = new Date(thisMon.getTime() + 7 * DAY), afterNext = new Date(thisMon.getTime() + 14 * DAY);
  const st = new Map(state.rows.map((r) => [r.task_key, r]));
  const hidden = (key) => { const s = st.get(key); return s && ((s.snoozed_until && new Date(s.snoozed_until) > today) || (s.handled_at && Date.now() - new Date(s.handled_at).getTime() < 7 * DAY)); };
  const lastAct = new Map(activity.rows.map((r) => [r.user_id, r.at]));
  const tasks = [];
  const add = (t) => { if (!hidden(t.key)) tasks.push(t); };
  const users = new Map(ctx.users.map((u) => [u.id, u]));

  // 1. Approvals
  for (const p of plans.rows.filter((x) => x.status === 'draft')) {
    const u = users.get(p.user_id); if (!u) continue;
    const hasApproved = plans.rows.some((x) => x.user_id === p.user_id && x.status === 'approved');
    add({ key: `approve:${p.user_id}:${p.version}`, type: 'approval', person: u.name, userId: u.id, demo: u.is_demo, title: hasApproved ? 'Approve the changes to the plan' : 'Approve the new plan', detail: `Version ${p.version}, built ${iso(p.created_at)}`, minutes: MIN.approval, due: iso(today), urgency: hasApproved ? 'this_week' : 'now', link: `#person-${u.id}`, tab: 'programme' });
  }

  // 2. Sessions with the KUDO Trainer, from approved plans, dated from each plan's start
  for (const p of plans.rows.filter((x) => x.status === 'approved')) {
    const u = users.get(p.user_id); if (!u) continue;
    const live = liveState(u, p, ctx);
    const start = p.started_on ? new Date(p.started_on) : today;
    for (const it of live.items.filter((i) => i.owner === 'jack' && !i.done)) {
      const due = new Date(start.getTime() + (it.week - 1) * 7 * DAY);
      const urgency = due < thisMon ? 'overdue' : due < nextMon ? 'this_week' : due < afterNext ? 'next_week' : 'later';
      if (urgency === 'later') continue;
      add({ key: `session:${u.id}:${it.key}`, type: it.kind === 'milestone' ? 'milestone' : 'session', person: u.name, userId: u.id, demo: u.is_demo, title: it.title, detail: it.why, minutes: it.minutes, due: iso(due), urgency, link: `#person-${u.id}`, tab: it.kind === 'milestone' ? 'programme' : 'inputs', itemKey: it.key });
    }
    // 3. Practice to sign off
    for (const it of live.items.filter((i) => i.signoff && i.done && !i.signed_off)) add({ key: `signoff:${u.id}:${it.key}`, type: 'signoff', person: u.name, userId: u.id, demo: u.is_demo, title: `Sign off: ${it.title.replace(/^Practise: /, '')}`, detail: it.note ? `Trainee note: ${it.note}` : 'Marked done by the trainee', minutes: MIN.signoff, due: iso(today), urgency: 'this_week', link: `#person-${u.id}`, tab: 'programme' });
    // 4. Nudges: behind pace, or no activity for 10 days
    const last = [lastAct.get(u.id), u.last_login_at].filter(Boolean).map((d) => new Date(d).getTime()).sort((a, b) => b - a)[0];
    const idle = last ? Math.floor((Date.now() - last) / DAY) : null;
    const planAge = Math.floor((today - start) / DAY);
    // Give every trainee a week before nudging; after that, nudge when behind pace or quiet for 10 days.
    if (planAge >= 7 && (live.progress.pace === 'behind' || idle == null || idle >= 10)) {
      const why = idle == null ? `Has not started, ${planAge} days in` : idle >= 10 ? `No activity for ${idle} days` : 'Behind the suggested pace';
      add({ key: `nudge:${u.id}:${iso(thisMon)}`, type: 'nudge', person: u.name, userId: u.id, demo: u.is_demo, title: 'Check in with a short message', detail: `${why}. Week ${live.week}, ${live.progress.pct}% done. Next step: ${live.next[0]?.title || '—'}`, minutes: MIN.nudge, due: iso(today), urgency: idle == null || idle >= 14 ? 'now' : 'this_week', link: `#person-${u.id}`, tab: 'programme', canHandle: true, message: `Hi ${u.name.split(' ')[0]}, quick check-in on your KUDO Academy programme: your next step is "${live.next[0]?.title || 'in your plan'}". It takes about ${live.next[0]?.minutes || 15} minutes. Anything blocking you?` });
    }
  }

  // Group sessions: when four or more kick-offs (or mid-point check-ins) fall due together, one group session replaces them.
  for (const itemKey of ['kickoff', 'midpoint']) {
    const same = tasks.filter((t) => t.type === 'session' && t.itemKey === itemKey && !t.demo && ['overdue', 'this_week', 'next_week'].includes(t.urgency));
    if (same.length < 4) continue;
    for (const t of same) tasks.splice(tasks.indexOf(t), 1);
    const urg = same.some((t) => t.urgency === 'overdue') ? 'overdue' : same.some((t) => t.urgency === 'this_week') ? 'this_week' : 'next_week';
    add({ key: `group:${itemKey}:${iso(thisMon)}`, type: 'session', group: true, itemKey, userIds: same.map((t) => t.userId), person: `${same.length} trainees`, title: itemKey === 'kickoff' ? 'Run a group kick-off' : 'Run a group mid-point check-in', detail: `Instead of ${same.length} separate sessions: ${same.map((t) => t.person).join(', ')}. Mark it held for everyone who attended.`, minutes: 60, due: same.map((t) => t.due).sort()[0], urgency: urg, link: '#board' });
  }

  // Peer teach-back: in the Broaden phase (weeks 8 to 10), pair trainees who share a focus scenario. Explaining to a
  // colleague consolidates learning and builds the team; the KUDO Trainer makes the introduction, so no one sees another's results.
  const broaden = [];
  for (const p of plans.rows.filter((x) => x.status === 'approved')) {
    const u = users.get(p.user_id); if (!u || u.is_demo) continue;
    const wk = p.started_on ? Math.floor((today - new Date(p.started_on)) / (7 * DAY)) + 1 : 0;
    if (wk >= 8 && wk <= 10 && p.data?.focus?.length) broaden.push({ u, focus: p.data.focus });
  }
  const paired = new Set();
  for (const s of [...new Set(broaden.flatMap((b) => b.focus))]) {
    const pool = broaden.filter((b) => b.focus.includes(s) && !paired.has(b.u.id));
    for (let i = 0; i + 1 < pool.length; i += 2) {
      const [a1, b1] = [pool[i].u, pool[i + 1].u]; paired.add(a1.id); paired.add(b1.id);
      const label = SCENARIO_LABEL[s] || s;
      add({ key: `pair:${s}:${a1.id}:${b1.id}`, type: 'pairing', person: `${a1.name} and ${b1.name}`, title: `Pair them for a teach-back on ${label}`, detail: `Both have ${label} as a focus and are in the Broaden phase. Introduce them: each explains one part to the other for 20 minutes, then tells you what they would still hand over.`, minutes: 5, due: iso(today), urgency: 'this_week', link: '#board', canHandle: true,
        message: `Hi ${a1.name.split(' ')[0]} and ${b1.name.split(' ')[0]}, you are both working on ${label} in the Academy. Could you book 20 minutes this week to teach each other one part of it? Tell me afterwards what you would still hand over.` });
    }
  }

  // Sessions: questions from recordings that the Academy does not cover yet, waiting for the KUDO Trainer's decision.
  const sess = (await q("SELECT id,title,happened_on,findings FROM sessions WHERE status='ready'")).rows;
  for (const se of sess) {
    const open = (se.findings || []).filter((f) => f.status === 'open' && f.coverage !== 'covered');
    if (!open.length) continue;
    const gaps = open.filter((f) => f.coverage === 'gap').length;
    add({ key: `session:${se.id}:${open.length}`, type: 'learning', title: `Turn ${open.length} session question${open.length > 1 ? 's' : ''} into content`, person: se.title, detail: `${gaps ? `${gaps} not covered by the lessons yet` : 'Partly covered by the lessons'}. Add a FAQ entry or a check question, or dismiss.`, minutes: Math.min(45, 4 * open.length), due: iso(today), urgency: 'later_ok', link: `#session-${se.id}`, canHandle: true });
  }

  // 5. Explain-it recordings waiting
  for (const s of subs.rows) {
    const u = users.get(s.user_id); if (!u) continue;
    const age = Math.floor((Date.now() - new Date(s.created_at).getTime()) / DAY);
    const why = s.human_requested ? 'The trainee asked for your view' : s.status === 'submitted' ? 'The automatic review could not run' : s.auto?.flags?.length ? `Flagged: ${s.auto.flags.join('; ')}` : s.auto?.rating === 'gap' ? 'Scored as a gap: confirm before it counts' : 'Random spot-check';
    add({ key: `review:${s.id}`, type: 'review', sub: s.kind === 'practice' ? 'practice' : 'recording', person: u.name, userId: u.id, demo: u.is_demo, title: `${s.status === 'auto' ? 'Spot-check' : 'Review'} the ${s.kind === 'practice' ? 'practice' : 'recording'}: ${MODULE_BY_KEY[s.module_key]?.title || s.module_key}`, detail: `${why}. Sent ${age === 0 ? 'today' : `${age} day${age > 1 ? 's' : ''} ago`}`, minutes: MIN.review, due: iso(today), urgency: age >= 3 ? 'now' : 'this_week', link: '#reviews' });
  }

  // 6. Content to fix: low module ratings, or questions that most people miss
  for (const m of fb.rows) {
    const low = ['clear', 'relevant', 'confidence'].filter((k) => m[k] < 3.5);
    if (m.n >= 3 && low.length) add({ key: `content:mod:${m.module_key}`, type: 'content', title: `Improve the module: ${MODULE_BY_KEY[m.module_key]?.title || m.module_key}`, detail: `${m.n} ratings, low on ${low.join(', ')}. Read the comments on the Feedback page.`, minutes: MIN.content, due: iso(today), urgency: 'this_week', link: '#feedback', canHandle: true });
  }
  const items = new Map();
  for (const a of attempts.rows) for (const x of a.answers || []) { if (!x.id) continue; const it = items.get(x.id) || { n: 0, s: 0 }; it.n++; it.s += Number(x.score ?? 0); items.set(x.id, it); }
  for (const [id, it] of items) if (it.n >= 4 && it.s / it.n < 0.4) {
    const x = itemById(id);
    if (x) add({ key: `content:q:${id}`, type: 'content', title: 'Check a question most people miss', detail: `"${x.q}" (${MODULE_BY_KEY[x.module]?.title}): ${Math.round((it.s / it.n) * 100)}% success over ${it.n} answers. Unclear wording, or a gap in the lesson?`, minutes: 15, due: iso(today), urgency: 'later_ok', link: `#curriculum-${x.module}`, canHandle: true });
  }

  // Messages from trainees (sent from the virtual coach panel): a trainee is waiting, so they come first.
  const msgs = (await q("SELECT m.id,m.user_id,m.kind,m.text,m.created_at FROM trainer_messages m WHERE m.status='open' ORDER BY m.created_at")).rows;
  for (const m of msgs) {
    const u = users.get(m.user_id); const name = u?.name || (await q('SELECT name FROM users WHERE id=$1', [m.user_id])).rows[0]?.name || 'A trainee';
    add({ key: `message:${m.id}`, type: 'message', messageId: m.id, kind: m.kind, person: name, userId: m.user_id, demo: !!u?.is_demo, title: `${m.kind[0].toUpperCase()}${m.kind.slice(1)} from ${name.split(' ')[0]}`, detail: m.text, minutes: 5, due: iso(m.created_at), urgency: 'now', link: `#person-${m.user_id}`, sent: m.created_at });
  }

  // Suggested week: fill the owner's available days with this week's work, most urgent first.
  const rank = { overdue: 0, now: 1, this_week: 2, next_week: 4, later_ok: 5 };
  const typeRank = { session: 0, milestone: 0, message: 1, approval: 1, review: 2, signoff: 3, nudge: 3, pairing: 4, learning: 5, content: 6 };
  // Scheduling order: overdue sessions, then sessions, then what blocks trainees (approvals, reviews), then the rest.
  const work = tasks.filter((t) => t.urgency !== 'next_week' && !t.demo).sort((a, b) => ((a.urgency === 'overdue' ? 0 : 1) - (b.urgency === 'overdue' ? 0 : 1)) || (typeRank[a.type] - typeRank[b.type]) || (rank[a.urgency] - rank[b.urgency]) || a.due.localeCompare(b.due));
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const days = settings.days.map((d) => ({ dow: d, label: dayNames[d - 1], date: iso(new Date(thisMon.getTime() + (d - 1) * DAY)), minutes: 0, tasks: [] }))
    .filter((d) => d.date >= iso(today));
  const perDay = days.length ? Math.round((settings.hours * 60 * (days.length / settings.days.length)) / days.length) : 0;
  const overflow = [];
  for (const t of work) {
    // Sessions take one slot each and spread across days; small admin tasks batch together.
    const left = settings.hours * 60 - days.reduce((x, d) => x + d.minutes, 0);
    // A session longer than a day's share still fits on a free day while the week has room.
    const day = days.filter((d) => d.minutes + t.minutes <= perDay || (d.minutes === 0 && t.minutes <= left)).sort((a, b) => (t.type === 'session' ? a.tasks.filter((x) => x.type === 'session').length - b.tasks.filter((x) => x.type === 'session').length : 0) || a.minutes - b.minutes)[0];
    if (day) { day.tasks.push({ key: t.key, type: t.type, title: t.title, person: t.person, minutes: t.minutes }); day.minutes += t.minutes; } else overflow.push({ key: t.key, title: t.title, person: t.person, minutes: t.minutes });
  }
  const need = work.reduce((s, t) => s + t.minutes, 0);
  return {
    settings, today: iso(today), weekOf: iso(thisMon),
    reviewSplit: { recording: tasks.filter((t) => t.type === 'review' && !t.demo && t.sub !== 'practice').length, practice: tasks.filter((t) => t.type === 'review' && !t.demo && t.sub === 'practice').length },
    counts: Object.fromEntries(['approval', 'session', 'review', 'signoff', 'nudge', 'content', 'milestone', 'message'].map((k) => [k, tasks.filter((t) => t.type === k && !t.demo).length])),
    tasks: tasks.sort((a, b) => (rank[a.urgency] - rank[b.urgency]) || (typeRank[a.type] - typeRank[b.type])),
    week: { days, overflow, needMinutes: need, capacityMinutes: settings.hours * 60 },
  };
}

boardRouter.post('/board/group-done', async (req, res, next) => {
  try {
    const itemKey = req.body?.itemKey; const ids = Array.isArray(req.body?.userIds) ? req.body.userIds.map(Number).filter(Number.isInteger) : [];
    if (!['kickoff', 'midpoint'].includes(itemKey) || !ids.length) return res.status(400).json({ error: 'Invalid request.' });
    for (const id of ids) await q(`INSERT INTO inputs (user_id,author_id,kind,title,item_key) VALUES ($1,$2,'one_to_one',$3,$4)`, [id, req.user.id, itemKey === 'kickoff' ? 'Group kick-off' : 'Group mid-point check-in', itemKey]);
    await audit(req, 'board.group_done', itemKey, `${ids.length} trainees`);
    res.json({ ok: true, logged: ids.length });
  } catch (e) { next(e); }
});

boardRouter.get('/board', async (_req, res, next) => { try { res.json(await buildBoard()); } catch (e) { next(e); } });

boardRouter.put('/board/settings', async (req, res, next) => {
  try {
    const hours = Number(req.body?.hours), days = Array.isArray(req.body?.days) ? [...new Set(req.body.days.map(Number).filter((d) => d >= 1 && d <= 7))].sort() : null;
    if (!(hours >= 1 && hours <= 40) || !days?.length) return res.status(400).json({ error: 'Give between 1 and 40 hours and at least one day.' });
    await q("INSERT INTO app_settings (key,value) VALUES ('board',$1) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value", [{ hours, days }]);
    await audit(req, 'board.settings', null, `${hours}h`);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

boardRouter.post('/board/tasks', async (req, res, next) => {
  try {
    const key = String(req.body?.key || ''); const action = req.body?.action;
    if (!/^[a-z]+:[A-Za-z0-9:._-]{1,120}$/.test(key) || !['snooze', 'handled', 'undo'].includes(action)) return res.status(400).json({ error: 'Invalid request.' });
    if (action === 'undo') await q('DELETE FROM board_tasks WHERE task_key=$1', [key]);
    else if (action === 'snooze') await q("INSERT INTO board_tasks (task_key,snoozed_until) VALUES ($1, CURRENT_DATE + 7) ON CONFLICT (task_key) DO UPDATE SET snoozed_until=CURRENT_DATE + 7", [key]);
    else await q('INSERT INTO board_tasks (task_key,handled_at,handled_by) VALUES ($1,now(),$2) ON CONFLICT (task_key) DO UPDATE SET handled_at=now(), handled_by=$2', [key, req.user.id]);
    await audit(req, `board.${action}`, key);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// This week's sessions as a calendar file, so the owner can drop placeholders into Outlook.
boardRouter.get('/board/week.ics', async (req, res, next) => {
  try {
    const b = await buildBoard();
    const esc = (s) => String(s).replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
    const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const ev = [];
    for (const d of b.week.days) {
      let t = 9 * 60; // 09:00 local, back to back
      for (const x of d.tasks.filter((k) => k.type === 'session' || k.type === 'milestone')) {
        const ymd = d.date.replace(/-/g, '');
        const hm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}${String(m % 60).padStart(2, '0')}00`;
        ev.push(['BEGIN:VEVENT', `UID:${esc(x.key)}-${ymd}@kudo-academy`, `DTSTAMP:${stamp}`, `DTSTART:${ymd}T${hm(t)}`, `DTEND:${ymd}T${hm(t + x.minutes)}`, `SUMMARY:${esc(`Academy: ${x.title} (${x.person})`)}`, 'END:VEVENT'].join('\r\n'));
        t += x.minutes + 15;
      }
    }
    await audit(req, 'board.ics', null, `${ev.length} events`);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="academy-week-${b.weekOf}.ics"`);
    res.send(['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KUDO Academy//Board//EN', ...ev, 'END:VCALENDAR'].join('\r\n'));
  } catch (e) { next(e); }
});
