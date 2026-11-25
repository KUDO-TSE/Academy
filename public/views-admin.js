import * as P from './views-admin-programme.js';
import { h, api, toast, modal, pct, fmtDate, dateOnly, KIND, DELIVERY, reading, initials } from './ui.js';
import { pairedBars, COLORS } from './charts.js';
import { homeView, resultsView, progressView, planView, latest, scoresFor } from './views-trainee.js';

let META = null;
const THEME = ['hi', 'ai'];
export async function meta() { if (!META) META = await api('GET', '/api/admin/meta'); return META; }
const scLabel = (k) => META.scenarios.find((s) => s.key === k)?.label || k;
const scShort = (k) => META.scenarios.find((s) => s.key === k)?.short || k;
const kpi = (l, v, n) => h('div', { class: 'card kpi' }, h('div', { class: 'label' }, l), h('div', { class: 'value' }, v), h('div', { class: 'note' }, n));
const legend = () => h('div', { class: 'legend' }, h('span', null, h('i', { style: `background:${COLORS.self}` }), 'Self rating'), h('span', null, h('i', { style: `background:${COLORS.live}` }), 'Knowledge test'));
const gapChip = (s, l) => { const r = reading(s, l); return r ? h('span', { class: `chip ${r.cls}` }, `${r.gap > 0 ? '+' : ''}${Math.round(r.gap)} pts`) : h('span', { class: 'muted' }, '–'); };
const field = (l, el, hint) => h('label', { class: 'f' }, h('span', { class: 'l' }, l), el, hint ? h('div', { class: 'hint' }, hint) : null);
const select = (opts, val, attrs = {}) => h('select', attrs, opts.map(([v, l]) => h('option', { value: v, selected: String(v) === String(val ?? '') }, l)));
const scOpts = (blank) => [...(blank ? [['', blank]] : []), ...META.scenarios.map((s) => [s.key, s.label])];

// ---------------------------------------------------------------- Overview
export async function overviewView() {
  await meta();
  const d = await api('GET', '/api/admin/overview');
  const rows = d.byScenario.map((r) => ({ label: scShort(r.scenario), self: r.self, live: r.live }));
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Overview'), h('p', null, 'The whole team at a glance. Full detail on each person is under Team.'))),
    h('div', { class: 'grid g4' },
      kpi('Trainees', d.counts.trainees, `${d.counts.selfDone} Self Assessments · ${d.counts.liveDone} tests`),
      kpi('Average self rating', pct(d.avgSelf), 'Latest Self Assessment'),
      kpi('Average test score', pct(d.avgLive), d.avgSelf != null && d.avgLive != null ? `${d.avgLive - d.avgSelf >= 0 ? '+' : ''}${Math.round(d.avgLive - d.avgSelf)} pts vs self rating` : 'Latest test'),
      kpi('Plan completion', d.planTotals.total ? pct((d.planTotals.done / d.planTotals.total) * 100) : '–', d.planTotals.total ? `${d.planTotals.done} of ${d.planTotals.total} items` : 'No plans loaded yet')),
    h('div', { class: 'grid g-8-4', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h2', null, 'Team by scenario'), h('p', { class: 'sub' }, 'Average self rating next to average test score.'), legend(), pairedBars(rows)),
      h('div', { class: 'stack' },
        h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h2', null, 'Top training priorities'), h('a', { href: '#priorities' }, 'See all')),
          d.topPriorities.map((p) => h('div', { class: 'row spread', style: 'padding:9px 0;border-top:1px solid var(--border-soft)' }, h('b', null, scShort(p.scenario)), h('span', { class: 'row' }, p.safetyNet ? h('span', { class: 'chip amber' }, 'Safety net') : null, h('span', { class: `chip ${p.tier === 1 ? 'coral' : p.tier === 2 ? 'amber' : 'grey'}` }, `${p.priority} · Tier ${p.tier}`))))),
        h('div', { class: 'card' }, h('h2', null, 'Regions'),
          h('table', { class: 'tbl', style: 'margin-top:8px' }, h('thead', null, h('tr', null, ['Region', 'Self', 'Test'].map((x, i) => h('th', { class: i ? 'num' : '' }, x)))),
            h('tbody', null, d.byRegion.map((r) => h('tr', null, h('td', null, h('b', null, r.region), h('span', { class: 'muted small' }, ` · ${r.liveDone}/${r.people} tested`)), h('td', { class: 'num' }, pct(r.self)), h('td', { class: 'num' }, pct(r.live))))))),
        d.pendingLive.length ? h('div', { class: 'card' }, h('h2', null, 'Test not taken yet'), h('p', { class: 'sub' }, 'CMs & Sales without a live test result.'), d.pendingLive.map((p) => h('div', { class: 'row spread', style: 'padding:6px 0' }, h('a', { href: `#person-${p.id}` }, p.name), h('span', { class: 'chip grey' }, p.region || '–')))) : null)));
}

