import { h, api, toast, pct, fmtDate, dateOnly, KIND, DELIVERY, reading } from './ui.js';
import { pairedBars, lineChart, COLORS } from './charts.js';

// `data` has the shape returned by GET /api/me. The admin "View as trainee" preview builds the same shape.
const roundsOf = (data, kind) => data.rounds.filter((r) => r.kind === kind && data.scores.some((s) => s.round_id === r.id));
export const scoresFor = (data, roundId) => Object.fromEntries(data.scores.filter((s) => s.round_id === roundId).map((s) => [s.scenario, s]));
export function latest(data, kind) {
  const rs = roundsOf(data, kind);
  const r = rs[rs.length - 1];
  return r ? { round: r, map: scoresFor(data, r.id) } : null;
}
const label = (data, key) => data.scenarios.find((s) => s.key === key)?.label || key;
const shortOf = (data, key) => data.scenarios.find((s) => s.key === key)?.short || key;
const kpi = (l, v, note) => h('div', { class: 'card kpi' }, h('div', { class: 'label' }, l), h('div', { class: 'value' }, v), h('div', { class: 'note' }, note));
const empty = (title, text) => h('div', { class: 'card empty' }, h('b', null, title), text);

export function homeView(data, ctx = {}) {
  const self = latest(data, 'self'), live = latest(data, 'live');
  const so = self?.map.overall, lo = live?.map.overall;
  const done = data.plan.filter((p) => p.status === 'done').length;
  const open = data.plan.filter((p) => p.status !== 'done').sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
  const rows = data.scenarios.map((s) => ({ key: s.key, short: s.short, self: self?.map[s.key]?.pct ?? null, live: live?.map[s.key]?.pct ?? null }));
  const withLive = rows.filter((r) => r.live != null).sort((a, b) => a.live - b.live);
  const first = (data.user.name || '').split(' ')[0];

  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, `Welcome, ${first}`), h('p', null, 'Your Academy results, progress and training plan. Only you and the Academy team can see this.'))),
    h('div', { class: 'grid g4' },
      kpi('Knowledge test', lo ? (lo.total ? `${lo.correct}/${lo.total}` : pct(lo.pct)) : '–', lo ? `${pct(lo.pct)} · ${live.round.label}` : 'Not taken yet'),
      kpi('Self assessment', so ? pct(so.pct) : '–', so ? self.round.label : 'Not completed yet'),
      kpi('Training plan', data.plan.length ? `${done}/${data.plan.length}` : '–', data.plan.length ? 'items completed' : 'Your plan is on its way'),
      kpi('Next due', open[0]?.due_date ? fmtDate(open[0].due_date) : '–', open[0] ? open[0].title : 'Nothing scheduled'),
    ),
    h('div', { class: 'grid g-8-4', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h2', null, 'Self rating vs knowledge test'), h('p', { class: 'sub' }, 'How you rated yourself next to what you scored, by scenario.'),
        legend(), self || live ? pairedBars(rows.filter((r) => r.self != null || r.live != null).map((r) => ({ ...r, label: r.short }))) : h('div', { class: 'empty' }, 'Your results will appear here once they are loaded.')),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'Where to focus'), h('p', { class: 'sub' }, 'Your three lowest test areas.'),
          withLive.length ? withLive.slice(0, 3).map((r) => h('div', { style: 'margin-bottom:12px' }, h('div', { class: 'row spread' }, h('b', null, r.short), h('span', { class: 'chip coral' }, pct(r.live))), h('div', { class: 'bar dark', style: 'margin-top:6px' }, h('i', { style: `width:${r.live}%` })))) : h('div', { class: 'muted' }, 'Shown once your test results are in.')),
        h('div', { class: 'card' }, h('h2', null, 'Your strengths'), h('p', { class: 'sub' }, 'Your three highest test areas.'),
          withLive.length ? withLive.slice(-3).reverse().map((r) => h('div', { class: 'row spread', style: 'margin-bottom:8px' }, h('b', null, r.short), h('span', { class: 'chip green' }, pct(r.live)))) : h('div', { class: 'muted' }, 'Shown once your test results are in.')))),
    data.notes.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Notes from the Academy team'), h('p', { class: 'sub' }, 'Shared with you by your coach.'),
      data.notes.map((n) => h('div', { class: 'note-box' }, h('div', null, n.body), h('div', { class: 'when' }, fmtDate(n.created_at))))) : null,
    open.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'row spread' }, h('h2', null, 'Coming up'), h('a', { href: '#plan' }, 'See full plan')),
      open.slice(0, 3).map((p) => h('div', { class: 'row spread', style: 'padding:10px 0;border-top:1px solid var(--border-soft)' }, h('div', null, h('b', null, p.title), h('div', { class: 'muted small' }, [KIND[p.kind], p.scenario ? shortOf(data, p.scenario) : null].filter(Boolean).join(' · '))), h('span', { class: 'chip' }, p.due_date ? fmtDate(p.due_date) : `Month ${p.month}`)))) : null,
  );
}

