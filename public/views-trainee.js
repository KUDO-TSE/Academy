import { h, api, toast, pct, fmtDate, dateOnly, KIND, DELIVERY, reading, metaRow, svg } from './ui.js';
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

/** The score ring used on My results: course tiles, the average and the starting point. */
function scoreRing(v, cls, { size = 56, label = '' } = {}) {
  const sw = size > 80 ? 10 : 6, r = (size - sw) / 2 - 1, c = 2 * Math.PI * r, f = v == null ? 0 : Math.max(0, Math.min(100, v)) / 100, m = size / 2;
  return h('div', { class: `ct-ring ${cls} ${size > 80 ? 'big' : ''}`, style: `width:${size}px;height:${size}px;flex-basis:${size}px`, role: 'img', 'aria-label': label },
    svg(`<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="var(--n-100)" stroke-width="${sw}"/><circle cx="${m}" cy="${m}" r="${r}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 ${m} ${m})"/></svg>`),
    h('b', null, v == null ? '–' : `${v}`, v == null ? null : h('small', null, '%')));
}
const legend = () => h('div', { class: 'legend' }, h('span', null, h('i', { style: `background:${COLORS.self}` }), 'Self rating'), h('span', null, h('i', { style: `background:${COLORS.live}` }), 'Knowledge test'));

export function resultsView(data, live = null) {
  const showLive = !!live; // the trainee's own page (the admin preview has no live part)
  const self = latest(data, 'self'); live = latest(data, 'live');
  const rows = data.scenarios.map((s) => ({ key: s.key, label: s.label, short: s.short, self: self?.map[s.key]?.pct ?? null, live: live?.map[s.key]?.pct ?? null, c: live?.map[s.key] }));
  const lo = live?.map.overall;
  const spCard = (inCard) => (!self && !live ? (inCard ? null : empty('No results yet', 'Your Self Assessment and knowledge test results will appear here.')) :
h(inCard ? 'section' : 'div', { class: inCard ? 'sp-section' : 'card sp-card' }, inCard ? h('h2', null, 'My Starting Point: Self-assessment and Test Results') : h('h2', null, 'Self rating and test, scenario by scenario'), inCard ? h('p', { class: 'sub keep' }, live ? `Self Assessment and ${live.round.label}${lo?.total ? `, ${lo.correct} of ${lo.total} correct` : ''}. These stay as your baseline record.` : 'Self Assessment and live test, your baseline record.') : null,
        h('p', { class: 'sub keep' }, 'The ring is your knowledge test score. The bar under it is your Self Assessment (your 1 to 5 answers as a percentage). The label compares the two.'),
        h('div', { class: 'ct-legend' }, h('span', null, h('i', { class: 'pass' }), '80% or more'), h('span', null, h('i', { class: 'below' }), 'Below 80%'), h('span', null, h('i', { class: 'self' }), 'Self rating')),
        h('div', { class: 'sp-grid' }, rows.map((r) => { const rd = reading(r.self, r.live), cls = r.live == null ? 'todo' : r.live >= 80 ? 'pass' : 'below';
          return h('div', { class: `sp-tile ${rd ? `rd-${rd.cls}` : ''}` },
            h('div', { class: 'ct-head' }, scoreRing(r.live == null ? null : Math.round(r.live), cls, { label: r.live == null ? `${r.label}: no test score` : `${r.label}: test ${Math.round(r.live)}%` }),
              h('div', { class: 'ct-t' }, h('b', null, r.label), h('div', { class: 'ct-sub' }, r.c?.total ? h('span', { class: 'muted small' }, `${r.c.correct} of ${r.c.total} correct`) : null, rd ? h('span', { class: `chip ${rd.cls}` }, rd.label) : null))),
            h('div', { class: 'sp-self' }, h('span', null, 'Self rating'), h('span', { class: 'sp-bar' }, h('i', { style: `width:${r.self ?? 0}%` })), h('b', null, pct(r.self))));
        })),
        h('p', { class: 'muted small', style: 'margin:12px 0 0' }, 'Under-rated: you scored at least 8 points above your rating. Over-confident: you scored at least 5 points below it.')));
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My results'), h('p', null, showLive ? 'Your completed courses with every score, then your starting point: your Self Assessment and knowledge test. How results move your level is on My progress; every attempt, with its date and time, is on My Activities.' : live ? `${live.round.label}${lo?.total ? `, ${lo.correct} of ${lo.total} correct` : ''}` : 'Your test results will show here once they are in.'))),
    showLive ? academyResults(spCard(true)) : null,
    showLive ? null : spCard(false));
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
    h('tbody', null, data.targets.map((t) => { const cur = lat?.map[t.scenario]?.pct ?? null; const met = cur != null && cur >= t.target_pct; return h('tr', null, h('td', null, h('b', null, label(data, t.scenario))), h('td', { class: 'num' }, pct(cur)), h('td', { class: 'num' }, pct(t.target_pct)), h('td', null, fmtDate(t.due_date)), h('td', null, cur == null ? h('span', { class: 'muted' }, 'None') : h('span', { class: `chip ${met ? 'green' : 'amber'}` }, met ? 'On target' : `${Math.round(t.target_pct - cur)} pts to go`))); })))) : h('div', { class: 'muted' }, 'Your personal targets will be set with your KUDO Trainer.'));
  draw();
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My progress'), h('p', null, showLive ? 'How your level in each scenario moves with every test you take, measured against where you started in October.' : 'How your results move at each checkpoint: Self Assessment and a fresh knowledge test every quarter.'))),
    showLive ? progressLive() : null,
    showLive ? h('div', { class: 'section-h' }, h('h2', null, 'Quarterly checkpoints'), h('p', null, 'Your Self Assessment and knowledge test, every three months. Each new test becomes your new starting point.')) : null,
    all.length ? h('div', { class: 'stack' }, h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h2', null, 'Over time'), sel), chartBox,
      all.length < 3 ? h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'More points will appear after the next quarterly checkpoint.') : null),
      data.targets.length || !showLive ? h('div', { class: 'card' }, h('h2', null, 'My targets'), h('p', { class: 'sub' }, 'Set with your KUDO Trainer. Latest uses your most recent test, or Self Assessment if no test yet.'), tgtBox) : null) : empty('Nothing to chart yet', 'Your progress appears after your first results are loaded.'));
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
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My courses'), h('p', null, 'Your next three months, built around your results and the scenarios your clients bring you.')),
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
const KIND_LABEL = { check: 'Course test', scenario: 'Decision walkthrough', baseline: 'Baseline check', explain: 'Explain it' };
const loadLive = () => api('GET', '/api/me/progress-live');
const fact = (k, v, sub, cls = '') => h('div', { class: `jm-fact ${cls}` }, h('span', { class: 'jm-fk' }, k), h('b', null, v), sub ? h('span', { class: 'jm-fs' }, sub) : null);
const loading = (what) => h('div', { class: 'card muted' }, `Loading ${what}…`);
const failed = (e) => h('div', { class: 'card empty' }, h('b', null, 'This part could not load'), e.message);