// ---------------------------------------------------------------- Team
export async function teamView() {
  await meta();
  const list = await api('GET', '/api/admin/trainees');
  let q = '', region = '', team = '', sortKey = 'name', dir = 1;
  const body = h('tbody');
  const draw = () => {
    body.replaceChildren();
    const rows = list.filter((p) => (!q || (p.name + p.email).toLowerCase().includes(q)) && (!region || p.region === region) && (!team || p.team === team))
      .sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1; return (typeof x === 'string' ? x.localeCompare(y) : x - y) * dir; });
    if (!rows.length) body.append(h('tr', null, h('td', { colspan: 8, class: 'empty' }, 'No one matches.')));
    rows.forEach((p) => body.append(h('tr', { class: 'click', tabindex: 0, on: { click: () => { location.hash = `person-${p.id}`; }, keydown: (e) => { if (e.key === 'Enter') location.hash = `person-${p.id}`; } } },
      h('td', null, h('div', { class: 'row' }, h('span', { class: 'avatar' }, initials(p.name)), h('div', null, h('b', null, p.name), h('div', { class: 'muted small' }, p.email)))),
      h('td', null, p.region || '–'), h('td', null, p.team || '–'),
      h('td', { class: 'num' }, pct(p.self)), h('td', { class: 'num' }, p.live != null ? (p.liveTotal ? `${p.liveCorrect}/${p.liveTotal} · ${pct(p.live)}` : pct(p.live)) : '–'),
      h('td', { class: 'num' }, gapChip(p.self, p.live)), h('td', { class: 'num' }, p.planTotal ? `${p.planDone}/${p.planTotal}` : '–'))));
  };
  const th = (l, k, num) => h('th', { class: num ? 'num' : '', style: 'cursor:pointer', on: { click: () => { dir = sortKey === k ? -dir : 1; sortKey = k; draw(); } } }, l);
  draw();
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Team'), h('p', null, `${list.length} people. Select a person for their full results, plan and coaching.`)),
      h('a', { class: 'btn', href: '/api/admin/export/results.csv' }, 'Export results (CSV)')),
    h('div', { class: 'row', style: 'margin-bottom:14px' },
      h('input', { type: 'text', placeholder: 'Search name or email', 'aria-label': 'Search', style: 'max-width:280px', on: { input: (e) => { q = e.target.value.toLowerCase(); draw(); } } }),
      select([['', 'All regions'], ...META.regions.map((r) => [r, r])], '', { style: 'width:auto', 'aria-label': 'Region', on: { change: (e) => { region = e.target.value; draw(); } } }),
      select([['', 'All teams'], ...META.teams.map((r) => [r, r])], '', { style: 'width:auto', 'aria-label': 'Team', on: { change: (e) => { team = e.target.value; draw(); } } })),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, th('Name', 'name'), th('Region', 'region'), th('Team', 'team'), th('Self', 'self', 1), th('Test', 'live', 1), h('th', { class: 'num' }, 'Gap'), th('Plan', 'planDone', 1))), body)));
}

// ---------------------------------------------------------------- Person
function asTrainee(d) {
  return { user: d.user, scenarios: META.scenarios, rounds: d.rounds, scores: d.scores, questions: d.questions, plan: d.plan, targets: d.targets, notes: d.notes.filter((n) => n.shared) };
}
export async function personView(id) {
  await meta();
  const d = await api('GET', `/api/admin/trainees/${id}`);
  const u = d.user;
  let tab = sessionStorage.getItem('personTab') || 'programme'; sessionStorage.removeItem('personTab');
  const body = h('div');
  const reload = () => { location.hash = `person-${id}`; window.dispatchEvent(new HashChangeEvent('hashchange')); };
  const tabs = h('div', { class: 'tabs', role: 'tablist' });
  const TAB = [['programme', 'Programme'], ['inputs', 'Inputs & 1:1s'], ['results', 'Results'], ['coaching', 'Notes'], ['profile', 'Profile & access']];
  const draw = () => {
    tabs.replaceChildren(...TAB.map(([k, l]) => h('button', { role: 'tab', class: tab === k ? 'on' : '', 'aria-selected': String(tab === k), on: { click: () => { tab = k; draw(); } } }, l)));
    const reloadTab = () => { sessionStorage.setItem('personTab', tab); reload(); };
    body.replaceChildren(tab === 'programme' ? P.tabProgramme(id, reloadTab) : tab === 'inputs' ? P.tabInputs(id, reloadTab) : ({ results: tabResults, plan: tabPlan, targets: tabTargets, coaching: tabCoaching, profile: tabProfile })[tab](d, reload));
  };
  draw();
  return h('div', { class: 'page' },
    h('a', { href: '#team', class: 'muted' }, '← Team'),
    h('div', { class: 'page-head', style: 'margin-top:8px' }, h('div', { class: 'row' }, h('span', { class: 'avatar', style: 'width:52px;height:52px;font-size:16px' }, initials(u.name)),
      h('div', null, h('h1', null, u.name), h('p', null, [u.email, u.region, u.team].filter(Boolean).join(' · '), u.last_login_at ? ` · last sign-in ${fmtDate(u.last_login_at)}` : ' · has not signed in yet'))),
      h('div', { class: 'row' }, !u.active ? h('span', { class: 'chip red' }, 'Deactivated') : null, h('a', { class: 'btn', href: `#pview-${id}` }, 'View as trainee'))),
    tabs, body);
}

