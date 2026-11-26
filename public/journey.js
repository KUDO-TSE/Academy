// The 12 weeks at a glance: a route of weekly stops grouped by phase. Each stop says what the week is about,
// how much of it is done and which session with Jack falls in it. One stop is open below the route.
import { h, icon, svg } from './ui.js';
import { small } from './charts.js';

const tick = () => svg('<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>');
export const mins = (m) => (m < 60 ? `${m} min` : `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60}` : ''}`);
const KIND = { scenario: 'Decide', explain: 'Explain it', survey: 'Survey', lesson: 'Lesson', practice: 'Practice', check: 'Check', review: 'Review', baseline: 'Baseline', missed: 'Revisit', teach: 'Teach-back', pair: 'Pairing', one_to_one: 'With Jack', milestone: 'Milestone' };

/** What a session with Jack is called on the route, and its icon. */
function event(it, shortOf) {
  if (it.kind === 'milestone') return { label: 'Retest', ic: 'star' };
  if (it.key === 'kickoff') return { label: 'Kick-off', ic: 'flag' };
  if (it.key === 'midpoint') return { label: 'Mid-point', ic: 'trend' };
  if (it.key === 'mock') return { label: 'Mock call', ic: 'team' };
  return { label: `1:1 ${shortOf(it.scenario) || ''}`.trim(), ic: 'user' };
}

export function journeyMap({ items, week, weeks = 12, phases, levels = [], modules = [], hrefFor = () => null }) {
  const shortOf = (s) => levels.find((l) => l.scenario === s)?.short || null;
  const modTitle = (k) => modules.find((m) => m.key === k)?.title || null;
  const yours = (w) => items.filter((i) => i.week === w && (i.owner || 'you') === 'you');
  const jacks = (w) => items.filter((i) => i.week === w && i.owner === 'jack');
  const phaseOf = (w) => phases.find((p) => w >= p.weeks[0] && w <= p.weeks[1]);

  // What each week is about: its scenarios, or its topics when a week has none
  const theme = (w) => {
    const names = [...new Set(yours(w).map((i) => shortOf(i.scenario) || (i.kind === 'missed' ? 'October questions' : i.kind === 'survey' ? 'Feedback' : i.kind === 'baseline' ? 'Baseline' : modTitle(i.module))).filter(Boolean))];
    if (!names.length) return jacks(w).length ? jacks(w)[0].title.replace(/ with Jack/, '').split(':')[0] : 'Catch-up week';
    const cut = names.map((n) => n.split(':')[0].trim());
    if (cut.length === 1) return cut[0];
    return cut.join(', ').length <= 20 ? cut.join(', ') : `${cut[0]} +${cut.length - 1}`;
  };
  const stateOf = (w) => {
    const its = yours(w), left = its.filter((i) => !i.done).length;
    if (w === week) return 'now';
    if (w < week) return left ? 'late' : 'done';
    return its.length && !left ? 'done' : 'next';
  };

  // Headline facts
  const ph = phaseOf(week) || phases[0];
  const thisWeek = yours(week), leftNow = thisWeek.filter((i) => !i.done);
  const late = items.filter((i) => (i.owner || 'you') === 'you' && !i.done && i.week < week);
  const nextJack = items.filter((i) => i.owner === 'jack' && !i.done && i.week >= week).sort((a, b) => a.week - b.week)[0];
  const phaseLeft = ph ? ph.weeks[1] - week : 0;
  const fact = (k, v, sub, cls = '') => h('div', { class: `jm-fact ${cls}` }, h('span', { class: 'jm-fk' }, k), h('b', null, v), sub ? h('span', { class: 'jm-fs' }, sub) : null);
  const head = h('div', { class: 'jm-head' },
    fact('Where you are', `Week ${week} of ${weeks}`, ph ? `${ph.name}${phaseLeft > 0 ? `, ${phaseLeft} more week${phaseLeft > 1 ? 's' : ''} in this phase` : ', last week of this phase'}` : null),
    fact('This week', leftNow.length ? `${leftNow.length} step${leftNow.length > 1 ? 's' : ''} left` : thisWeek.length ? 'All done' : 'Nothing planned', leftNow.length ? `About ${mins(leftNow.reduce((t, i) => t + (i.minutes || 0), 0))}` : thisWeek.length ? 'You can get ahead on next week' : null, leftNow.length ? '' : 'good'),
    late.length ? fact('To catch up', `${late.length} step${late.length > 1 ? 's' : ''}`, `From week${new Set(late.map((i) => i.week)).size > 1 ? 's' : ''} ${[...new Set(late.map((i) => i.week))].sort((a, b) => a - b).join(', ')}`, 'late') : fact('To catch up', 'Nothing', 'You are on track', 'good'),
    nextJack ? fact('Next with Jack', nextJack.title.replace(/ with Jack/, '').replace(/^Coaching:/, 'Coaching on'), nextJack.week === week ? 'This week' : `Week ${nextJack.week}, in ${nextJack.week - week} week${nextJack.week - week > 1 ? 's' : ''}`) : null);

  // The route
  let selected = week;
  const detail = h('div', { class: 'jm-detail', 'aria-live': 'polite' });
  const stops = new Map();
  const select = (w) => {
    selected = w;
    for (const [k, el] of stops) { el.classList.toggle('is-sel', k === w); el.querySelector('.jm-stop').setAttribute('aria-expanded', String(k === w)); }
    renderDetail();
    if (small()) stops.get(w).append(detail);
  };
  const renderDetail = () => {
    const w = selected, p = phaseOf(w), its = [...jacks(w), ...yours(w)], st = stateOf(w);
    const done = yours(w).filter((i) => i.done).length, left = yours(w).filter((i) => !i.done);
    const status = { done: 'Done', now: 'This week', late: 'Behind', next: w === week + 1 ? 'Next week' : `In ${w - week} weeks` }[st];
    detail.replaceChildren(
      h('div', { class: 'jm-dh' },
        h('div', null, h('h3', null, `Week ${w}: ${theme(w)}`), h('div', { class: 'muted small' }, `${p?.name || ''} · ${yours(w).length ? `${done} of ${yours(w).length} done` : 'No steps of yours'}${left.length ? ` · about ${mins(left.reduce((t, i) => t + (i.minutes || 0), 0))} left` : ''}`)),
        h('span', { class: `chip ${{ done: 'green', now: 'blue', late: 'coral', next: 'grey' }[st]}` }, status)),
      its.length ? h('ul', { class: 'jm-list' }, its.map((it) => {
        const href = hrefFor(it), jack = it.owner === 'jack';
        return h('li', { class: it.done ? 'done' : '' },
          h('span', { class: `jm-tk ${it.done ? 'on' : ''} ${jack ? 'jack' : ''}`, 'aria-label': it.done ? 'Done' : 'Not done yet' }, it.done ? tick() : jack ? icon(event(it, shortOf).ic) : null),
          h('span', { class: 'jm-it' }, href ? h('a', { href }, it.title) : it.title),
          h('span', { class: 'jm-meta' }, `${jack ? 'With Jack' : KIND[it.kind] || ''}${it.minutes ? ` · ${mins(it.minutes)}` : ''}`));
      })) : h('p', { class: 'muted small', style: 'margin:8px 0 0' }, 'Nothing planned this week: a buffer to catch up or get ahead'));
  };

  const route = h('div', { class: 'jm-route', style: `--weeks:${weeks}`, role: 'list', 'aria-label': `Your ${weeks}-week route, week ${week} of ${weeks}` },
    phases.map((p) => {
      const n = p.weeks[1] - p.weeks[0] + 1, its = items.filter((i) => i.phase === p.n && (i.owner || 'you') === 'you'), d = its.filter((i) => i.done).length;
      const pst = week > p.weeks[1] ? (d < its.length ? 'past is-behind' : 'past') : week >= p.weeks[0] ? 'now' : 'next';
      return h('div', { class: `jm-phase is-${pst}`, style: `--n:${n}`, role: 'listitem' },
        h('div', { class: 'jm-ph' }, h('b', null, p.name), h('span', null, `${d} of ${its.length}`), h('i', { class: 'jm-ph-bar' }, h('i', { style: `width:${its.length ? Math.round((d / its.length) * 100) : 0}%` }))),
        h('div', { class: 'jm-weeks', role: 'list' }, Array.from({ length: n }, (_, k) => {
          const w = p.weeks[0] + k, st = stateOf(w), mine = yours(w), d2 = mine.filter((i) => i.done).length;
          const evs = jacks(w).map((it) => ({ ...event(it, shortOf), done: it.done, title: it.title }));
          const line = w < week ? 'past' : w === week ? 'half' : 'ahead';
          const el = h('div', { class: `jm-wk is-${st} ${w === 1 ? 'first' : ''} ${w === weeks ? 'last' : ''}`, role: 'listitem' },
            h('button', { type: 'button', class: 'jm-stop', 'aria-expanded': 'false', 'aria-label': `Week ${w}: ${theme(w)}. ${mine.length ? `${d2} of ${mine.length} done` : 'No steps'}${evs.length ? `. With Jack: ${evs.map((e) => e.label).join(', ')}` : ''}`, on: { click: () => select(w) } },
              h('span', { class: 'jm-ev' }, evs.slice(0, 2).map((e) => h('span', { class: `jm-tag ${e.done ? 'done' : ''} ${e.label === 'Retest' ? 'key' : ''}`, title: e.title }, icon(e.ic), h('span', null, e.label)))),
              h('span', { class: `jm-line ${line}` }),
              h('span', { class: 'jm-node' }, st === 'done' ? tick() : String(w)),
              h('span', { class: 'jm-wl' }, w === week ? 'This week' : `Week ${w}`),
              h('span', { class: 'jm-theme' }, theme(w)),
              mine.length ? h('span', { class: 'jm-prog' }, h('i', { class: 'jm-meter' }, h('i', { style: `width:${Math.round((d2 / mine.length) * 100)}%` })), h('span', null, st === 'late' ? `${mine.length - d2} left` : `${d2}/${mine.length}`)) : h('span', { class: 'jm-prog' })));
          stops.set(w, el);
          return el;
        })));
    }));

  const legend = h('div', { class: 'jm-legend' },
    h('span', null, h('i', { class: 'jm-k done' }), 'Done'), h('span', null, h('i', { class: 'jm-k now' }), 'This week'),
    h('span', null, h('i', { class: 'jm-k late' }), 'Steps to catch up'), h('span', null, h('i', { class: 'jm-k next' }), 'Coming up'),
    h('span', null, h('i', { class: 'jm-k jack' }), 'Session with Jack'), h('span', { class: 'jm-hint' }, small() ? 'Tap a week to see its steps' : 'Select a week to see its steps'));

  const root = h('div', { class: 'jm' }, head, route, detail, legend);
  select(week);
  return root;
}
