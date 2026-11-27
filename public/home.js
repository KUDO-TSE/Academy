// Trainee Home: the four cards that matter. The 12 weeks (the programme, week by week), Up next (the next five
// steps), Your readiness (from the starting point, test by test) and Your level (scenario by scenario).
import { h, icon, svg, fmtDate } from './ui.js';
import { small } from './charts.js';

const tick = (s = 14) => svg(`<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>`);
export const weeksLabel = (p) => (p.weeks[0] === p.weeks[1] ? `Week ${p.weeks[0]}` : `Weeks ${p.weeks[0]} to ${p.weeks[1]}`);
export const mins = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);
const KIND = { scenario: 'Decide', explain: 'Explain it', survey: 'Survey', lesson: 'Lesson', practice: 'Practice', check: 'Check', review: 'Review', baseline: 'Baseline', missed: 'Revisit', teach: 'Teach-back', pair: 'Pairing', one_to_one: 'With your KUDO Trainer', milestone: 'Milestone' };
const KIND_CHIP = { lesson: 'blue', practice: 'amber', check: 'green', review: 'green', scenario: 'grey', explain: 'grey', baseline: 'green' };
const ACTION = new Proxy({}, { get: () => 'Take the course' }); // every step opens its course: one wording everywhere
const mine = (i) => (i.owner || 'you') === 'you';

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
    const status = { done: ['green', 'Done'], now: ['amber', 'This week'], late: ['coral', `${left.length} to catch up`], next: ['grey', w === week + 1 ? 'Next week' : `In ${w - week} weeks`] }[st];
    detail.replaceChildren(
      h('div', { class: 'wk-dh' },
        h('div', null, h('div', { class: 'wk-dk' }, `Week ${w}, ${p?.name || ''}`), h('h3', null, theme(w))),
        h('span', { class: `chip ${status[0]}` }, status[1])),
      h('p', { class: 'wk-dm' }, its.length ? `${d} of ${its.length} step${its.length > 1 ? 's' : ''} done${left.length ? `, about ${mins(left.reduce((t, i) => t + (i.minutes || 0), 0))} left` : ''}` : 'No steps of yours this week: time to catch up or get ahead.'),
      jk.length ? h('ul', { class: 'wk-trainer' }, jk.map((it) => { const e = event(it, shortOf); return h('li', { class: it.done ? 'done' : '' },
        h('span', { class: 'wk-ti' }, icon(e.ic)), h('div', null, h('b', null, e.label), h('span', null, it.done ? 'Done' : `With your KUDO Trainer${it.minutes ? `, ${mins(it.minutes)}` : ''}. They book it with you.`))); })) : null,
      its.length ? h('ul', { class: 'wk-steps' }, its.map((it) => {
        const href = hrefFor(it);
        return h('li', { class: it.done ? 'done' : '' },
          h('span', { class: `wk-tk ${it.done ? 'on' : ''}`, 'aria-label': it.done ? 'Done' : 'Not done yet' }, it.done ? tick(12) : null),
          h('div', { class: 'wk-st' },
            h('div', { class: 'wk-stt' }, href ? h('a', { href, on: { click: () => onStep(it) } }, it.title) : it.title),
            h('div', { class: 'wk-stm' }, h('span', { class: `chip ${KIND_CHIP[it.kind] || 'grey'}` }, KIND[it.kind] || 'Step'), it.minutes ? h('span', null, mins(it.minutes)) : null,
              it.recorded != null ? h('span', { class: `chip ${it.below ? 'amber' : 'green'}` }, `${it.recorded}%`) : null)),
          href && !it.done ? h('a', { class: `btn sm ${st === 'now' || st === 'late' ? 'primary' : ''}`, href, on: { click: () => onStep(it) } }, ACTION[it.kind] || 'Open') : null);
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
      h('div', null, h('h2', null, title), h('p', { class: 'sub' }, `Week ${week} of ${weeks}, ${ph?.name || ''} phase. ${allDone} of ${all.length} steps done.`)),
      pace ? h('span', { class: `chip ${pace[0]}` }, pace[1]) : null),
    board, detail);
  select(week);
  return card;
}

// ------------------------------------------------------------------ Up next
/** The next five steps on the trainee's side, in the order to take them, whatever their week. */
export function upNextCard({ items, week, hrefFor = () => null, onStep = () => {}, readOnly = false }) {
  const next = items.filter((i) => mine(i) && !i.done).sort((a, b) => a.week - b.week).slice(0, 5);
  const total = next.reduce((t, i) => t + (i.minutes || 0), 0);
  const when = (i) => (i.week < week ? ['late', `Week ${i.week}, to catch up`] : i.week === week ? ['now', 'This week'] : ['next', i.week === week + 1 ? 'Next week' : `Week ${i.week}`]);
  return h('section', { class: 'card upnext-card' },
    h('div', { class: 'un-head' }, h('div', null, h('h2', null, 'Up next'), h('p', { class: 'sub' }, next.length ? `Your next ${next.length > 1 ? `${next.length} steps` : 'step'}, in order. About ${mins(total)} in total.` : 'Nothing waiting on your side.')),
      readOnly ? null : h('a', { class: 'btn sm ghost', href: '#training' }, 'All my courses')),
    next.length ? h('ol', { class: 'un-list' }, next.map((it, k) => {
      const href = readOnly ? null : hrefFor(it), [wc, wl] = when(it);
      return h('li', { class: k === 0 ? 'first' : '' },
        h('span', { class: 'un-i', 'aria-hidden': 'true' }, String(k + 1)),
        h('div', { class: 'un-main' },
          h('div', { class: 'un-t' }, href ? h('a', { href, on: { click: () => onStep(it) } }, it.title) : it.title),
          h('div', { class: 'un-m' }, h('span', { class: `chip ${KIND_CHIP[it.kind] || 'grey'}` }, KIND[it.kind] || 'Step'), it.minutes ? h('span', null, mins(it.minutes)) : null, h('span', { class: `un-w ${wc}` }, wl))),
        href ? h('a', { class: `btn sm ${k === 0 ? 'primary' : ''}`, href, on: { click: () => onStep(it) } }, 'Take the course') : null);
    })) : h('p', { class: 'empty-note' }, 'You are ahead of your plan. New steps appear here as your KUDO Trainer adds them.'));
}

// ------------------------------------------------------------------ Your readiness
/** From the starting point (Self Assessment and knowledge test) to now, one step each time a result moves a level. */
export function readinessCard({ progression = [], start, now, firstCheck = null }) {
  const pts = progression.length ? progression : [{ v: start, what: 'Starting point', changes: [] }];
  const diff = now - start;
  const W = 440, H = 170, P = { l: 30, r: 12, t: 12, b: 14 };
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
  const recent = pts.slice(1).reverse().slice(0, 3);
  return h('section', { class: 'card readiness-card' },
    h('div', { class: 'rd-head' }, h('div', null, h('h2', null, 'Your readiness'), h('p', { class: 'sub' }, 'The average of your scenario levels. It moves each time a test result changes one.'))),
    h('div', { class: 'rd-figs' },
      h('div', { class: 'rd-fig' }, h('span', null, 'Starting point'), h('b', null, `${start}%`), h('small', null, 'Self Assessment and knowledge test')),
      h('div', { class: 'rd-fig now' }, h('span', null, 'Now'), h('b', null, `${now}%`), h('small', { class: diff > 0 ? 'up' : diff < 0 ? 'down' : '' }, diff ? `${diff > 0 ? '+' : ''}${diff} points since the start` : 'No change yet'))),
    chart,
    recent.length ? h('ul', { class: 'rd-list' }, recent.map((p) => {
      const prev = pts[pts.indexOf(p) - 1]?.v ?? start, dv = p.v - prev;
      return h('li', null,
        h('div', null, h('b', null, p.moduleTitle || p.what), h('span', null, `${p.moduleTitle ? `${p.what}, ` : ''}${p.at ? fmtDate(p.at) : ''}${p.changes?.length ? `. ${p.changes.map((c) => `${c.short} ${c.from}% to ${c.to}%`).join(', ')}` : ''}`)),
        h('span', { class: `rd-d ${dv > 0 ? 'up' : dv < 0 ? 'down' : ''}` }, dv ? `${dv > 0 ? '+' : ''}${dv}` : '±0'));
    })) : h('p', { class: 'empty-note' }, firstCheck ? `Your readiness starts moving with your first test: ${firstCheck}.` : 'Your readiness starts moving with your first module test.'));
}
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ------------------------------------------------------------------ Your level, scenario by scenario
const BAND = { ready: 'green', nearly: 'blue', developing: 'amber', gap: 'coral', none: 'grey' };
const DEPTH = { setup: 'Set up', handover: 'Hand over' };
export function levelsCard(levels) {
  const rows = [...levels].sort((a, b) => Number(b.focus) - Number(a.focus) || (a.now - a.target) - (b.now - b.target));
  return h('section', { class: 'card levels-card' },
    h('div', { class: 'lvl-head' },
      h('div', null, h('h2', null, 'Your level, scenario by scenario'), h('p', { class: 'sub' }, 'Where you started, where you are now and your target. Your focus scenarios come first.')),
      h('div', { class: 'lvl-key', 'aria-hidden': 'true' }, h('span', null, h('i', { class: 'k-now' }), 'Now'), h('span', null, h('i', { class: 'k-start' }), 'Start'), h('span', null, h('i', { class: 'k-tgt' }), 'Target'))),
    h('div', { class: 'lvl-grid' }, rows.map((l) => {
      const b = l.band?.key || 'none', dv = l.baseline != null ? l.now - l.baseline : 0;
      return h('div', { class: `lvl-row ${l.focus ? 'focus' : ''}` },
        h('div', { class: 'lvl-top' },
          h('div', { class: 'lvl-name' }, h('b', null, l.short), h('span', null, DEPTH[l.depth] || ''), l.focus ? h('span', { class: 'chip coral' }, 'Focus') : null),
          h('span', { class: `chip ${BAND[b]}` }, l.band?.label || '')),
        h('div', { class: `lvl-track b-${b}`, role: 'img', 'aria-label': `${l.label}: ${l.now}% now, started at ${l.baseline}%, target ${l.target}%` },
          h('i', { class: 'lvl-fill', style: `width:${l.now}%` }),
          l.baseline != null ? h('i', { class: 'lvl-start', style: `left:${l.baseline}%` }) : null,
          h('i', { class: 'lvl-tgt', style: `left:${l.target}%` })),
        h('div', { class: 'lvl-nums' }, h('b', null, `${l.now}%`), h('span', null, `started at ${l.baseline}%, target ${l.target}%`), dv ? h('span', { class: dv > 0 ? 'up' : 'down' }, `${dv > 0 ? '+' : ''}${dv}`) : null));
    })));
}