function tabResults(d) {
  const self = latest(asTrainee(d), 'self'), live = latest(asTrainee(d), 'live');
  const rows = META.scenarios.map((s) => ({ label: s.short, self: self?.map[s.key]?.pct ?? null, live: live?.map[s.key]?.pct ?? null }));
  const o = live?.map.overall;
  const missed = live ? d.questions.filter((q) => q.round_id === live.round.id && !q.correct) : [];
  return h('div', { class: 'stack' },
    h('div', { class: 'grid g3' }, kpi('Self rating', pct(self?.map.overall?.pct), self?.round.label || 'Not completed'), kpi('Knowledge test', o ? (o.total ? `${o.correct}/${o.total}` : pct(o.pct)) : '–', live ? `${pct(o.pct)} · ${live.round.label}` : 'Not taken'), kpi('Gap', o && self?.map.overall ? `${o.pct - self.map.overall.pct >= 0 ? '+' : ''}${Math.round(o.pct - self.map.overall.pct)} pts` : '–', 'Test minus self rating')),
    h('div', { class: 'card' }, h('h2', null, 'By scenario'), legend(), self || live ? pairedBars(rows) : h('div', { class: 'empty' }, 'No results loaded for this person yet.')),
    d.oneToOne ? h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('h2', null, '1:1 priority'), h('span', { class: `chip ${d.oneToOne.flagged ? 'coral' : 'grey'}` }, d.oneToOne.flagged ? 'Flagged for a 1:1' : 'Below the 55 flag')),
      h('p', { class: 'sub' }, 'Highest scenarios for this person (40% demand, 30% weakness, 15% struggle, 10% over-confidence, 5% risk).'),
      d.oneToOne.scenarios.map((s) => h('div', { class: 'row spread', style: 'padding:6px 0' }, h('b', null, scLabel(s.scenario)), h('span', { class: 'chip blue' }, s.score)))) : null,
    h('div', { class: 'card' }, h('h2', null, 'Questions missed'), h('p', { class: 'sub' }, live ? live.round.label : ''),
      missed.length ? missed.map((q) => h('div', { class: 'q-item' }, h('span', { class: 'chip blue' }, scShort(q.scenario)), h('div', { style: 'margin-top:6px;font-weight:600' }, q.question), q.answer ? h('div', { class: 'a' }, q.answer) : null)) : h('div', { class: 'muted' }, 'No question-level data for this person.')));
}

function tabPlan(d, reload) {
  const wrap = h('div', { class: 'stack' });
  const edit = (p) => {
    const t = h('input', { type: 'text', value: p.title, maxlength: 200 }), m = select([[1, 'Month 1'], [2, 'Month 2'], [3, 'Month 3']], p.month), due = h('input', { type: 'date', value: dateOnly(p.due_date) });
    const st = select([['todo', 'To do'], ['in_progress', 'In progress'], ['done', 'Done']], p.status), ds = h('textarea', null, p.description || ''), lk = h('input', { type: 'text', value: p.link || '', placeholder: 'https://' });
    modal('Edit plan item', h('div', null, field('Title', t), field('Month', m), field('Due date', due), field('Status', st), field('Description', ds), field('Link', lk)), { actions: (close) => [
      h('button', { class: 'btn danger', on: { click: async () => { if (!confirm('Delete this plan item?')) return; try { await api('DELETE', `/api/admin/plan/${p.id}`); close(); toast('Deleted'); reload(); } catch (e) { toast(e.message, true); } } } }, 'Delete'),
      h('button', { class: 'btn', on: { click: close } }, 'Cancel'),
      h('button', { class: 'btn primary', on: { click: async () => { try { await api('PATCH', `/api/admin/plan/${p.id}`, { title: t.value, month: Number(m.value), due_date: due.value, status: st.value, description: ds.value, link: lk.value }); close(); toast('Saved'); reload(); } catch (e) { toast(e.message, true); } } } }, 'Save')] });
  };
  wrap.append(h('div', { class: 'row spread' }, h('p', { class: 'muted', style: 'margin:0' }, `${d.plan.length} items`), h('button', { class: 'btn primary', on: { click: () => addPlanModal([d.user], reload) } }, 'Add item')));
  if (!d.plan.length) wrap.append(h('div', { class: 'card empty' }, h('b', null, 'No plan yet'), 'Add items one by one, or import a plan from the Training plans page.'));
  const statusChip = (st) => h('span', { class: `chip ${st === 'done' ? 'green' : st === 'in_progress' ? 'amber' : 'grey'}` }, st === 'in_progress' ? 'In progress' : st === 'done' ? 'Done' : 'To do');
  const planRow = (p) => h('tr', { class: 'click', on: { click: () => edit(p) } },
    h('td', null, h('b', null, p.title), h('div', { class: 'muted small' }, [KIND[p.kind], p.scenario ? scShort(p.scenario) : null, DELIVERY[p.delivery]].filter(Boolean).join(' · '))),
    h('td', null, p.due_date ? fmtDate(p.due_date) : ''), h('td', null, statusChip(p.status)));
  [1, 2, 3].forEach((m) => {
    const items = d.plan.filter((p) => p.month === m);
    if (!items.length) return;
    wrap.append(h('div', { class: 'card' }, h('h2', null, `Month ${m}`), h('div', { class: 'tbl-wrap', style: 'margin-top:10px' }, h('table', { class: 'tbl' }, h('tbody', null, items.map(planRow)))))); 
  });
  return wrap;
}