/** My results: the scores themselves, test by test. No level changes here: those are on My progress. */
function academyResults(startingPoint = null) {
  const box = h('div', { class: 'stack lp-live' }, loading('your Academy results'));
  Promise.all([loadLive(), api('GET', '/api/me/programme').catch(() => null), api('GET', '/api/me/sandbox').catch(() => ({ scenarios: [] }))]).then(([d, prog, sbxRes]) => {
    // My results per course: one visual tile per course, grouped by month like My courses.
    const passPct = Math.round(d.pass * 100);
    const plan = prog?.state?.items || [], phases = prog?.phases || [];
    const STEPS = [['lesson', 'Learn'], ['practice', 'Practise'], ['scenario', 'Decide'], ['explain', 'Explain it'], ['check', 'Prove it']];
    const COURSE = new Set(STEPS.map((x) => x[0]));
    const meOf = () => (document.body.dataset.me === '1' ? 'me-' : '');
    const goCourse = (key, inPlan) => { if (!inPlan) { location.hash = `#${meOf()}module-${key}`; return; } try { sessionStorage.setItem('academy.course', key); } catch { /* storage off */ } location.hash = `#${meOf()}training`; };
    const ring = (v, cls) => scoreRing(v, cls, { label: v == null ? 'Course test not taken' : `Course test ${v}%` });
    const tile = (m) => {
      const its = plan.filter((i) => i.module === m.key && COURSE.has(i.kind) && (i.owner || 'you') === 'you');
      const inPlan = its.length > 0, first = its.filter((i) => i.week).sort((a, b) => a.week - b.week)[0];
      const mo = first ? (phases.find((p) => first.week >= p.weeks[0] && first.week <= p.weeks[1])?.n || first.phase) : null;
      const c = m.check, sc = c ? c.pct : null, state = c ? (c.passed ? 'pass' : 'below') : 'todo';
      const runs = (sbxRes.scenarios || []).filter((x) => SANDBOXES[x.key]?.module === m.key && x.record);
      const sbxScore = runs.length ? Math.round(runs.reduce((t, x) => t + x.record.score, 0) / runs.length) : null;
      const score = { lesson: null, practice: sbxScore, scenario: m.walk?.pct ?? null, explain: m.explain?.pct ?? null, check: sc };
      const did = { lesson: false, practice: sbxScore != null, scenario: !!m.walk, explain: !!m.explain, check: !!c };
      const steps = STEPS.filter(([k]) => (inPlan ? its.some((i) => i.kind === k) : k === 'lesson' || k === 'check' || did[k]));
      const done = (k) => its.find((i) => i.kind === k)?.done || did[k];
      const nDone = steps.filter(([k]) => done(k)).length, started = nDone > 0 && nDone < steps.length;
      return h('div', { class: `ctile ${state} ${mo ? `m${mo}` : 'm0'}` },
        h('div', { class: 'ct-head' }, ring(sc, state),
          h('div', { class: 'ct-t' }, h('b', null, m.title), h('div', { class: 'ct-sub' }, mo ? h('span', { class: `chip mchip m${mo}` }, `Month ${mo}, week ${first.week}`) : h('span', { class: 'chip grey' }, 'Optional'), m.short ? h('span', { class: 'muted small' }, m.short) : null))),
        h('ol', { class: 'ct-steps', 'aria-label': 'Steps of this course' }, steps.map(([k, l]) => { const v = score[k], ok = done(k);
          return h('li', { class: `ct-step ${ok ? 'on' : ''} ${v != null ? (k === 'check' ? state : (v >= passPct ? 'pass' : 'below')) : ''}` },
            h('span', { class: 'ct-fill', style: `--v:${v != null ? v : ok ? 100 : 0}%` }), h('span', { class: 'ct-l' }, l), h('b', null, v != null ? `${v}%` : ok ? 'Done' : '–')); })),
        h('div', { class: 'ct-foot' },
          h('span', { class: 'muted small' }, c ? (c.passed ? `Passed on ${fmtDate(c.at)}` : `Below ${passPct}% on ${fmtDate(c.at)}`) : `${nDone} of ${steps.length} steps done`),
          h('button', { type: 'button', class: `btn sm ${started ? 'continue' : ''}`, on: { click: () => goCourse(m.key, inPlan) } }, started ? 'Continue the course' : 'Go to course')));
    };
    const weekOf = (m) => plan.filter((i) => i.module === m.key && COURSE.has(i.kind) && i.week).reduce((w, i) => Math.min(w, i.week), 99);
    // Only completed courses: every step of the course in the plan is done (outside the plan: its course test is taken).
    const completed = (m) => { const its = plan.filter((i) => i.module === m.key && COURSE.has(i.kind) && (i.owner || 'you') === 'you'); return its.length ? its.every((i) => i.done) && !!m.check : !!m.check; };
    const doneMods = d.modules.filter(completed);
    const inPlanN = d.modules.filter((m) => plan.some((i) => i.module === m.key && COURSE.has(i.kind))).length || d.modules.length;
    const scored = doneMods.filter((m) => m.check), passedN = scored.filter((m) => m.check.passed).length;
    const avg = scored.length ? Math.round(scored.reduce((t, m) => t + m.check.pct, 0) / scored.length) : null;
    const ordered = doneMods.sort((a, b) => weekOf(a) - weekOf(b));
    const groups = [...phases.map((p) => ({ n: p.n, name: p.name, sub: `Weeks ${p.weeks[0]} to ${p.weeks[1]}`, ms: ordered.filter((m) => { const w = weekOf(m); return w >= p.weeks[0] && w <= p.weeks[1]; }) })),
      { n: 0, name: 'Not in your plan', sub: 'Optional: open any of them when you like', ms: ordered.filter((m) => weekOf(m) === 99) }].filter((g) => g.ms.length);
    const legendRow = h('div', { class: 'ct-legend' }, h('span', null, h('i', { class: 'pass' }), `Passed (${passPct}% or more)`), h('span', null, h('i', { class: 'below' }), `Below ${passPct}%`));
    const summary = h('div', { class: 'ct-summary' },
      scoreRing(avg, avg == null ? 'todo' : avg >= passPct ? 'pass' : 'below', { size: 132, label: avg == null ? 'No average yet' : `Average score ${avg}%` }),
      h('div', { class: 'ct-sum-t' },
        h('span', { class: 'ct-sum-k' }, 'Average score'),
        h('p', { class: 'muted small' }, avg == null ? 'Shown once you complete your first course.' : `Across the course tests of your completed courses. Pass mark ${passPct}%.`),
        h('div', { class: 'ct-sum-figs' },
          h('div', null, h('b', null, `${doneMods.length}`, h('small', null, ` of ${inPlanN}`)), h('span', null, 'courses taken')),
          h('div', null, h('b', null, scored.length ? `${passedN}` : '–', scored.length ? h('small', null, ` of ${scored.length}`) : null), h('span', null, 'passed')))));
    const table = h('section', { class: 'card ct-card' },
      h('div', null, h('h2', null, 'My results per course'), h('p', { class: 'sub keep', style: 'margin:2px 0 0' }, 'Your completed courses. The ring is the course test (Prove it): your first attempt is the result of record. Underneath, every step with its score; Practise shows the sandbox exercise when the course has one. Courses in progress are on My courses.')),
      summary,
      doneMods.length ? [legendRow, groups.map((g) => h('div', { class: `ct-group m${g.n}` }, h('div', { class: 'ct-gh' }, h('h3', null, g.name), h('span', { class: 'muted small' }, g.sub)), h('div', { class: 'ctiles' }, g.ms.map(tile))))]
        : h('div', { class: 'empty-note row spread' }, h('span', null, h('b', null, 'No course completed yet.'), ' Each course shows here with its results once all its steps are done.'), h('a', { class: 'btn primary sm', href: `#${meOf()}training` }, 'Go to My courses')),
      startingPoint);
    box.replaceChildren(table);
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
      fact('My Readiness', `${d.overall.now}%`, `${d.overall.start}% in October, ${signed(dOverall)} points`, dOverall > 0 ? 'good' : dOverall < 0 ? 'late' : ''),
      fact('Tests that moved a level', String(counted), counted ? `Across ${tested.length} scenario${tested.length > 1 ? 's' : ''}` : 'Take your first course to start'),
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
    // One card: what moved my level (the feed, or a single next step), then what counts and what does not.
    const feedList = d.feed.length ? h('ul', { class: 'lp-feed' }, d.feed.slice(0, 30).map((e) => { const ch = e.to - e.from; return h('li', null,
        h('span', { class: 'muted small lp-when' }, ago(e.at)),
        h('div', { class: 'lp-what' }, e.module !== 'baseline' ? h('a', { href: `#module-${e.module}` }, e.moduleTitle) : h('b', null, e.moduleTitle), h('span', { class: 'muted small sep-l' }, `${KIND_LABEL[e.kind] || 'Test'}${e.kind === 'explain' ? (e.reviewed ? ', reviewed by your KUDO Trainer' : ', automatic review') : ''}, you scored ${e.score}%`)),
        h('div', { class: 'lp-eff' }, h('span', null, `${e.short} ${e.from}% → ${e.to}%`), h('span', { class: `lp-d ${ch > 0 ? 'up' : ch < 0 ? 'down' : ''}` }, signed(ch)))); }))
      : h('div', { class: 'empty-note row spread' }, h('span', null, h('b', null, 'Nothing yet.'), ' Your level moves after the Prove it step of your first course.'), h('a', { class: 'btn primary sm', href: '#training' }, 'Go to My courses'));
    const rules = h('div', { class: 'lp-rules-in' },
      h('div', { class: 'grid g2' },
        h('div', { class: 'lp-col yes' }, h('b', { class: 'lp-yes' }, 'Moves your level'), h('ul', null, h('li', null, 'Your first attempt at each course test (Prove it)'), h('li', null, 'Your first decision walkthrough in each course'), h('li', null, 'Your first explain-it recording. If your KUDO Trainer reviews it, their score replaces the automatic one'), h('li', null, 'The baseline check'), h('li', null, 'The quarterly knowledge test, which resets your starting point'))),
        h('div', { class: 'lp-col no' }, h('b', { class: 'lp-no' }, 'Does not move it'), h('ul', null, h('li', null, 'Reading the lesson and watching the videos'), h('li', null, 'Practice tasks and sandbox exercises (feedback only)'), h('li', null, 'Retakes, the weekly challenge and spaced reviews'), h('li', null, 'Marking a step as done')))),
      h('p', { class: 'muted small', style: 'margin:10px 0 0' }, 'Each test pulls your level most of the way towards its score: a good result lifts it, a poor one lowers it. Only your first attempt counts, so work through the course and take the test when you feel ready.'));
    const moved = h('div', { class: 'card lp-rules lp-moved' },
      h('h2', null, 'What moved my level'), h('p', { class: 'sub keep' }, d.feed.length ? 'Newest first, with what each test did.' : 'Each test that moves a level shows here, newest first.'),
      feedList,
      d.feed.length ? h('details', { class: 'lp-how' }, h('summary', null, 'What moves a level, and what does not'), rules) : h('div', { class: 'lp-how open' }, h('h3', null, 'What moves a level, and what does not'), rules));
    box.replaceChildren(...(d.feed.length ? [head, chart, over, moved] : [head, chart, moved]));
  }).catch((e) => box.replaceChildren(failed(e)));
  return box;
}
