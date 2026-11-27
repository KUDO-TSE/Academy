import { h, api, toast, pct, fmtDate, dateOnly, KIND, DELIVERY, reading, metaRow } from './ui.js';
import { pairedBars, lineChart, COLORS, progressDumbbell } from './charts.js';
import { SCENARIOS as SANDBOXES } from './sandbox.js';

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
const kpi = (l, v, note, keep) => h('div', { class: 'card kpi' }, h('div', { class: 'label' }, l), h('div', { class: 'value' }, v), h('div', { class: keep ? 'note keep' : 'note' }, note));
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
      kpi('Knowledge test', lo ? (lo.total ? `${lo.correct}/${lo.total}` : pct(lo.pct)) : 'None', lo ? `${pct(lo.pct)}, ${live.round.label}` : 'Not taken yet'),
      kpi('Self assessment', so ? pct(so.pct) : 'None', so ? self.round.label : 'Not completed yet'),
      kpi('Training plan', data.plan.length ? `${done}/${data.plan.length}` : 'None', data.plan.length ? 'items completed' : 'Your plan is on its way'),
      kpi('Next due', open[0]?.due_date ? fmtDate(open[0].due_date) : 'None', open[0] ? open[0].title : 'Nothing scheduled', true),
    ),
    h('div', { class: 'grid g-8-4', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h2', null, 'Self rating vs knowledge test'), h('p', { class: 'sub' }, 'How you rated yourself next to what you scored, by scenario'),
        legend(), self || live ? pairedBars(rows.filter((r) => r.self != null || r.live != null).map((r) => ({ ...r, label: r.short }))) : h('div', { class: 'empty' }, 'Your results will appear here once they are loaded.')),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('h2', null, 'Where to focus'), h('p', { class: 'sub' }, 'Your three lowest test areas'),
          withLive.length ? withLive.slice(0, 3).map((r) => h('div', { style: 'margin-bottom:12px' }, h('div', { class: 'row spread' }, h('b', null, r.short), h('span', { class: 'chip coral' }, pct(r.live))), h('div', { class: 'bar dark', style: 'margin-top:6px' }, h('i', { style: `width:${r.live}%` })))) : h('div', { class: 'muted' }, 'Shown once your test results are in.')),
        h('div', { class: 'card' }, h('h2', null, 'Your strengths'), h('p', { class: 'sub' }, 'Your three highest test areas'),
          withLive.length ? withLive.slice(-3).reverse().map((r) => h('div', { class: 'row spread', style: 'margin-bottom:8px' }, h('b', null, r.short), h('span', { class: 'chip green' }, pct(r.live)))) : h('div', { class: 'muted' }, 'Shown once your test results are in.')))),
    data.notes.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Notes from the Academy team'), h('p', { class: 'sub' }, 'Shared with you by your coach'),
      data.notes.map((n) => h('div', { class: 'note-box' }, h('div', null, n.body), h('div', { class: 'when' }, fmtDate(n.created_at))))) : null,
    open.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'row spread' }, h('h2', null, 'Coming up'), h('a', { href: '#plan' }, 'See full plan')),
      open.slice(0, 3).map((p) => h('div', { class: 'row spread', style: 'padding:10px 0;border-top:1px solid var(--border-soft)' }, h('div', null, h('b', null, p.title), h('div', { class: 'muted small' }, metaRow([KIND[p.kind], p.scenario ? shortOf(data, p.scenario) : null]))), h('span', { class: 'chip' }, p.due_date ? fmtDate(p.due_date) : `Month ${p.month}`)))) : null,
  );
}

const legend = () => h('div', { class: 'legend' }, h('span', null, h('i', { style: `background:${COLORS.self}` }), 'Self rating'), h('span', null, h('i', { style: `background:${COLORS.live}` }), 'Knowledge test'));