export function addPlanModal(people, done) {
  const month = select([[1, 'Month 1'], [2, 'Month 2'], [3, 'Month 3']], 1), kind = select(Object.entries(KIND), 'resource'), sc = select(scOpts('No specific scenario'), ''), dl = select(Object.entries(DELIVERY), 'both');
  const title = h('input', { type: 'text', maxlength: 200 }), due = h('input', { type: 'date' }), desc = h('textarea'), link = h('input', { type: 'text', placeholder: 'https://' });
  modal(people.length === 1 ? `Add plan item for ${people[0].name}` : `Add plan item for ${people.length} people`, h('div', null, field('Title', title), h('div', { class: 'grid g2' }, field('Month', month), field('Type', kind)), h('div', { class: 'grid g2' }, field('Scenario', sc), field('Covers', dl)), field('Due date', due), field('Description', desc), field('Link to resource', link, 'Optional. Must start with https://')), { actions: (close) => [
    h('button', { class: 'btn', on: { click: close } }, 'Cancel'),
    h('button', { class: 'btn primary', on: { click: async () => { try { const r = await api('POST', '/api/admin/plan', { user_ids: people.map((p) => p.id), title: title.value, month: Number(month.value), kind: kind.value, scenario: sc.value || null, delivery: dl.value, due_date: due.value || null, description: desc.value, link: link.value || null }); close(); toast(`Added for ${r.added} ${r.added === 1 ? 'person' : 'people'}`); done?.(); } catch (e) { toast(e.message, true); } } } }, 'Add')] });
}

function tabTargets(d, reload) {
  const rows = META.scenarios.map((s) => { const t = d.targets.find((x) => x.scenario === s.key); return { s, on: h('input', { type: 'checkbox', checked: !!t, style: 'width:auto', 'aria-label': `Target for ${s.label}` }), v: h('input', { type: 'number', min: 0, max: 100, value: t ? Math.round(t.target_pct) : 85, style: 'width:90px' }), due: h('input', { type: 'date', value: dateOnly(t?.due_date), style: 'width:auto' }) }; });
  return h('div', { class: 'card' }, h('h2', null, 'Targets'), h('p', { class: 'sub' }, 'Tick the scenarios this person has a target for. Targets show on their Progress page.'),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['', 'Scenario', 'Target %', 'By'].map((x) => h('th', null, x)))), h('tbody', null, rows.map((r) => h('tr', null, h('td', null, r.on), h('td', null, h('b', null, r.s.label)), h('td', null, r.v), h('td', null, r.due)))))),
    h('div', { style: 'margin-top:14px' }, h('button', { class: 'btn primary', on: { click: async () => { try { await api('PUT', `/api/admin/trainees/${d.user.id}/targets`, { targets: rows.filter((r) => r.on.checked).map((r) => ({ scenario: r.s.key, target_pct: Number(r.v.value), due_date: r.due.value || null })) }); toast('Targets saved'); reload(); } catch (e) { toast(e.message, true); } } } }, 'Save targets')));
}

