// Trainee Home: My Quarter's Program (the programme, week by week, course by course), My Readiness (from the starting
// steps), Your readiness (from the starting point, test by test) and Your level (scenario by scenario).
import { h, icon, svg, fmtDate } from './ui.js';
import { small } from './charts.js';

const tick = (s = 14) => svg(`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`);
export const weeksLabel = (p) => (p.weeks[0] === p.weeks[1] ? `Week ${p.weeks[0]}` : `Weeks ${p.weeks[0]} to ${p.weeks[1]}`);
export const mins = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);
const KIND = { scenario: 'Decide', explain: 'Explain it', survey: 'Survey', lesson: 'Lesson', practice: 'Practice', check: 'Check', review: 'Review', baseline: 'Baseline', missed: 'Revisit', teach: 'Teach-back', pair: 'Pairing', one_to_one: 'With your KUDO Trainer', milestone: 'Milestone' };
const KIND_CHIP = { lesson: 'blue', practice: 'amber', check: 'green', review: 'green', scenario: 'grey', explain: 'grey', baseline: 'green' };
const mine = (i) => (i.owner || 'you') === 'you';
const STEP = { lesson: 'Learn', practice: 'Practise', scenario: 'Decide', explain: 'Explain it', check: 'Check' };
export const COURSE_KINDS = new Set(['lesson', 'practice', 'scenario', 'explain', 'check']);
/** A week's steps as courses: the steps of one module make one all-in-one course; anything else stands alone. */
function courseGroups(its) {
  const out = [], byMod = new Map();
  for (const it of its) {
    if (it.module && COURSE_KINDS.has(it.kind)) {
      let g = byMod.get(it.module);
      if (!g) { g = { title: it.title.replace(/^(Learn|Practise|Decide|Explain it|Check|Quick check):\s*/, ''), items: [] }; byMod.set(it.module, g); out.push(g); }
      g.items.push(it);
    } else out.push({ title: it.title, items: [it] });
  }
  // A course with a single quick check keeps its own wording ("Quick check: ...").
  for (const g of out) if (g.items.length === 1) g.title = g.items[0].title;
  return out;
}

/** A session with the KUDO Trainer: its short name and icon. */
function event(it, shortOf) {
  if (it.kind === 'milestone') return { label: 'Retest', ic: 'star' };
  if (it.key === 'kickoff') return { label: 'Kick-off', ic: 'flag' };
  if (it.key === 'midpoint') return { label: 'Mid-point review', ic: 'trend' };
  if (it.key === 'mock') return { label: 'Mock client call', ic: 'team' };
  return { label: `Coaching${shortOf(it.scenario) ? `: ${shortOf(it.scenario)}` : ''}`, ic: 'user' };
}