export function resultsView(data, live = null) {
  const showLive = !!live; // the trainee's own page (the admin preview has no live part)
  const self = latest(data, 'self'); live = latest(data, 'live');
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
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My results'), h('p', null, showLive ? 'Your scores on every test: the Academy\'s module tests, decision walkthroughs and explain-it recordings, then your October Self Assessment and knowledge test. How they move your level is on My progress.' : live ? `${live.round.label}${lo?.total ? `, ${lo.correct} of ${lo.total} correct` : ''}` : 'Your test results will show here once they are in.'))),
    showLive ? academyResults() : null,
    showLive ? h('div', { class: 'section-h' }, h('h2', null, 'Where you started: October'), h('p', null, live ? `Self Assessment and ${live.round.label}${lo?.total ? `, ${lo.correct} of ${lo.total} correct` : ''}. These stay as your baseline record.` : 'Self Assessment and live test, your baseline record.')) : null,
    !self && !live ? empty('No results yet', 'Your Self Assessment and knowledge test results will appear here.') : h('div', { class: 'stack' },
      h('div', { class: 'card' }, h('h2', null, 'By scenario'), h('p', { class: 'sub' }, 'Self ratings are your 1 to 5 answers shown as a percentage, so they sit next to your test score.'), legend(), pairedBars(rows.map((r) => ({ ...r, label: r.short })))),
      h('div', { class: 'card' }, h('h2', null, 'Reading your results'),
        h('div', { class: 'tbl-wrap', style: 'margin-top:12px' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Scenario', 'Self rating', 'Test', 'Correct', 'Reading'].map((x, i) => h('th', { class: i > 0 && i < 4 ? 'num' : '' }, x)))),
          h('tbody', null, rows.map((r) => { const rd = reading(r.self, r.live); return h('tr', null, h('td', null, h('b', null, r.label)), h('td', { class: 'num' }, pct(r.self)), h('td', { class: 'num' }, pct(r.live)), h('td', { class: 'num' }, r.c?.total ? `${r.c.correct}/${r.c.total}` : 'None'), h('td', null, rd ? h('span', { class: `chip ${rd.cls}` }, rd.label) : h('span', { class: 'muted' }, 'None'))); })))),
        h('p', { class: 'muted small', style: 'margin:12px 0 0' }, 'Under-rated: you scored at least 8 points above your rating. Over-confident: you scored at least 5 points below it.')),
      h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'Questions to review'), h('p', { class: 'sub' }, 'The questions you missed, with the correct answer')),
        liveRounds.length > 1 ? h('select', { style: 'width:auto', 'aria-label': 'Test', on: { change: (e) => { qRound = Number(e.target.value); drawQ(); } } }, liveRounds.map((r) => h('option', { value: r.id, selected: r.id === qRound }, r.label))) : null), qBox)));
}

export function progressView(data, live = null) {
  const showLive = !!live;
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
    h('tbody', null, data.targets.map((t) => { const cur = lat?.map[t.scenario]?.pct ?? null; const met = cur != null && cur >= t.target_pct; return h('tr', null, h('td', null, h('b', null, label(data, t.scenario))), h('td', { class: 'num' }, pct(cur)), h('td', { class: 'num' }, pct(t.target_pct)), h('td', null, fmtDate(t.due_date)), h('td', null, cur == null ? h('span', { class: 'muted' }, 'None') : h('span', { class: `chip ${met ? 'green' : 'amber'}` }, met ? 'On target' : `${Math.round(t.target_pct - cur)} pts to go`))); })))) : h('div', { class: 'muted' }, 'Your personal targets will be set with your coach.'));
  draw();
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My progress'), h('p', null, showLive ? 'How your level in each scenario moves with every test you take, measured against where you started in October.' : 'How your results move at each checkpoint: Self Assessment and a fresh knowledge test every quarter.'))),
    showLive ? progressLive() : null,
    showLive ? h('div', { class: 'section-h' }, h('h2', null, 'Quarterly checkpoints'), h('p', null, 'Your Self Assessment and knowledge test, every three months. Each new test becomes your new starting point.')) : null,
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

// ------------------------------------------------------------------ live progress from the Academy's tests
const ago = (d) => { const days = Math.round((Date.now() - new Date(d)) / 864e5); return days <= 0 ? 'Today' : days === 1 ? 'Yesterday' : days < 7 ? `${days} days ago` : fmtDate(d); };
const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '±0');
const KIND_LABEL = { check: 'Module test', scenario: 'Decision walkthrough', baseline: 'Baseline check', explain: 'Explain it' };
const loadLive = () => api('GET', '/api/me/progress-live');
const fact = (k, v, sub, cls = '') => h('div', { class: `jm-fact ${cls}` }, h('span', { class: 'jm-fk' }, k), h('b', null, v), sub ? h('span', { class: 'jm-fs' }, sub) : null);
const loading = (what) => h('div', { class: 'card muted' }, `Loading ${what}…`);
const failed = (e) => h('div', { class: 'card empty' }, h('b', null, 'This part could not load'), e.message);