function tabCoaching(d, reload) {
  const body = h('textarea', { placeholder: 'Session review, coaching focus, next step…', maxlength: 4000 }), shared = h('input', { type: 'checkbox', style: 'width:auto' });
  const u = d.user;
  return h('div', { class: 'stack' },
    h('div', { class: 'card' }, h('h2', null, 'Dreaded question'), h('p', { class: 'sub' }, 'From the Self Assessment (visible to admins only).'),
      h('div', null, u.struggle_text || h('span', { class: 'muted' }, 'Not recorded.')),
      h('div', { class: 'row', style: 'margin-top:10px' }, u.demand_scenario ? h('span', { class: 'chip blue' }, `Clients bring most: ${scShort(u.demand_scenario)}`) : null, (u.struggle_scenarios || []).map((s) => h('span', { class: 'chip coral' }, `Struggle: ${scShort(s)}`)), u.profile?.learning_pref ? h('span', { class: 'chip grey' }, `Prefers: ${u.profile.learning_pref}`) : null)),
    h('div', { class: 'card' }, h('h2', null, 'Add a note'), h('p', { class: 'sub' }, 'Private notes are visible to admins only. Shared notes also appear on the trainee’s Home.'), body,
      h('div', { class: 'row spread', style: 'margin-top:10px' }, h('label', { class: 'row', style: 'font-weight:600' }, shared, 'Share with trainee'), h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', `/api/admin/trainees/${u.id}/notes`, { body: body.value, shared: shared.checked }); toast('Note added'); reload(); } catch (e) { toast(e.message, true); } } } }, 'Add note'))),
    h('div', { class: 'card' }, h('h2', null, 'Notes'), d.notes.length ? d.notes.map((n) => h('div', { class: 'note-box', style: n.shared ? '' : 'border-color:var(--ink-400);background:var(--bg-app)' }, h('div', null, n.body), h('div', { class: 'when row spread' }, h('span', null, `${n.shared ? 'Shared' : 'Private'} · ${n.author || 'Unknown'} · ${fmtDate(n.created_at)}`), h('button', { class: 'btn sm danger', on: { click: async () => { if (!confirm('Delete this note?')) return; try { await api('DELETE', `/api/admin/notes/${n.id}`); reload(); } catch (e) { toast(e.message, true); } } } }, 'Delete')))) : h('div', { class: 'muted' }, 'No notes yet.')));
}

function tabProfile(d, reload) {
  const u = d.user;
  const name = h('input', { type: 'text', value: u.name }), region = select([['', '–'], ...META.regions.map((r) => [r, r])], u.region), team = select([['', '–'], ...META.teams.map((r) => [r, r])], u.team);
  const weight = h('input', { type: 'number', min: 0, max: 1, step: 0.5, value: u.weight }), dem = select(scOpts('None'), u.demand_scenario);
  const sts = META.scenarios.map((s) => ({ s, el: h('input', { type: 'checkbox', checked: (u.struggle_scenarios || []).includes(s.key), style: 'width:auto' }) }));
  const save = async () => { try { await api('PATCH', `/api/admin/trainees/${u.id}`, { name: name.value, region: region.value, team: team.value, weight: Number(weight.value), demand_scenario: dem.value, struggle_scenarios: sts.filter((x) => x.el.checked).map((x) => x.s.key) }); toast('Saved'); reload(); } catch (e) { toast(e.message, true); } };
  return h('div', { class: 'grid g2' },
    h('div', { class: 'card' }, h('h2', null, 'Profile'), h('div', { style: 'margin-top:12px' }, field('Name', name), h('div', { class: 'grid g2' }, field('Region', region), field('Team', team)), field('Priority weight', weight, '1 = CM & Sales. 0.5 = other departments. 0 = excluded from priority scoring.'), field('Scenario clients bring most', dem)), h('button', { class: 'btn primary', on: { click: save } }, 'Save profile')),
    h('div', { class: 'stack' },
      h('div', { class: 'card' }, h('h2', null, 'Struggle tags'), h('p', { class: 'sub' }, 'Scenarios their “dreaded question” relates to. Feeds the 15% struggle part of the priority score.'), h('div', { class: 'pick-list' }, sts.map((x) => h('label', null, x.el, x.s.label))), h('div', { style: 'margin-top:12px' }, h('button', { class: 'btn primary', on: { click: save } }, 'Save tags'))),
      h('div', { class: 'card' }, h('h2', null, 'Access'), h('p', { class: 'sub' }, `${u.email} · ${u.role === 'admin' ? 'Admin' : 'Trainee'} · ${u.active ? 'Active' : 'Deactivated'}${u.must_change_password ? ' · has not set their own password yet' : ''}`),
        h('div', { class: 'row' },
          h('button', { class: 'btn', on: { click: async () => { if (!confirm(`Reset ${u.name}'s password to the generic password? They will be asked to change it at next sign-in.`)) return; try { await api('POST', `/api/admin/users/${u.id}/reset-password`); toast('Password reset'); reload(); } catch (e) { toast(e.message, true); } } } }, 'Reset password'),
          h('button', { class: `btn ${u.active ? 'danger' : ''}`, on: { click: async () => { if (u.active && !confirm(`Deactivate ${u.name}? They will no longer be able to sign in.`)) return; try { await api('PATCH', `/api/admin/trainees/${u.id}`, { active: !u.active }); toast(u.active ? 'Deactivated' : 'Reactivated'); reload(); } catch (e) { toast(e.message, true); } } } }, u.active ? 'Deactivate' : 'Reactivate')))));
}

// ---------------------------------------------------------------- Preview as trainee
export function previewView(sub) {
  const data = JSON.parse(sessionStorage.getItem('previewAs') || 'null');
  if (!data) return h('div', { class: 'page' }, h('div', { class: 'card empty' }, h('b', null, 'Nothing to preview'), 'Open a person and choose View as trainee.'));
  const view = { home: homeView, results: resultsView, progress: progressView, plan: (d) => planView(d, { readOnly: true }) }[sub || 'home'];
  const bar = h('div', { class: 'preview-bar' }, h('span', null, `Preview: this is what ${data.user.name} sees. Read only.`), h('div', { class: 'row' }, ['home', 'results', 'progress', 'plan'].map((k) => h('button', { class: `btn sm ${k === (sub || 'home') ? 'primary' : ''}`, on: { click: () => { location.hash = `preview-${k}`; } } }, { home: 'Home', results: 'Results', progress: 'Progress', plan: 'Plan' }[k])), h('button', { class: 'btn sm', on: { click: () => { location.hash = `person-${data.user.id}`; } } }, 'Exit preview')));
  return h('div', null, bar, view(data));
}

// ---------------------------------------------------------------- Priorities
export async function prioritiesView() {
  await meta();
  let basis = 'auto';
  const box = h('div', { class: 'stack' });
  const draw = async () => {
    const d = await api('GET', `/api/admin/priorities?basis=${basis === 'self' ? 'self' : 'auto'}`);
    const flagged = d.oneToOne.filter((x) => x.flagged);
    const crit = h('div', { class: 'weights' }, META.scenarios.flatMap((s) => [h('span', null, s.short), h('input', { type: 'range', min: 0, max: 12, value: d.critical[s.key] ?? 0, 'aria-label': `Critical steps ${s.label}`, on: { input: (e) => { e.target.nextSibling.textContent = e.target.value; } } }), h('b', null, d.critical[s.key] ?? 0)]));
    box.replaceChildren(
      h('div', { class: 'card' }, h('div', { class: 'row spread' }, h('div', null, h('h2', null, 'Team training priority'), h('p', { class: 'sub', style: 'margin:0' }, `Basis: ${d.basis === 'self' ? 'Self Assessment only' : 'Self Assessment + knowledge test'}. 50+ is Tier 1 (team session + resource), 35 to 49 Tier 2, below 35 Tier 3.`)),
        select([['auto', 'Self + test'], ['self', 'Self only']], basis, { style: 'width:auto', 'aria-label': 'Basis', on: { change: (e) => { basis = e.target.value; draw(); } } })),
        h('div', { class: 'tbl-wrap', style: 'margin-top:14px' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['#', 'Scenario', 'Priority', 'Tier', 'Demand 40%', 'Weakness 30%', 'Struggle 15%', 'Reach 10%', 'Risk 5%'].map((x, i) => h('th', { class: i > 1 && i !== 3 ? 'num' : '' }, x)))),
          h('tbody', null, d.scenarios.filter((p) => !THEME.includes(p.scenario)).map((p, i) => h('tr', null, h('td', null, i + 1), h('td', null, h('b', null, scLabel(p.scenario)), p.safetyNet ? h('span', { class: 'chip amber', style: 'margin-left:8px' }, 'Safety net') : null), h('td', { class: 'num' }, h('b', null, p.priority)), h('td', null, h('span', { class: `chip ${p.tier === 1 ? 'coral' : p.tier === 2 ? 'amber' : 'grey'}` }, `Tier ${p.tier}`)), ...[p.demand, p.weakness, p.struggle, p.reach, p.risk].map((v) => h('td', { class: 'num' }, v))))))),
        h('p', { class: 'muted small', style: 'margin:12px 0 0' }, 'Safety net: half the team at level 2 or lower gets a resource regardless of demand.')),
      h('div', { class: 'card' }, h('h2', null, 'Delivery theme: Human Interpretation vs AI Translation'), h('p', { class: 'sub' }, 'Ranked separately, as the Guide workflows differ. Every training and 1:1 covers both.'),
        d.scenarios.filter((p) => THEME.includes(p.scenario)).map((p) => h('div', { class: 'row spread', style: 'padding:9px 0;border-top:1px solid var(--border-soft)' }, h('b', null, scLabel(p.scenario)), h('span', { class: 'row' }, h('span', { class: 'muted small' }, `Weakness ${p.weakness} · Struggle ${p.struggle} · Reach ${p.reach}`), h('span', { class: `chip ${p.tier === 1 ? 'coral' : p.tier === 2 ? 'amber' : 'grey'}` }, `${p.priority} · Tier ${p.tier}`))))),
      h('div', { class: 'card' }, h('h2', null, '1:1 coaching flags'), h('p', { class: 'sub' }, 'CMs & Sales scoring 55 or more on any scenario.'),
        flagged.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Person', 'Region', 'Top scenarios', 'Score'].map((x, i) => h('th', { class: i === 3 ? 'num' : '' }, x)))), h('tbody', null, flagged.map((x) => h('tr', { class: 'click', on: { click: () => { location.hash = `person-${x.user_id}`; } } }, h('td', null, h('b', null, x.name)), h('td', null, x.region || '–'), h('td', null, x.scenarios.map((s) => scShort(s.scenario)).join(', ')), h('td', { class: 'num' }, h('span', { class: 'chip coral' }, x.top.score))))))) : h('div', { class: 'muted' }, 'No one is above the flag right now.'),
        d.oneToOne.length ? h('p', { class: 'muted small', style: 'margin:12px 0 0' }, `Next highest: ${d.oneToOne.filter((x) => !x.flagged).slice(0, 3).map((x) => `${x.name} (${x.top.score})`).join(', ') || '–'}`) : null),
      h('div', { class: 'card' }, h('h2', null, 'Risk inputs'), h('p', { class: 'sub' }, 'Critical steps in the CM Onboarding Guide for each scenario (platform steps counted in each scenario that uses them). Update when the Guide changes.'), crit,
        h('div', { style: 'margin-top:14px' }, h('button', { class: 'btn primary', on: { click: async () => { const vals = {}; const inputs = [...crit.querySelectorAll('input')]; META.scenarios.forEach((s, i) => { vals[s.key] = Number(inputs[i].value); }); try { await api('PUT', '/api/admin/settings/critical-steps', { critical: vals }); toast('Saved'); draw(); } catch (e) { toast(e.message, true); } } } }, 'Save risk inputs'))));
  };
  await draw();
  return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Priorities'), h('p', null, 'What to train next, and who needs a 1:1, from the Priority Weighting System v1.'))), box);
}