// ------------------------------------------------------------------ Your 12 weeks
// A phase rail on top, then the weeks as a readable list (left) and the selected week's steps (right).
// This week is open by default. On a phone the week opens under its row.
export function weeksCard({ items, week, weeks = 12, phases, levels = [], modules = [], hrefFor = () => null, onStep = () => {}, title = 'Your 12 weeks', pace = null }) {
  const shortOf = (s) => levels.find((l) => l.scenario === s)?.short || null;
  const modTitle = (k) => modules.find((m) => m.key === k)?.title || null;
  const yours = (w) => items.filter((i) => i.week === w && mine(i));
  const jacks = (w) => items.filter((i) => i.week === w && i.owner === 'jack');
  const phaseOf = (w) => phases.find((p) => w >= p.weeks[0] && w <= p.weeks[1]);
  const theme = (w) => {
    const main = yours(w).filter((i) => i.kind !== 'review'), pool = main.length ? main : yours(w);
    const names = [...new Set(pool.map((i) => shortOf(i.scenario) || (i.kind === 'missed' ? 'Your October questions' : i.kind === 'survey' ? 'Your feedback' : i.kind === 'baseline' ? 'Baseline' : modTitle(i.module))).filter(Boolean).map((n) => n.split(':')[0].trim()))];
    if (!names.length) return jacks(w).length ? event(jacks(w)[0], shortOf).label : 'Catch-up week';
    return names.length > 3 ? `${names.slice(0, 3).join(', ')} and ${names.length - 3} more` : names.join(', ');
  };
  const themeFull = (w) => [...new Set(yours(w).filter((i) => i.kind !== 'review').map((i) => shortOf(i.scenario) || modTitle(i.module)).filter(Boolean))].join(', ');
  const stateOf = (w) => {
    const its = yours(w), left = its.filter((i) => !i.done).length;
    if (w === week) return 'now';
    if (w < week) return left ? 'late' : 'done';
    return its.length && !left ? 'done' : 'next';
  };
  const all = items.filter(mine), allDone = all.filter((i) => i.done).length;
  const ph = phaseOf(week) || phases[0];

  let selected = week;
  const rows = new Map();
  const detail = h('div', { class: 'wk-detail', 'aria-live': 'polite' });
  const select = (w, focus = false) => {
    selected = Math.max(1, Math.min(weeks, w));
    for (const [k, b] of rows) { b.classList.toggle('is-sel', k === selected); b.setAttribute('aria-pressed', String(k === selected)); }
    renderDetail();
    if (small()) rows.get(selected).after(detail);
    if (focus) rows.get(selected).focus();
  };

  const renderDetail = () => {
    const w = selected, p = phaseOf(w), st = stateOf(w), its = yours(w), jk = jacks(w);
    const d = its.filter((i) => i.done).length, left = its.filter((i) => !i.done);
    const status = { done: ['green', 'Done'], now: ['amber', 'This week'], late: ['coral', `${left.length} step${left.length > 1 ? 's' : ''} to catch up`], next: ['grey', w === week + 1 ? 'Next week' : `In ${w - week} weeks`] }[st];
    detail.replaceChildren(
      h('div', { class: 'wk-dh' },
        h('div', null, h('div', { class: 'wk-dk' }, `Week ${w}, ${p?.name || ''}`), h('h3', null, theme(w))),
        h('span', { class: `chip ${status[0]}` }, status[1])),
      h('p', { class: 'wk-dm' }, its.length ? `${d} of ${its.length} step${its.length > 1 ? 's' : ''} done${left.length ? `, about ${mins(left.reduce((t, i) => t + (i.minutes || 0), 0))} left` : ''}` : 'No steps of yours this week: time to catch up or get ahead.'),
      jk.length ? h('ul', { class: 'wk-trainer' }, jk.map((it) => { const e = event(it, shortOf); return h('li', { class: it.done ? 'done' : '' },
        h('span', { class: 'wk-ti' }, icon(e.ic)), h('div', null, h('b', null, e.label), h('span', null, it.done ? 'Done' : `With your KUDO Trainer${it.minutes ? `, ${mins(it.minutes)}` : ''}. They book it with you.`))); })) : null,
      its.length ? h('ul', { class: 'wk-steps' }, courseGroups(its).map((g) => {
        // One all-in-one course: its steps in order, one button that opens the next step to take.
        const left = g.items.filter((i) => !i.done), done = !left.length, nextIt = left[0] || g.items[0], href = hrefFor(nextIt);
        const mins2 = g.items.reduce((t, i) => t + (i.minutes || 0), 0);
        return h('li', { class: `wk-course ${done ? 'done' : ''}` },
          h('span', { class: `wk-tk ${done ? 'on' : ''}`, 'aria-label': done ? 'Done' : 'Not done yet' }, done ? tick(12) : null),
          h('div', { class: 'wk-st' },
            h('div', { class: 'wk-stt' }, href ? h('a', { href, on: { click: () => onStep(nextIt) } }, g.title) : g.title),
            h('div', { class: 'wk-stm' },
              g.items.length > 1 ? g.items.map((i) => h('span', { class: `wk-step ${i.done ? 'on' : ''}`, title: i.done ? 'Done' : 'To do' }, i.done ? tick(10) : null, STEP[i.kind] || KIND[i.kind] || 'Step')) : h('span', { class: `chip ${KIND_CHIP[g.items[0].kind] || 'grey'}` }, KIND[g.items[0].kind] || 'Step'),
              h('span', null, mins(mins2)),
              g.items.filter((i) => i.recorded != null).map((i) => h('span', { class: `chip ${i.below ? 'amber' : 'green'}` }, `${STEP[i.kind] || 'Score'} ${i.recorded}%`)))),
          href && !done ? courseBtn(g, { href, onClick: () => onStep(nextIt), strong: st === 'now' || st === 'late' }) : null);
      })) : null,
      h('div', { class: 'wk-nav' },
        h('button', { class: 'btn sm ghost', type: 'button', disabled: w <= 1, on: { click: () => select(w - 1, true) } }, 'Previous week'),
        w !== week ? h('button', { class: 'btn sm ghost', type: 'button', on: { click: () => select(week, true) } }, 'Back to this week') : null,
        h('button', { class: 'btn sm ghost', type: 'button', disabled: w >= weeks, on: { click: () => select(w + 1, true) } }, 'Next week')));
  };

  const board = h('div', { class: 'wk-board' }, phases.map((p) => {
    const its = items.filter((i) => i.phase === p.n && mine(i)), pd = its.filter((i) => i.done).length;
    const pcls = week > p.weeks[1] ? 'past' : week >= p.weeks[0] ? 'now' : 'next';
    return h('div', { class: `wk-group ${pcls}` },
      h('div', { class: 'wk-gh' },
        h('div', { class: 'wk-gh-top' }, h('b', null, p.name), h('span', null, `${pd} of ${its.length}`)),
        h('div', { class: 'wk-ph-bar' }, h('i', { style: `width:${its.length ? Math.round((pd / its.length) * 100) : 0}%` })),
        h('small', null, weeksLabel(p))),
      Array.from({ length: p.weeks[1] - p.weeks[0] + 1 }, (_, k) => {
        const w = p.weeks[0] + k, st = stateOf(w), wi = yours(w), d = wi.filter((i) => i.done).length, left = wi.length - d;
        const evs = jacks(w).map((it) => event(it, shortOf));
        const sub = st === 'now' ? `This week${wi.length ? `, ${d} of ${wi.length} done` : ''}` : st === 'late' ? `${left} to catch up` : st === 'done' ? (wi.length ? 'Done' : 'Nothing planned') : wi.length ? `${wi.length} step${wi.length > 1 ? 's' : ''}${d ? `, ${d} done` : ''}` : 'Buffer week';
        const b = h('button', { type: 'button', class: `wk-row is-${st}`, 'aria-pressed': 'false', on: { click: () => select(w) },
          'aria-label': `Week ${w}: ${themeFull(w) || theme(w)}. ${sub}${evs.length ? `. With your KUDO Trainer: ${evs.map((e) => e.label).join(', ')}` : ''}` },
          h('span', { class: 'wk-n' }, st === 'done' && wi.length ? tick(13) : String(w)),
          h('span', { class: 'wk-main' },
            h('span', { class: 'wk-t', title: themeFull(w) || null }, theme(w)),
            h('span', { class: 'wk-sub' }, sub),
            evs.length ? h('span', { class: 'wk-ev' }, evs.map((e) => h('span', { class: 'wk-tag' }, icon(e.ic), h('span', null, e.label)))) : null));
        rows.set(w, b);
        return b;
      }));
  }));

  const card = h('section', { class: 'card roadmap-card wk' },
    h('div', { class: 'wk-head' },
      h('div', null, h('h2', null, title), h('p', { class: 'sub' }, `Week ${week} of ${weeks}: ${ph?.name || ''}. ${allDone} of ${all.length} steps done.`)),
      pace ? h('span', { class: `chip ${pace[0]}` }, pace[1]) : null),
    board, detail);
  select(week);
  return card;
}