/** My results: the scores themselves, test by test. No level changes here: those are on My progress. */
function academyResults() {
  const box = h('div', { class: 'stack lp-live' }, loading('your Academy results'));
  loadLive().then((d) => {
    const taken = d.modules.filter((m) => m.check), passed = taken.filter((m) => m.check.passed);
    const avg = taken.length ? Math.round(taken.reduce((t, m) => t + m.check.pct, 0) / taken.length) : null;
    const ex = d.modules.filter((m) => m.explain);
    const head = h('div', { class: 'jm-head' },
      fact('Module tests taken', `${taken.length} of ${d.modules.length}`, 'Your first attempt is the result of record'),
      fact('Passed', taken.length ? `${passed.length} of ${taken.length}` : 'None', `Pass mark ${Math.round(d.pass * 100)}%`, taken.length && passed.length === taken.length ? 'good' : ''),
      fact('Average score', avg != null ? `${avg}%` : 'None', 'Across your module tests of record'),
      fact('Explain-it recordings', String(ex.length), ex.length ? `${ex.filter((m) => m.explain.reviewed).length} reviewed by your KUDO Trainer` : 'None sent yet'));
    const row = (m) => h('tr', null,
      h('td', null, h('a', { href: `#module-${m.key}` }, m.title), h('div', { class: 'muted small' }, m.short || 'Cross-cutting topic')),
      h('td', { class: 'num' }, m.check ? h('span', null, `${m.check.pct}%`, h('span', { class: `chip ${m.check.passed ? 'green' : 'amber'}`, style: 'margin-left:8px' }, m.check.passed ? 'Passed' : 'Below pass')) : h('a', { class: 'small', href: `#module-${m.key}` }, 'Not taken')),
      h('td', { class: 'num' }, m.walk ? `${m.walk.pct}%` : 'None'),
      h('td', { class: 'num' }, m.explain ? h('span', { title: m.explain.reviewed ? 'Reviewed by your KUDO Trainer' : 'Automatic review: your KUDO Trainer may change it' }, `${m.explain.pct}%`, h('span', { class: 'muted small' }, m.explain.reviewed ? ' reviewed' : ' auto')) : 'None'),
      h('td', { class: 'num muted small' }, m.practice ? `${m.practice.n}, best ${m.practice.best}%` : 'None'),
      h('td', { class: 'num muted small' }, m.check ? fmtDate(m.check.at) : 'None'));
    const table = h('div', { class: 'card' }, h('h2', null, 'Academy tests, module by module'), h('p', { class: 'sub' }, 'Your result of record is your first attempt. Retakes are practice: they show here and never replace it'),
      (() => { const done = d.modules.filter((m) => m.check || m.walk || m.explain || m.practice), rest = d.modules.filter((m) => !done.includes(m));
        const thead = h('thead', null, h('tr', null, ['Module', 'Module test', 'Walkthrough', 'Explain it', 'Practice retakes', 'Taken'].map((x, i) => h('th', { class: i ? 'num' : null }, x))));
        return h('div', null, done.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, thead, h('tbody', null, done.map(row)))) : h('p', { class: 'muted' }, 'No module test yet.'),
          rest.length ? h('details', { class: 'not-taken' }, h('summary', null, `${rest.length} module${rest.length > 1 ? 's' : ''} not taken yet`), h('div', { class: 'chips-wrap' }, rest.map((m) => h('a', { class: 'chip grey', href: `#module-${m.key}` }, m.title)))) : null); })());
    const list = h('div', { class: 'card' }, h('h2', null, 'Every attempt'), h('p', { class: 'sub' }, 'Newest first. Results of record and practice'),
      d.attempts.length ? h('ul', { class: 'lp-feed' }, d.attempts.slice(0, 40).map((a) => h('li', null,
        h('span', { class: 'muted small lp-when' }, ago(a.at)),
        h('div', { class: 'lp-what' }, h('a', { href: `#module-${a.module}` }, a.moduleTitle), h('span', { class: 'muted small sep-l' }, `${KIND_LABEL[a.kind] || 'Test'}${a.kind === 'explain' ? (a.reviewed ? ', reviewed by your KUDO Trainer' : ', automatic review') : ''}`)),
        h('div', { class: 'lp-eff' }, h('span', { class: `chip ${a.record ? 'blue' : 'grey'}` }, a.record ? 'Result of record' : 'Practice'), h('b', null, a.pct != null ? `${a.pct}%` : 'None'))))) : h('p', { class: 'muted', style: 'margin:8px 0 0' }, 'No test yet. Open a module and take its test.'));
    const sbx = h('div', { class: 'card' }, h('h2', null, 'Sandbox exercises'), h('p', { class: 'sub' }, 'Hands-on tasks on the replica of the KUDO screens. Your first run is the result of record; pass mark 80%'), h('div', { class: 'muted' }, 'Loading…'));
    api('GET', '/api/me/sandbox').then(({ scenarios }) => {
      const title = (k) => SANDBOXES[k] ? `Scenario ${SANDBOXES[k].num}: ${SANDBOXES[k].title}` : k;
      sbx.lastChild.replaceWith(h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Exercise', 'Result of record', 'Runs', 'Best', 'Taken'].map((x, i) => h('th', { class: i ? 'num' : null }, x)))),
        h('tbody', null, [...scenarios].sort((a, b) => (SANDBOXES[a.key]?.num || 99) - (SANDBOXES[b.key]?.num || 99)).map((x) => h('tr', null, h('td', null, h('a', { href: `#sandbox-${x.key}` }, title(x.key))),
          h('td', { class: 'num' }, x.record ? h('span', null, `${x.record.score}%`, h('span', { class: `chip ${x.record.score >= 80 ? 'green' : 'amber'}`, style: 'margin-left:8px' }, x.record.score >= 80 ? 'Passed' : 'Below 80%')) : h('a', { class: 'small', href: `#sandbox-${x.key}` }, 'Not tried')),
          h('td', { class: 'num muted small' }, String(x.runs)), h('td', { class: 'num muted small' }, x.best != null ? `${x.best}%` : 'None'), h('td', { class: 'num muted small' }, x.record ? fmtDate(x.record.at) : 'None')))))));
    }).catch(() => sbx.lastChild.replaceWith(h('div', { class: 'muted' }, 'Could not load the sandbox results.')));
    box.replaceChildren(head, table, sbx, list);
  }).catch((e) => box.replaceChildren(failed(e)));
  return box;
}