// ---------------------------------------------------------------- Training plans (bulk)
export async function plansView() {
  await meta();
  const list = await api('GET', '/api/admin/trainees');
  let region = '', team = '';
  const checks = new Map();
  const box = h('div', { class: 'pick-list' });
  const draw = () => { box.replaceChildren(...list.filter((p) => (!region || p.region === region) && (!team || p.team === team)).map((p) => { if (!checks.has(p.id)) checks.set(p.id, h('input', { type: 'checkbox' })); return h('label', null, checks.get(p.id), `${p.name}`, h('span', { class: 'muted small' }, ` ${p.region || ''} · ${p.team || ''}`)); })); };
  draw();
  const visible = () => list.filter((p) => (!region || p.region === region) && (!team || p.team === team));
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Training plans'), h('p', null, 'Give the same session or resource to several people at once. For a full personalised plan per person, use Imports › Training plans.'))),
    h('div', { class: 'grid g2' },
      h('div', { class: 'card' }, h('h2', null, 'Choose people'), h('div', { class: 'row', style: 'margin:12px 0' },
        select([['', 'All regions'], ...META.regions.map((r) => [r, r])], '', { style: 'width:auto', 'aria-label': 'Region', on: { change: (e) => { region = e.target.value; draw(); } } }),
        select([['', 'All teams'], ...META.teams.map((r) => [r, r])], '', { style: 'width:auto', 'aria-label': 'Team', on: { change: (e) => { team = e.target.value; draw(); } } }),
        h('button', { class: 'btn sm', on: { click: () => { const all = visible().every((p) => checks.get(p.id)?.checked); visible().forEach((p) => { if (checks.has(p.id)) checks.get(p.id).checked = !all; }); } } }, 'Select / clear shown')), box),
      h('div', { class: 'card' }, h('h2', null, 'Plan item'), h('p', { class: 'sub' }, 'Added to each chosen person’s plan.'),
        h('button', { class: 'btn primary', on: { click: () => { const people = list.filter((p) => checks.get(p.id)?.checked); if (!people.length) return toast('Choose at least one person', true); addPlanModal(people); } } }, 'Add to chosen people…'))));
}