const legend = () => h('div', { class: 'legend' }, h('span', null, h('i', { style: `background:${COLORS.self}` }), 'Self rating'), h('span', null, h('i', { style: `background:${COLORS.live}` }), 'Knowledge test'));

export function resultsView(data) {
  const self = latest(data, 'self'), live = latest(data, 'live');
  const rows = data.scenarios.map((s) => ({ key: s.key, label: s.label, short: s.short, self: self?.map[s.key]?.pct ?? null, live: live?.map[s.key]?.pct ?? null, c: live?.map[s.key] }));
  const liveRounds = roundsOf(data, 'live');
  let qRound = liveRounds.length ? liveRounds[liveRounds.length - 1].id : null;
  const qBox = h('div');
  const drawQ = () => {
    qBox.replaceChildren();
    const qs = data.questions.filter((q) => q.round_id === qRound && !q.correct);
    const all = data.questions.filter((q) => q.round_id === qRound);
    if (!all.length) { qBox.append(h('div', { class: 'muted' }, 'Question-by-question results are not available for this test.')); return; }
    if (!qs.length) { qBox.append(h('div', { class: 'ok' }, 'You answered every question correctly. Well done.')); return; }
    qs.forEach((q) => qBox.append(h('div', { class: 'q-item' }, h('div', { class: 'row' }, h('span', { class: 'chip blue' }, shortOf(data, q.scenario)), q.level ? h('span', { class: 'chip grey' }, q.level) : null), h('div', { style: 'margin-top:6px;font-weight:600' }, q.question), q.answer ? h('div', { class: 'a' }, 'Correct answer: ', q.answer) : null)));
  };
  drawQ();
  const lo = live?.map.overall;
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My results'), h('p', null, live ? `${live.round.label}${lo?.total ? ` · ${lo.correct} of ${lo.total} correct` : ''}` : 'Your test results will show here once they are in.'))),
    !self && !live ? empty('No results yet', 'Your Self Assessment and knowledge test results will appear here.') : h('div', { class: 'stack' },
      h('div', { class: 'card' }, h('h2', null, 'By scenario'), h('p', { class: 'sub' }, 'Self ratings are your 1 to 5 answers shown as a percentage, so they sit next to your test score.'), legend(), pairedBars(rows.map((r) => ({ ...r, label: r.short })))),
      h('div', { class: 'card' }, h('h2', null, 'Reading your results'),
        h('div', { class: 'tbl-wrap', style: 'margin-top:12px' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Scenario', 'Self rating', 'Test', 'Correct', 'Reading'].map((x, i) => h('th', { class: i > 0 && i < 4 ? 'num' : '' }, x)))),
          h('tbody', null, rows.map((r) => { const rd = reading(r.self, r.live); return h('tr', null, h('td', null, h('b', null, r.label)), h('td', { class: 'num' }, pct(r.self)), h('td', { class: 'num' }, pct(r.live)), h('td', { class: 'num' }, r.c?.total ? `${r.c.correct}/${r.c.total}` : '–'), h('td', null, rd ? h('span', { class: `chip ${rd.cls}` }, rd.label) : h('span', { class: 'muted' }, '–'))); })))),
        h('p', { class: 'muted small', style: 'margin:12px 0 0' }, 'Under-rated: you scored at least 8 points above your rating. Over-confident: you scored at least 5 points below it.')),
      h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'Questions to review'), h('p', { class: 'sub' }, 'The questions you missed, with the correct answer.')),
        liveRounds.length > 1 ? h('select', { style: 'width:auto', 'aria-label': 'Test', on: { change: (e) => { qRound = Number(e.target.value); drawQ(); } } }, liveRounds.map((r) => h('option', { value: r.id, selected: r.id === qRound }, r.label))) : null), qBox)));
}