/** My progress: how the tests move each level, against October. */
function progressLive() {
  const box = h('div', { class: 'stack lp-live' }, loading('your progress'));
  loadLive().then((d) => {
    const sc = d.scenarios, tested = sc.filter((s) => s.tests);
    const up = [...tested].sort((a, b) => b.delta - a.delta)[0], down = [...tested].sort((a, b) => a.delta - b.delta)[0];
    const counted = d.feed.length;
    const dOverall = d.overall.now - d.overall.start;
    const head = h('div', { class: 'jm-head' },
      fact('Readiness now', `${d.overall.now}%`, `${d.overall.start}% in October, ${signed(dOverall)} points`, dOverall > 0 ? 'good' : dOverall < 0 ? 'late' : ''),
      fact('Tests that moved a level', String(counted), counted ? `Across ${tested.length} scenario${tested.length > 1 ? 's' : ''}` : 'Take a module test to start'),
      fact('Biggest gain', up && up.delta > 0 ? `${up.short} ${signed(up.delta)}` : 'Not yet', up && up.delta > 0 ? `${up.start}% → ${up.now}%` : 'A good test result lifts a level', up && up.delta > 0 ? 'good' : ''),
      fact('To watch', down && down.delta < 0 ? `${down.short} ${signed(down.delta)}` : 'Nothing went down', down && down.delta < 0 ? `${down.start}% → ${down.now}%: go back to the lesson, then practise` : 'No scenario is below October', down && down.delta < 0 ? 'late' : ''));
    const rows = [...sc].sort((a, b) => b.delta - a.delta || b.tests - a.tests).map((s) => ({ ...s, label: s.short }));
    const chart = h('div', { class: 'card' }, h('h2', null, 'Since October, scenario by scenario'),
      h('p', { class: 'sub' }, 'Hollow dot: your October level. Full dot: where your tests put you now. Green: up. Coral: down. The tick is your target'),
      progressDumbbell(rows));
    // One scenario over time: October, then each test that moved it
    const pick = h('select', { style: 'width:auto', 'aria-label': 'Scenario' }, [...sc].sort((a, b) => b.tests - a.tests).map((s) => h('option', { value: s.key }, `${s.short}${s.tests ? ` (${s.tests} test${s.tests > 1 ? 's' : ''})` : ''}`)));
    const lineBox = h('div');
    const drawLine = () => {
      const s = sc.find((x) => x.key === pick.value);
      const seen = {}; const lab = (dt) => { const k = new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); seen[k] = (seen[k] || 0) + 1; return seen[k] > 1 ? `${k} (${seen[k]})` : k; };
      const labels = ['October', ...s.history.map((x) => lab(x.at))];
      const pts = [s.start, ...s.history.map((x) => x.v)];
      lineBox.replaceChildren(s.history.length ? lineChart(labels, [{ name: 'Level', color: COLORS.live, points: labels.map((x, i) => ({ x, y: pts[i] })) }], { targetY: s.target }) : h('p', { class: 'muted', style: 'margin:12px 0 0' }, `No test has moved your ${s.short} level yet. It is ${s.now}%, from October.`));
    };
    pick.addEventListener('change', drawLine); drawLine();
    const over = h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'One scenario over time'), h('p', { class: 'sub', style: 'margin:2px 0 0' }, 'October, then each test that moved it. The dashed line is your target')), pick), lineBox);
    const feed = h('div', { class: 'card' }, h('h2', null, 'What moved your level'), h('p', { class: 'sub' }, 'Newest first, with what each test did'),
      d.feed.length ? h('ul', { class: 'lp-feed' }, d.feed.slice(0, 30).map((e) => { const ch = e.to - e.from; return h('li', null,
        h('span', { class: 'muted small lp-when' }, ago(e.at)),
        h('div', { class: 'lp-what' }, e.module !== 'baseline' ? h('a', { href: `#module-${e.module}` }, e.moduleTitle) : h('b', null, e.moduleTitle), h('span', { class: 'muted small sep-l' }, `${KIND_LABEL[e.kind] || 'Test'}${e.kind === 'explain' ? (e.reviewed ? ', reviewed by your KUDO Trainer' : ', automatic review') : ''}, you scored ${e.score}%`)),
        h('div', { class: 'lp-eff' }, h('span', null, `${e.short} ${e.from}% → ${e.to}%`), h('span', { class: `lp-d ${ch > 0 ? 'up' : ch < 0 ? 'down' : ''}` }, signed(ch)))); }))
        : h('p', { class: 'muted', style: 'margin:8px 0 0' }, 'Nothing yet. Your first attempt at a module test moves your level.'));
    const rules = h('div', { class: 'card lp-rules' }, h('h2', null, 'What moves your level'),
      h('div', { class: 'grid g2' },
        h('div', null, h('b', { class: 'lp-yes' }, 'Counts'), h('ul', null, h('li', null, 'Your first attempt at each module test'), h('li', null, 'Your first decision walkthrough in each module'), h('li', null, 'Your first explain-it recording. If your KUDO Trainer reviews it, their score replaces the automatic one'), h('li', null, 'The baseline check'), h('li', null, 'The quarterly knowledge test, which resets your starting point'))),
        h('div', null, h('b', { class: 'lp-no' }, 'Does not count'), h('ul', null, h('li', null, 'Reading the lessons and watching the videos'), h('li', null, 'Practice tasks (feedback only)'), h('li', null, 'Retakes, the weekly challenge and spaced reviews'), h('li', null, 'Ticking steps off your plan')))),
      h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Each test pulls your level most of the way towards its score: a good result lifts it, a poor one lowers it. Only your first attempt counts, so read the lesson and take the test when you feel ready'));
    box.replaceChildren(head, chart, over, feed, rules);
  }).catch((e) => box.replaceChildren(failed(e)));
  return box;
}