// ---------------------------------------------------------------- Imports
const IMPORTS = {
  roster: { label: 'Roster (create / update accounts)', tpl: 'roster.csv', note: 'New people get the generic password and must change it at first sign-in. Existing people keep their password.' },
  profile: { label: 'Profile (demand, struggle tags)', tpl: 'profile.csv', note: 'Scenario keys: ' },
  self: { label: 'Self Assessment results', tpl: 'self_assessment.csv', round: true, note: 'Ratings 1 to 5. Use scenario "overall" for the overall average.' },
  live: { label: 'Knowledge test scores', tpl: 'live_scores.csv', round: true, note: 'Correct and total per scenario. Use scenario "overall" for the whole test.' },
  questions: { label: 'Test question bank', tpl: 'questions.csv', round: true, note: 'Question text and correct answer, so trainees can review what they missed.' },
  question_results: { label: 'Per-question results', tpl: 'question_results.csv', round: true, note: 'One row per person per question: correct = 1 or 0.' },
};
export async function importView() {
  await meta();
  const type = select(Object.entries(IMPORTS).map(([k, v]) => [k, v.label]), 'roster', { 'aria-label': 'Import type' });
  const key = h('input', { type: 'text', placeholder: 'e.g. oct-2026-live' }), lab = h('input', { type: 'text', placeholder: 'e.g. Oct 2026 Knowledge Test' }), when = h('input', { type: 'date' }), sort = h('input', { type: 'number', value: 1 });
  const txt = h('textarea', { style: 'min-height:200px;font-family:ui-monospace,Menlo,monospace;font-size:12.5px', placeholder: 'Paste CSV here, or choose a file', spellcheck: 'false' });
  const file = h('input', { type: 'file', accept: '.csv,text/csv', 'aria-label': 'CSV file', on: { change: async (e) => { const f = e.target.files[0]; if (f) txt.value = await f.text(); } } });
  const roundBox = h('div'), noteBox = h('p', { class: 'muted small' }), tplLink = h('a', { href: '#' }), out = h('div');
  const upd = () => { const i = IMPORTS[type.value]; noteBox.textContent = i.note + (type.value === 'profile' ? META.scenarios.map((s) => s.key).join(', ') : ''); tplLink.href = `/templates/${i.tpl}`; tplLink.textContent = `Download template (${i.tpl})`; tplLink.setAttribute('download', i.tpl); roundBox.replaceChildren(i.round ? h('div', { class: 'card flat', style: 'margin-bottom:14px;background:var(--bg-app)' }, h('div', { class: 'grid g2' }, field('Round key', key, 'Lowercase, numbers, hyphens'), field('Round label', lab, 'End with “Self Assessment” or “Knowledge Test”')), h('div', { class: 'grid g2' }, field('Date taken', when), field('Order', sort, 'Older rounds first: 1, 2, 3…'))) : null); };
  type.addEventListener('change', upd); upd();
  const run = h('button', { class: 'btn primary', on: { click: async () => { out.replaceChildren(); run.disabled = true; try { const r = await api('POST', '/api/admin/import', { kind: type.value, csv: txt.value, round_key: key.value, round_label: lab.value, taken_on: when.value || null, sort: Number(sort.value) }); out.append(h('div', { class: r.errors?.length ? 'err' : 'ok' }, `${r.rows} rows read. ` + Object.entries(r).filter(([k]) => ['created', 'updated', 'saved'].includes(k)).map(([k, v]) => `${v} ${k}`).join(', ') + (r.errors?.length ? `. ${r.errors.length} problem${r.errors.length > 1 ? 's' : ''}:` : '.')), r.errors?.length ? h('ul', null, r.errors.slice(0, 30).map((e) => h('li', null, e))) : null); } catch (e) { out.append(h('div', { class: 'err' }, e.message)); } run.disabled = false; } } }, 'Import');
  return h('div', { class: 'page', style: 'max-width:860px' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Imports'), h('p', null, 'Load rosters, results and training plans from CSV. People are matched by email.'))),
    h('div', { class: 'card' }, field('What are you importing?', type), noteBox, h('p', { class: 'small' }, tplLink), roundBox, field('CSV file', file), field('Or paste CSV', txt), h('div', { class: 'row' }, run), h('div', { style: 'margin-top:14px' }, out)));
}

// ---------------------------------------------------------------- Users & access
export async function usersView() {
  await meta();
  const list = await api('GET', '/api/admin/users');
  const add = () => {
    const email = h('input', { type: 'email', placeholder: 'name@kudo.ai' }), name = h('input', { type: 'text' }), role = select([['trainee', 'Trainee'], ['admin', 'Admin']], 'trainee'), region = select([['', '–'], ...META.regions.map((r) => [r, r])], ''), team = select([['', '–'], ...META.teams.map((r) => [r, r])], '');
    modal('Add a person', h('div', null, field('Email', email), field('Name', name), field('Access', role), h('div', { class: 'grid g2' }, field('Region', region), field('Team', team)), h('p', { class: 'muted small' }, 'They sign in with the generic password and are asked to choose their own.')), { actions: (close) => [h('button', { class: 'btn', on: { click: close } }, 'Cancel'), h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', '/api/admin/users', { email: email.value, name: name.value, role: role.value, region: region.value, team: team.value }); close(); toast('Account created'); location.hash = 'users'; window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { toast(e.message, true); } } } }, 'Create')] });
  };
  const rows = list.map((u) => h('tr', null, h('td', null, h('b', null, u.name), h('div', { class: 'muted small' }, u.email)), h('td', null, h('span', { class: `chip ${u.role === 'admin' ? 'coral' : 'blue'}` }, u.role === 'admin' ? 'Admin' : 'Trainee')), h('td', null, u.region || '–'), h('td', null, u.active ? (u.must_change_password ? h('span', { class: 'chip amber' }, 'Generic password') : h('span', { class: 'chip green' }, 'Active')) : h('span', { class: 'chip red' }, 'Deactivated')), h('td', null, u.last_login_at ? fmtDate(u.last_login_at) : 'Never'),
    h('td', null, u.role === 'trainee' ? h('a', { href: `#person-${u.id}` }, 'Open') : h('div', { class: 'row' }, h('button', { class: 'btn sm', on: { click: async () => { if (!confirm(`Reset ${u.name}'s password to the generic password?`)) return; try { await api('POST', `/api/admin/users/${u.id}/reset-password`); toast('Password reset'); } catch (e) { toast(e.message, true); } } } }, 'Reset password')))));
  return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Users & access'), h('p', null, 'Everyone who can sign in. Admins see the whole team; trainees see only their own data.')), h('button', { class: 'btn primary', on: { click: add } }, 'Add person')),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Person', 'Access', 'Region', 'Status', 'Last sign-in', ''].map((x) => h('th', null, x)))), h('tbody', null, rows))));
}