// ------------------------------------------------------------------ Your readiness
/** From the starting point (Self Assessment and knowledge test) to now, one step each time a result moves a level. */
export function readinessCard({ progression = [], start, now, compact = false, cls = '' }) {
  const pts = progression.length ? progression : [{ v: start, what: 'Starting point', changes: [] }];
  const diff = now - start;
  const W = compact ? 360 : 440, H = compact ? 120 : 170, P = { l: 30, r: 12, t: 10, b: 12 };
  const vals = pts.map((p) => p.v);
  const lo = Math.max(0, Math.floor((Math.min(...vals, start) - 6) / 10) * 10), hi = Math.min(100, Math.ceil((Math.max(...vals, start) + 6) / 10) * 10);
  const x = (k) => P.l + (pts.length > 1 ? (k / (pts.length - 1)) * (W - P.l - P.r) : (W - P.l - P.r) / 2);
  const y = (v) => P.t + (1 - (v - lo) / Math.max(1, hi - lo)) * (H - P.t - P.b);
  // A step line: the level holds until the next result moves it.
  let d = `M${P.l},${y(pts[0].v)} L${x(0)},${y(pts[0].v)}`;
  pts.forEach((p, k) => { if (k) d += ` L${x(k)},${y(pts[k - 1].v)} L${x(k)},${y(p.v)}`; });
  d += ` L${W - P.r},${y(pts.at(-1).v)}`;
  const grid = []; for (let v = lo; v <= hi; v += 10) grid.push(v);
  const label = (p) => (p.moduleTitle ? `${p.what}: ${p.moduleTitle}` : p.what);
  const chart = svg(`<svg class="rd-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Readiness from ${start}% at the start to ${now}% now, over ${pts.length - 1} result${pts.length === 2 ? '' : 's'}">
    ${grid.map((v) => `<line x1="${P.l}" x2="${W - P.r}" y1="${y(v)}" y2="${y(v)}" class="rd-grid"/><text x="${P.l - 8}" y="${y(v) + 4}" class="rd-ax" text-anchor="end">${v}</text>`).join('')}
    <line x1="${P.l}" x2="${W - P.r}" y1="${y(start)}" y2="${y(start)}" class="rd-start"/>
    <path d="${d} L${W - P.r},${H - P.b} L${P.l},${H - P.b} Z" class="rd-area"/>
    <path d="${d}" class="rd-line"/>
    ${pts.map((p, k) => `<circle cx="${x(k)}" cy="${y(p.v)}" r="${k === pts.length - 1 ? 5.5 : 3.5}" class="rd-pt ${k === 0 ? 'first' : k === pts.length - 1 ? 'last' : ''}"><title>${esc(k ? `${label(p)}${p.at ? `, ${fmtDate(p.at)}` : ''}: ${p.v}%` : `Starting point: ${p.v}%`)}</title></circle>`).join('')}
  </svg>`);
  const recent = pts.slice(1).reverse().slice(0, compact ? 1 : 3);
  return h('section', { class: `card readiness-card ${compact ? 'compact' : ''} ${cls}` },
    h('div', { class: 'rd-head' }, h('div', null, h('h2', null, 'My Readiness'), compact ? null : h('p', { class: 'sub' }, 'The average of your scenario levels. It moves each time a test result changes one.'))),
    h('div', { class: 'rd-figs' },
      h('div', { class: 'rd-fig' }, h('span', null, 'Starting point'), h('b', null, `${start}%`), h('small', null, compact ? 'Self Assessment and test' : 'Self Assessment and knowledge test')),
      h('div', { class: 'rd-fig now' }, h('span', null, 'Now'), h('b', null, `${now}%`), h('small', { class: diff > 0 ? 'up' : diff < 0 ? 'down' : '' }, diff ? `${diff > 0 ? '+' : ''}${diff} points` : 'No change yet'))),
    chart,
    recent.length ? h('ul', { class: 'rd-list' }, recent.map((p) => {
      const prev = pts[pts.indexOf(p) - 1]?.v ?? start, dv = p.v - prev;
      return h('li', null,
        h('div', null, h('b', null, p.moduleTitle || p.what), h('span', null, `${p.moduleTitle ? `${p.what}, ` : ''}${p.at ? fmtDate(p.at) : ''}${p.changes?.length ? `. ${p.changes.map((c) => `${c.short} ${c.from}% to ${c.to}%`).join(', ')}` : ''}`)),
        h('span', { class: `rd-d ${dv > 0 ? 'up' : dv < 0 ? 'down' : ''}` }, dv ? `${dv > 0 ? '+' : ''}${dv}` : '±0'));
    })) : h('p', { class: compact ? 'rd-empty' : 'empty-note' }, 'It starts moving upon your first course\'s completion.'));
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ Your level, scenario by scenario
const BAND = { ready: 'green', nearly: 'blue', developing: 'amber', gap: 'coral', none: 'grey' };
const DEPTH = { setup: 'Set up', handover: 'Hand over' };
const LVL_NAME = { external: 'External Meeting Platform' };
export function levelsCard(levels) {
  const rows = [...levels].sort((a, b) => Number(b.focus) - Number(a.focus) || (a.now - a.target) - (b.now - b.target));
  return h('section', { class: 'card levels-card' },
    h('div', { class: 'lvl-head' },
      h('div', null, h('h2', null, "My Knowledge's breakdown"), h('p', { class: 'sub' }, 'Where you started, where you are now and your target. Your focus scenarios come first.')),
      h('div', { class: 'lvl-key', 'aria-hidden': 'true' }, h('span', null, h('i', { class: 'k-now' }), 'Now'), h('span', null, h('i', { class: 'k-start' }), 'Start'), h('span', null, h('i', { class: 'k-tgt' }), 'Target'))),
    h('div', { class: 'lvl-grid' }, rows.map((l) => {
      const b = l.band?.key || 'none', dv = l.baseline != null ? l.now - l.baseline : 0;
      return h('div', { class: `lvl-row ${l.focus ? 'focus' : ''}` },
        h('div', { class: 'lvl-top' },
          h('div', { class: 'lvl-name' }, h('b', null, LVL_NAME[l.scenario] || l.short), h('span', null, DEPTH[l.depth] || ''), l.focus ? h('span', { class: 'chip coral' }, 'Focus') : null),
          h('span', { class: `chip ${BAND[b]}` }, l.band?.label || '')),
        h('div', { class: `lvl-track b-${b}`, role: 'img', 'aria-label': `${l.label}: ${l.now}% now, started at ${l.baseline}%, target ${l.target}%` },
          h('i', { class: 'lvl-fill', style: `width:${l.now}%` }),
          l.baseline != null ? h('i', { class: 'lvl-start', style: `left:${l.baseline}%` }) : null,
          h('i', { class: 'lvl-tgt', style: `left:${l.target}%` })),
        h('div', { class: 'lvl-nums' }, h('b', null, `${l.now}%`), h('span', null, `started at ${l.baseline}%, target ${l.target}%`), dv ? h('span', { class: dv > 0 ? 'up' : 'down' }, `${dv > 0 ? '+' : ''}${dv}`) : null));
    })));
}

// ------------------------------------------------------------------ Months (Home: My Quarter's Program; My courses)
// Three months of four weeks, each with a light colour of its own (sky, sand, mint) so a trainee sees where they are.
const monthOfWeek = (phases, w) => phases.find((p) => w >= p.weeks[0] && w <= p.weeks[1]) || phases.at(-1);
const SHORT_MOD = { foundations: 'Foundations', glossary: 'Glossary', network: 'IT and networks', marketplace: 'Marketplace', ringcentral: 'RingCentral' };
const nameFor = (it, levels, modules) => (SHORT_MOD[it.module] || levels.find((l) => l.scenario === it.scenario)?.short || modules.find((m) => m.key === it.module)?.title || '').split(':')[0].replace(/\.+$/, '').trim();
const joinAnd = (a) => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a.at(-1)}`);

/** In a few words, what a month teaches: its courses (full ones first), then the sessions with the KUDO Trainer. */
export function monthRecap(its, { levels = [], modules = [] } = {}) {
  const mineIts = its.filter(mine);
  const full = [...new Set(mineIts.filter((i) => i.kind === 'lesson').map((i) => nameFor(i, levels, modules)).filter(Boolean))];
  const parts = [];
  if (mineIts.some((i) => i.kind === 'baseline')) parts.push('A short baseline check to start.');
  if (full.length) parts.push(`You learn ${joinAnd(full.length > 3 ? [...full.slice(0, 3), `${full.length - 3} more`] : full)}.`);
  const extra = [mineIts.some((i) => i.kind === 'review') && 'spaced reviews', mineIts.some((i) => /^Quick check/.test(i.title)) && 'quick checks'].filter(Boolean);
  if (extra.length) parts.push(`${full.length ? 'Plus' : 'Mostly'} ${joinAnd(extra)}.`);
  const tr = [...new Set(its.filter((i) => i.owner === 'jack').map((i) => (i.key === 'kickoff' ? 'your kick-off' : i.key === 'midpoint' ? 'a mid-point check-in' : i.key === 'mock' ? 'a mock client call' : i.kind === 'milestone' ? 'the retest' : 'coaching')))];
  if (tr.length) parts.push(`With your KUDO Trainer: ${joinAnd(tr)}.`);
  return parts.join(' ') || 'A lighter month: catch up or get ahead.';
}

/** Home: three month cards. Each opens My courses on that month. */
export function monthsCard({ items, week, phases, levels = [], modules = [], title = "My Quarter's Program", pace = null, onOpen = null, completion = false }) {
  const cur = monthOfWeek(phases, week);
  const all = items.filter(mine), allDone = all.filter((i) => i.done).length, allPct = all.length ? Math.round((allDone / all.length) * 100) : 0;
  // Home: the program's completion sits in the same card as the three months it sums up.
  const done = completion ? h('div', { class: 'mo-done' },
    h('span', { class: 'mo-done-k' }, "My Program's completion"),
    h('div', { class: 'ring big', style: `--p:${allPct}`, role: 'img', 'aria-label': `${allPct}% of your steps done` }, h('b', null, `${allPct}%`)),
    h('div', { class: 'mo-done-n' }, h('b', null, `${allDone} of ${all.length}`), h('span', null, 'steps done')),
    pace ? h('span', { class: `chip ${pace[0]}` }, pace[1]) : null) : null;
  return h('section', { class: `card roadmap-card months ${completion ? 'with-done' : ''}` },
    h('div', { class: 'wk-head' },
      h('div', null, h('h2', null, title), h('p', { class: 'sub' }, completion ? `Week ${week} of 12, ${cur.name}. Click a month to open it in My courses, week by week.` : `Week ${week} of 12, ${cur.name}. ${allDone} of ${all.length} steps done.`)),
      pace && !completion ? h('span', { class: `chip ${pace[0]}` }, pace[1]) : null),
    h('div', { class: completion ? 'mo-wrap' : '' }, done, h('div', { class: 'mo-grid' }, phases.map((p) => {
      const its = items.filter((i) => i.week >= p.weeks[0] && i.week <= p.weeks[1]), mi = its.filter(mine), d = mi.filter((i) => i.done).length;
      const pct = mi.length ? Math.round((d / mi.length) * 100) : 0;
      const state = p.n === cur.n ? 'now' : week > p.weeks[1] ? 'past' : 'next';
      const status = state === 'now' ? `You are here: week ${week}` : state === 'past' ? (d === mi.length ? 'Done' : `${mi.length - d} step${mi.length - d > 1 ? 's' : ''} to catch up`) : `Starts week ${p.weeks[0]}`;
      const open = () => { try { sessionStorage.setItem('academy.month', String(p.n)); } catch { /* storage off */ } if (onOpen) onOpen(p.n); else location.hash = '#training'; };
      return h('button', { type: 'button', class: `mo-card m${p.n} is-${state}`, on: { click: open }, 'aria-label': `${p.name}, weeks ${p.weeks[0]} to ${p.weeks[1]}. ${status}. Open in My courses` },
        h('div', { class: 'mo-top' }, h('span', { class: 'mo-name' }, p.name), h('span', { class: 'mo-weeks' }, `Weeks ${p.weeks[0]} to ${p.weeks[1]}`)),
        h('p', { class: 'mo-recap' }, monthRecap(its, { levels, modules })),
        h('div', { class: 'mo-foot' },
          h('div', { class: 'mo-bar', role: 'img', 'aria-label': `${d} of ${mi.length} steps done` }, h('i', { style: `--w:${pct}%` })),
          h('div', { class: 'mo-meta' }, h('span', { class: `mo-status ${state}` }, status), h('span', null, `${d} of ${mi.length}`)),
          h('span', { class: 'mo-open' }, 'Open the month')));
    }))));
}

/** Home: My Readiness and the scenario levels it averages, in one card. */
export function readinessLevelsCard({ progression, start, now, levels }) {
  return h('section', { class: 'card rl-card' }, h('div', { class: 'rl-grid' },
    readinessCard({ progression, start, now }),
    levelsCard(levels)));
}

/** A course is started once one of its steps is done: its button then reads Continue the course, in the amber "in progress" colour. */
export const isStarted = (its) => its.some((i) => i.done) && its.some((i) => !i.done);
export const courseLabel = (started) => (started ? 'Continue the course' : 'Take the course');
function courseBtn(g, { href, onClick, strong, size = 'sm' }) {
  const started = isStarted(g.items);
  return h('a', { class: `btn ${size} ${started ? 'continue' : strong ? 'primary' : ''}`, href, on: { click: onClick } }, courseLabel(started));
}

/** One week's courses: the steps of a module make one all-in-one course, with one Take the course button. */
export function courseList(its, { hrefFor = () => null, onStep = () => {}, strong = false } = {}) {
  return h('ul', { class: 'wk-steps' }, courseGroups(its).map((g) => {
    const left = g.items.filter((i) => !i.done), done = !left.length, nextIt = left[0] || g.items[0], href = hrefFor(nextIt);
    return h('li', { class: `wk-course ${done ? 'done' : ''}`, 'data-mod': g.items[0].module && COURSE_KINDS.has(g.items[0].kind) ? g.items[0].module : null },
      h('span', { class: `wk-tk ${done ? 'on' : ''}`, 'aria-label': done ? 'Done' : 'Not done yet' }, done ? tick(12) : null),
      h('div', { class: 'wk-st' },
        h('div', { class: 'wk-stt' }, href ? h('a', { href, on: { click: () => onStep(nextIt) } }, g.title) : g.title),
        h('div', { class: 'wk-stm' },
          g.items.length > 1 ? g.items.map((i) => h('span', { class: `wk-step ${i.done ? 'on' : ''}` }, i.done ? tick(10) : null, STEP[i.kind] || KIND[i.kind] || 'Step')) : h('span', { class: `chip ${KIND_CHIP[g.items[0].kind] || 'grey'}` }, KIND[g.items[0].kind] || 'Step'),
          h('span', null, mins(g.items.reduce((t, i) => t + (i.minutes || 0), 0))),
          g.items.filter((i) => i.recorded != null).map((i) => h('span', { class: `chip ${i.below ? 'amber' : 'green'}` }, `${STEP[i.kind] || 'Score'} ${i.recorded}%`)))),
      href && !done ? courseBtn(g, { href, onClick: () => onStep(nextIt), strong }) : null);
  }));
}

/** My courses: the three months as tabs, and the selected month week by week. */
export function monthPlan({ items, week, phases, levels = [], modules = [], hrefFor = () => null, onStep = () => {} }) {
  const cur = monthOfWeek(phases, week);
  let sel = cur.n, focus = null;
  try {
    const s = Number(sessionStorage.getItem('academy.month')); if (phases.some((p) => p.n === s)) sel = s; sessionStorage.removeItem('academy.month');
    // "Go to course" from My results: open the course's month and point at it.
    focus = sessionStorage.getItem('academy.course'); sessionStorage.removeItem('academy.course');
    const fi = focus && items.filter((i) => i.module === focus && COURSE_KINDS.has(i.kind) && i.week).sort((x, y) => x.week - y.week)[0];
    if (fi) sel = (phases.find((p) => fi.week >= p.weeks[0] && fi.week <= p.weeks[1]) || cur).n; else focus = null;
  } catch { /* storage off */ }
  const body = h('div', { class: 'mp-body', 'aria-live': 'polite' });
  const tabs = h('div', { class: 'mp-tabs', role: 'tablist', 'aria-label': 'The three months' });
  const shortOf = (s) => levels.find((l) => l.scenario === s)?.short || null;
  const draw = () => {
    tabs.replaceChildren(...phases.map((p) => {
      const mi = items.filter((i) => mine(i) && i.week >= p.weeks[0] && i.week <= p.weeks[1]), d = mi.filter((i) => i.done).length;
      return h('button', { type: 'button', role: 'tab', 'aria-selected': String(p.n === sel), class: `mp-tab m${p.n} ${p.n === sel ? 'is-sel' : ''} ${p.n === cur.n ? 'is-now' : ''}`, on: { click: () => { sel = p.n; draw(); } } },
        h('b', null, p.name), h('span', null, `Weeks ${p.weeks[0]} to ${p.weeks[1]}${p.n === cur.n ? ', you are here' : ''}`),
        h('i', { class: 'mo-bar' }, h('i', { style: `--w:${mi.length ? Math.round((d / mi.length) * 100) : 0}%` })));
    }));
    const p = phases.find((x) => x.n === sel), its = items.filter((i) => i.week >= p.weeks[0] && i.week <= p.weeks[1]);
    body.className = `mp-body m${p.n}`;
    body.replaceChildren(
      h('p', { class: 'mp-recap' }, monthRecap(its, { levels, modules })),
      ...Array.from({ length: p.weeks[1] - p.weeks[0] + 1 }, (_, k) => {
        const w = p.weeks[0] + k, wi = its.filter((i) => i.week === w), mi = wi.filter(mine), jk = wi.filter((i) => i.owner === 'jack'), d = mi.filter((i) => i.done).length;
        const state = w === week ? 'now' : w < week ? (d === mi.length ? 'done' : 'late') : 'next';
        const chip = { now: ['amber', 'This week'], done: ['green', 'Done'], late: ['coral', `${mi.length - d} to catch up`], next: ['grey', w === week + 1 ? 'Next week' : `In ${w - week} weeks`] }[state];
        return h('section', { class: `mp-week is-${state}` },
          h('div', { class: 'mp-wh' }, h('div', null, h('h3', null, `Week ${w}`), h('span', { class: 'muted small' }, mi.length ? `${d} of ${mi.length} steps done, about ${mins(mi.filter((i) => !i.done).reduce((t, i) => t + (i.minutes || 0), 0))} left` : 'No steps of yours: catch up or get ahead')), h('span', { class: `chip ${chip[0]}` }, chip[1])),
          jk.length ? h('ul', { class: 'wk-trainer' }, jk.map((it) => { const e = event(it, shortOf); return h('li', { class: it.done ? 'done' : '' }, h('span', { class: 'wk-ti' }, icon(e.ic)), h('div', null, h('b', null, e.label), h('span', null, it.done ? 'Done' : `With your KUDO Trainer${it.minutes ? `, ${mins(it.minutes)}` : ''}. They book it with you.`))); })) : null,
          mi.length ? courseList(mi, { hrefFor, onStep, strong: state === 'now' || state === 'late' }) : null);
      }));
  };
  draw();
  if (focus) setTimeout(() => { const row = body.querySelector(`[data-mod="${CSS.escape(focus)}"]`); if (!row) return; row.scrollIntoView({ behavior: 'smooth', block: 'center' }); row.classList.add('ct-flash'); setTimeout(() => row.classList.remove('ct-flash'), 3400); }, 350);
  return h('section', { class: 'card month-plan plan-weeks' }, h('div', { class: 'sec-head' }, h('h2', null, "My Quarter's Program, month by month"), h('p', { class: 'muted small' }, 'Pick a month to see it week by week. Each course is all-in-one: learn, practise, decide, explain and check.')), tabs, body);
}