export function progressView(data) {
  const sRounds = roundsOf(data, 'self'), lRounds = roundsOf(data, 'live');
  const all = [...sRounds, ...lRounds].sort((a, b) => a.sort - b.sort || a.id - b.id);
  const sel = h('select', { style: 'width:auto', 'aria-label': 'Scenario' }, h('option', { value: 'overall' }, 'Overall'), data.scenarios.map((s) => h('option', { value: s.key }, s.label)));
  const chartBox = h('div'), tgtBox = h('div');
  const draw = () => {
    const k = sel.value;
    const labels = [...new Set(all.map((r) => r.label.replace(/ (Self Assessment|Knowledge Test)$/i, '')))];
    const val = (kind, rr) => { const r = (kind === 'self' ? sRounds : lRounds).find((x) => x.label.replace(/ (Self Assessment|Knowledge Test)$/i, '') === rr); return r ? scoresFor(data, r.id)[k]?.pct ?? null : null; };
    const t = data.targets.find((x) => x.scenario === k);
    chartBox.replaceChildren(
      h('div', { class: 'legend' }, h('span', null, h('i', { style: `background:${COLORS.self}` }), 'Self rating'), h('span', null, h('i', { style: `background:${COLORS.live}` }), 'Knowledge test'), t ? h('span', null, h('i', { style: `background:${COLORS.target}` }), 'Target') : null),
      lineChart(labels, [{ name: 'Self', color: COLORS.self, points: labels.map((x) => ({ x, y: val('self', x) })) }, { name: 'Test', color: COLORS.live, points: labels.map((x) => ({ x, y: val('live', x) })) }], { targetY: t ? Math.round(t.target_pct) : null }));
  };
  sel.addEventListener('change', draw);
  const lat = latest(data, 'live') || latest(data, 'self');
  tgtBox.append(data.targets.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Scenario', 'Latest', 'Target', 'By', 'Status'].map((x, i) => h('th', { class: i === 1 || i === 2 ? 'num' : '' }, x)))),
    h('tbody', null, data.targets.map((t) => { const cur = lat?.map[t.scenario]?.pct ?? null; const met = cur != null && cur >= t.target_pct; return h('tr', null, h('td', null, h('b', null, label(data, t.scenario))), h('td', { class: 'num' }, pct(cur)), h('td', { class: 'num' }, pct(t.target_pct)), h('td', null, fmtDate(t.due_date)), h('td', null, cur == null ? h('span', { class: 'muted' }, '–') : h('span', { class: `chip ${met ? 'green' : 'amber'}` }, met ? 'On target' : `${Math.round(t.target_pct - cur)} pts to go`))); })))) : h('div', { class: 'muted' }, 'Your personal targets will be set with your coach.'));
  draw();
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My progress'), h('p', null, 'How your results move at each checkpoint: Self Assessment and a fresh knowledge test every quarter.'))),
    all.length ? h('div', { class: 'stack' }, h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h2', null, 'Over time'), sel), chartBox,
      all.length < 3 ? h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'More points will appear after the next quarterly checkpoint.') : null),
      h('div', { class: 'card' }, h('h2', null, 'My targets'), h('p', { class: 'sub' }, 'Set with your coach. Latest uses your most recent test, or Self Assessment if no test yet.'), tgtBox)) : empty('Nothing to chart yet', 'Your progress appears after your first results are loaded.'));
}

export function planView(data, { readOnly = false, onChange } = {}) {
  const total = data.plan.length, done = data.plan.filter((p) => p.status === 'done').length;
  const p100 = total ? Math.round((done / total) * 100) : 0;
  const col = (m) => {
    const items = data.plan.filter((p) => p.month === m);
    return h('div', { class: 'month-col' }, h('h3', null, `Month ${m}`, h('span', { class: 'chip grey' }, `${items.filter((i) => i.status === 'done').length}/${items.length}`)),
      items.length ? items.map((p) => planItem(data, p, { readOnly, onChange })) : h('div', { class: 'muted small' }, 'Nothing planned yet.'));
  };
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My training plan'), h('p', null, 'Your next three months, built around your results and the scenarios your clients bring you.')),
      total ? h('div', { class: 'row' }, h('div', { class: 'ring', style: `--p:${p100}`, role: 'img', 'aria-label': `${p100}% complete` }, h('b', null, `${p100}%`)), h('div', { class: 'muted' }, `${done} of ${total} done`)) : null),
    total ? h('div', { class: 'grid g3' }, [1, 2, 3].map(col)) : empty('Your plan is on its way', 'Your Academy team is preparing a plan customised to your results. It will appear here.'));
}

function planItem(data, p, { readOnly, onChange }) {
  const sel = h('select', { 'aria-label': `Status of ${p.title}`, disabled: readOnly, on: { change: async (e) => {
    try { await api('PATCH', `/api/me/plan/${p.id}`, { status: e.target.value }); p.status = e.target.value; toast('Saved'); onChange?.(); }
    catch (err) { toast(err.message, true); e.target.value = p.status; } } } },
  [['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Done']].map(([v, l]) => h('option', { value: v, selected: p.status === v }, l)));
  return h('div', { class: `plan-item ${p.status === 'done' ? 'done' : ''}` },
    h('div', { class: 't' }, p.title),
    h('div', { class: 'meta' }, h('span', { class: 'chip blue' }, KIND[p.kind] || p.kind), p.scenario ? h('span', { class: 'chip' }, shortOf(data, p.scenario)) : null, h('span', { class: 'chip grey' }, DELIVERY[p.delivery]), p.due_date ? h('span', { class: 'chip amber' }, `Due ${fmtDate(p.due_date)}`) : null),
    p.description ? h('div', { class: 'd' }, p.description) : null,
    h('div', { class: 'row spread' }, sel, p.link ? h('a', { href: p.link, target: '_blank', rel: 'noopener noreferrer' }, 'Open resource') : null));
}
void dateOnly;