// ---------------------------------------------------------------- Activity
export async function auditView() {
  const rows = await api('GET', '/api/admin/audit');
  return h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Activity log'), h('p', null, 'The last 200 sign-ins and changes.'))),
    h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['When', 'Who', 'Action', 'Target', 'Detail'].map((x) => h('th', null, x)))), h('tbody', null, rows.map((r) => h('tr', null, h('td', null, new Date(r.at).toLocaleString('en-GB')), h('td', null, r.actor_email || '–'), h('td', null, h('span', { class: 'chip grey' }, r.action)), h('td', null, r.target || ''), h('td', { class: 'muted small' }, (r.detail || '').slice(0, 120))))))));
}

// ---------------------------------------------------------------- Logic notes
export function logicView() {
  const sec = (t, ...c) => [h('h3', null, t), ...c];
  return h('div', { class: 'page', style: 'max-width:860px' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Logic notes'), h('p', null, 'The rules the Academy Tracker follows. If a rule changes, update this page too.'))),
    h('div', { class: 'card logic' },
      sec('Who sees what', h('ul', null, h('li', null, h('b', null, 'Admin'), ': every person, every result, plans, targets, notes, imports, access and the activity log.'), h('li', null, h('b', null, 'Trainee'), ': only their own results, progress, targets, training plan and notes shared with them. They cannot see colleagues, team averages or rankings. The server enforces this; the screens do not decide it.'))),
      sec('Sign-in', h('ul', null, h('li', null, 'Email and password, stored in the Academy’s own database as a bcrypt hash.'), h('li', null, 'New accounts start with the generic password and must choose their own at first sign-in (at least 10 characters, a letter and a number).'), h('li', null, 'Five wrong passwords lock the account for 15 minutes. An admin can reset a password to the generic one at any time.'))),
      sec('Self rating as a percentage', h('p', null, 'Each 1 to 5 rating is divided by 5, so 4 out of 5 is 80%. This lets the Self Assessment sit next to the knowledge test score.')),
      sec('Reading of self rating vs test', h('ul', null, h('li', null, 'Under-rated: test is 8 or more points above the self rating.'), h('li', null, 'Over-confident: test is 5 or more points below it.'), h('li', null, 'Accurate: anything in between.'))),
      sec('Training priority (per scenario)', h('p', null, h('code', { class: 'k' }, '40% demand + 30% weakness + 15% stated struggle + 10% reach + 5% risk'), ' (each 0 to 100).'), h('ul', null, h('li', null, 'Demand: the one scenario each person says clients bring them most, weighted by team weight, top scenario = 100.'), h('li', null, 'Weakness: (5 − self rating) ÷ 4 now; 60% share of test answers wrong plus 40% self once the test is loaded.'), h('li', null, 'Struggle: share of people whose dreaded question was tagged to the scenario.'), h('li', null, 'Reach: share of people rating themselves 2 or lower.'), h('li', null, 'Risk: critical steps in the CM Onboarding Guide for the scenario.'), h('li', null, 'Tier 1 is 50+, Tier 2 is 35 to 49, Tier 3 below 35. Half the team at level 2 or lower triggers the safety net.'), h('li', null, 'Team weights: CM & Sales 1.0, other departments 0.5, cross-team 0.'))),
      sec('1:1 priority (CMs & Sales)', h('p', null, h('code', { class: 'k' }, '40% own demand + 30% own weakness + 15% own struggle + 10% over-confidence + 5% risk'), '. 55 or more flags a 1:1. Every 1:1 covers both Human Interpretation and AI Translation.')),
      sec('Rounds and progress', h('p', null, 'Each Self Assessment or knowledge test is a round. Label rounds “Oct 2026 Self Assessment” and “Oct 2026 Knowledge Test” so the progress chart pairs them into one checkpoint. Checkpoints: Jan, Apr, Jul and Oct 2027.')),
      sec('Conventions', h('p', null, 'Never edit a file in place; save a new version. Superseded versions go to the archive.'))));
}
void scoresFor;
