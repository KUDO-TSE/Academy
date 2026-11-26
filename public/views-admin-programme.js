import { h, api, toast, fmtDate, dateOnly, modal } from './ui.js';
import { programmeView, moduleView, KIND_LABEL, DEPTH_LABEL } from './views-programme.js';
import { trajectoryChart } from './charts.js';
import { journeyMap } from './journey.js';

const STATUS = { draft: ['amber', 'Draft: needs approval'], changes: ['amber', 'Changes waiting'], approved: ['green', 'Approved'] };
const RATING = [['', '–'], ['gap', 'Gap'], ['developing', 'Developing'], ['solid', 'Solid']];
const INPUT_KIND = { one_to_one: '1:1 session', recording: 'Call or video review', observation: 'Observation', other: 'Other' };
let META = null;
async function meta() { if (!META) META = await api('GET', '/api/admin/meta'); return META; }
const sc = (k) => META.scenarios.find((s) => s.key === k)?.short || k;

// ------------------------------------------------------------------ overview
export async function programmeOverview() {
  await meta();
  const d = await api('GET', '/api/admin/programme');
  const goal = h('textarea', { rows: 2, maxlength: 400 }, d.settings.goal);
  const target = h('input', { type: 'number', min: 50, max: 100, value: d.settings.target, style: 'width:90px' });
  const drafts = d.rows.filter((r) => r.status !== 'approved').length;
  const jackItems = d.rows.flatMap((r) => r.jackNext.map((t) => ({ who: r.name, id: r.id, t })));
  const awaiting = d.rows.reduce((a, r) => a + r.awaiting, 0);
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Programme'), h('p', null, 'Every trainee\'s plan is built automatically from their results and your inputs. You approve each plan, and any later change, before the trainee sees it.')),
      h('button', { class: 'btn primary', disabled: !drafts, on: { click: async () => { if (!confirmBox(`Approve ${drafts} plan${drafts > 1 ? 's' : ''}?`)) return; const r = await api('POST', '/api/admin/programme/approve-all'); toast(`${r.approved} plans approved`); location.reload(); } } }, drafts ? `Approve all ${drafts} waiting` : 'All plans approved')),
    h('div', { class: 'grid g3' },
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Waiting for your approval'), h('div', { class: 'value' }, drafts), h('div', { class: 'note' }, 'New plans or changes')),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Practice to sign off'), h('div', { class: 'value' }, awaiting), h('div', { class: 'note' }, 'Focus practice tasks marked done')),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Your next sessions'), h('div', { class: 'value' }, jackItems.length), h('div', { class: 'note' }, 'Kick-offs, coaching, check-ins, mock calls'))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Programme goal'), h('p', { class: 'sub' }, 'Shown at the top of every trainee\'s page. The target is the readiness score on Set up scenarios; Hand over scenarios use 10 points less.'),
      h('div', { class: 'row', style: 'align-items:flex-end;gap:12px;flex-wrap:wrap' }, h('label', { class: 'f', style: 'flex:1;min-width:280px;margin:0' }, h('span', { class: 'l' }, 'Goal'), goal), h('label', { class: 'f', style: 'margin:0' }, h('span', { class: 'l' }, 'Target %'), target),
        h('button', { class: 'btn', on: { click: async () => { try { await api('PUT', '/api/admin/programme/settings', { goal: goal.value, target: Number(target.value) }); toast('Saved. Plans recalculated.'); } catch (e) { toast(e.message, true); } } } }, 'Save'))),
    groupSessionsCard(),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Trainees'),
      h('div', { class: 'tbl-wrap', style: 'margin-top:10px' }, h('table', { class: 'tbl' },
        h('thead', null, h('tr', null, ['Name', 'Plan', 'Focus', 'Week', 'Done', 'Readiness', 'Next step', 'Sign-off'].map((x, i) => h('th', { class: [3, 4, 7].includes(i) ? 'num' : '' }, x)))),
        h('tbody', null, d.rows.map((r) => h('tr', { class: 'click', on: { click: () => { sessionStorage.setItem('personTab', 'programme'); location.hash = `person-${r.id}`; } } },
          h('td', null, h('b', null, r.name), r.demo ? h('span', { class: 'chip grey', style: 'margin-left:6px' }, 'Demo') : null, h('div', { class: 'muted small' }, [r.team, r.region].filter(Boolean).join(' · '))),
          h('td', null, h('span', { class: `chip ${STATUS[r.status][0]}` }, STATUS[r.status][1])),
          h('td', null, r.focus.map((f) => h('span', { class: 'chip', style: 'margin:1px' }, sc(f)))),
          h('td', { class: 'num' }, r.week ?? '–'), h('td', { class: 'num' }, r.progress ? `${r.progress.pct}%` : '–'),
          h('td', null, r.readiness ? `${r.readiness.now}% → ${r.readiness.end}%` : '–'),
          h('td', { class: 'small' }, r.next || '–'), h('td', { class: 'num' }, r.awaiting || ''))))))),
    jackItems.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Sessions to book'), h('p', { class: 'sub' }, 'The next open KUDO Trainer sessions in approved plans. Log each one as an input on the person\'s page: that ticks it off.'),
      jackItems.map((x) => h('div', { class: 'row spread', style: 'padding:7px 0;border-top:1px solid var(--border-soft)' }, h('span', null, h('b', null, x.who), ` · ${x.t}`), h('a', { href: `#person-${x.id}`, on: { click: () => sessionStorage.setItem('personTab', 'inputs') } }, 'Log it')))) : null);
}
function confirmBox(text) { return window.confirm(text); } // eslint-disable-line no-alert

// Group sessions: date, time, topic and link. Trainees see the next one on My training, and the virtual coach answers from it.
function groupSessionsCard() {
  const list = h('div');
  const f = { title: h('input', { placeholder: 'Title, e.g. Group kick-off', maxlength: 120 }), when: h('input', { type: 'datetime-local' }), minutes: h('input', { type: 'number', min: 5, max: 480, value: 60, style: 'width:90px' }), topic: h('input', { placeholder: 'Topic (optional)', maxlength: 500 }), link: h('input', { placeholder: 'https:// join link (optional)', maxlength: 500 }) };
  const load = async () => {
    const { sessions } = await api('GET', '/api/admin/group-sessions');
    const now = Date.now(); const up = sessions.filter((x) => new Date(x.starts_at) >= now - 3600e3).reverse();
    list.replaceChildren(up.length ? h('div', null, up.map((x) => h('div', { class: 'row spread', style: 'padding:8px 0;border-top:1px solid var(--border-soft)' },
      h('span', null, h('b', null, x.title), ` · ${new Date(x.starts_at).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} · ${x.minutes} min`, x.topic ? h('div', { class: 'muted small' }, x.topic) : null),
      h('button', { class: 'btn sm', on: { click: async () => { if (!confirmBox(`Remove "${x.title}"?`)) return; await api('DELETE', `/api/admin/group-sessions/${x.id}`); load(); } } }, 'Remove')))) : h('div', { class: 'muted small', style: 'padding:6px 0' }, 'None scheduled.'));
  };
  load().catch(() => {});
  return h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Group sessions'), h('p', { class: 'sub keep' }, 'Trainees see the next one on My training, and the virtual coach answers from this list.'), list,
    h('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:10px' },
      h('label', { class: 'f', style: 'margin:0;flex:1;min-width:180px' }, h('span', { class: 'l' }, 'Title'), f.title), h('label', { class: 'f', style: 'margin:0' }, h('span', { class: 'l' }, 'Date and time'), f.when),
      h('label', { class: 'f', style: 'margin:0' }, h('span', { class: 'l' }, 'Minutes'), f.minutes), h('label', { class: 'f', style: 'margin:0;flex:1;min-width:200px' }, h('span', { class: 'l' }, 'Topic'), f.topic),
      h('label', { class: 'f', style: 'margin:0;flex:1;min-width:200px' }, h('span', { class: 'l' }, 'Link'), f.link),
      h('button', { class: 'btn primary', on: { click: async () => { try { await api('POST', '/api/admin/group-sessions', { title: f.title.value, starts_at: f.when.value ? new Date(f.when.value).toISOString() : '', minutes: Number(f.minutes.value), topic: f.topic.value, link: f.link.value }); toast('Group session added'); f.title.value = ''; f.topic.value = ''; f.link.value = ''; load(); } catch (e) { toast(e.message, true); } } } }, 'Add')));
}

// ------------------------------------------------------------------ person: programme tab
export function tabProgramme(personId, reload) {
  const box = h('div', { class: 'stack' }, h('div', { class: 'muted' }, 'Loading…'));
  (async () => {
    await meta();
    const d = await api('GET', `/api/admin/trainees/${personId}/programme`);
    const cur = d.draft || d.approved;
    const ov = d.overrides || {};
    const focusSel = [0, 1, 2].map((i) => h('select', { 'aria-label': `Focus ${i + 1}` }, h('option', { value: '' }, i ? '–' : 'Automatic'), META.scenarios.map((s) => h('option', { value: s.key, selected: (ov.focus || [])[i] === s.key }, s.label))));
    const msg = h('textarea', { rows: 2, maxlength: 1000, placeholder: 'A personal line shown at the top of their programme (optional)' }, ov.message || '');
    const skip = new Set(ov.skip || []);
    const saveOv = async () => {
      try { await api('PUT', `/api/admin/trainees/${personId}/programme/overrides`, { focus: focusSel.map((s) => s.value).filter(Boolean), skip: [...skip], message: msg.value.trim() || null }); toast('Saved. The plan is rebuilt as a draft if it changed.'); reload(); }
      catch (e) { toast(e.message, true); }
    };
    const diff = d.draft?.diff;
    const items = (cur?.state.items || []).concat((cur?.plan.skipped || []).map((s) => ({ ...s, skipped: true })));
    box.replaceChildren(...[
      d.draft ? h('div', { class: 'card warn-card' }, h('div', { class: 'row spread' }, h('div', null, h('h2', null, d.approved ? `Changes waiting: version ${d.draft.version}` : `New plan: version ${d.draft.version}`), h('p', { class: 'sub', style: 'margin:2px 0 0' }, `Built ${fmtDate(d.draft.created_at)} from the latest inputs. The trainee ${d.approved ? 'keeps seeing the approved version' : 'sees nothing yet'} until you approve.`)),
        h('div', { class: 'row' }, h('a', { class: 'btn', href: `#pview-${personId}-draft` }, 'Preview as trainee'), h('button', { class: 'btn primary', on: { click: async () => { await api('POST', `/api/admin/trainees/${personId}/programme/approve`); toast('Approved'); reload(); } } }, 'Approve'))),
        diff && !diff.first ? h('div', { class: 'diff' },
          diff.focusBefore.join() !== diff.focusAfter.join() ? h('div', null, h('b', null, 'Focus: '), `${diff.focusBefore.map(sc).join(', ') || 'none'} → ${diff.focusAfter.map(sc).join(', ') || 'none'}`) : null,
          diff.added.length ? h('div', null, h('b', null, 'Added: '), diff.added.join(' · ')) : null, diff.removed.length ? h('div', null, h('b', null, 'Removed: '), diff.removed.join(' · ')) : null, diff.moved.length ? h('div', null, h('b', null, 'Moved: '), diff.moved.join(' · ')) : null) : null,
        h('ul', { class: 'muted small', style: 'margin:10px 0 0' }, d.draft.plan.rationale.map((r) => h('li', null, r)))) : null,
      d.approved ? h('div', { class: 'grid g4' },
        h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Approved'), h('div', { class: 'value' }, `v${d.approved.version}`), h('div', { class: 'note' }, `Started ${fmtDate(d.approved.started_on)}`)),
        h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Week'), h('div', { class: 'value' }, `${d.approved.state.week}/12`), h('div', { class: 'note' }, { on: 'On pace', close: 'Slightly behind', behind: 'Behind pace' }[d.approved.state.progress.pace])),
        h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Done'), h('div', { class: 'value' }, `${d.approved.state.progress.pct}%`), h('div', { class: 'note' }, `${d.approved.state.progress.done} of ${d.approved.state.progress.total}`)),
        h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Readiness'), h('div', { class: 'value' }, `${d.approved.state.readiness.now}%`), h('div', { class: 'note' }, `Started ${d.approved.state.readiness.start}% · target ${d.approved.state.readiness.end}%`))) : null,
      d.approved ? (() => { const st = d.approved.state; return h('div', { class: 'stack' },
        h('div', { class: 'card roadmap-card', style: 'margin-top:0' }, h('h2', null, '12 weeks at a glance'), h('p', { class: 'sub' }, 'One stop per week: what it covers, how much is done and the sessions with you'),
          journeyMap({ items: st.items, week: st.week, weeks: st.weeks, phases: META.phases || d.phases || [], levels: st.levels, modules: META.modules || [] })),
        h('div', { class: 'card jr wide' }, h('h2', null, 'Readiness'), trajectoryChart({ trajectory: st.trajectory || [], start: st.readiness.start, now: st.readiness.now, end: st.readiness.end, target: Math.round(st.levels.reduce((t, l) => t + l.target, 0) / st.levels.length), week: st.week, weeks: st.weeks }))); })() : null,
      h('div', { class: 'row' }, d.approved ? h('a', { class: 'btn', href: `#pview-${personId}` }, 'View as trainee') : null),
      h('div', { class: 'card' }, h('h2', null, 'Levels now'), h('p', { class: 'sub' }, 'Estimate per scenario and what last moved it'),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Scenario', 'Start', 'Now', 'Self', 'Test', 'Source'].map((x, i) => h('th', { class: i && i < 5 ? 'num' : '' }, x)))),
          h('tbody', null, d.levels.map((l) => h('tr', null, h('td', null, h('b', null, l.short), cur?.plan.focus.includes(l.scenario) ? h('span', { class: 'chip coral', style: 'margin-left:6px' }, 'Focus') : null), h('td', { class: 'num' }, l.baseline), h('td', { class: 'num' }, h('b', null, l.est)), h('td', { class: 'num' }, l.self != null ? Math.round(l.self) : '–'), h('td', { class: 'num' }, l.live ?? '–'), h('td', { class: 'small muted' }, l.note))))))),
      h('div', { class: 'card' }, h('h2', null, 'Adjust the plan'), h('p', { class: 'sub' }, 'Pin the focus scenarios, skip items, add a personal message. Saving rebuilds the plan as a draft for you to approve.'),
        h('div', { class: 'grid g3' }, focusSel.map((s, i) => h('label', { class: 'f' }, h('span', { class: 'l' }, `Focus ${i + 1}`), s))),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Message to the trainee'), msg),
        h('button', { class: 'btn primary', on: { click: saveOv } }, 'Save adjustments')),
      cur ? h('div', { class: 'card' }, h('h2', null, `Items · ${d.draft ? 'draft' : 'approved'} version`), h('p', { class: 'sub' }, 'Untick to skip an item, then Save adjustments. Sign off focus practice once the trainee shows you.'),
        h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Keep', 'Week', 'Item', 'Type', 'Status', ''].map((x) => h('th', null, x)))),
          h('tbody', null, items.map((it) => h('tr', null,
            h('td', null, h('input', { type: 'checkbox', checked: !it.skipped, 'aria-label': `Keep ${it.title}`, disabled: it.mandatory, on: { change: (e) => { if (e.target.checked) skip.delete(it.key); else skip.add(it.key); } } })),
            h('td', null, it.week ?? '–'), h('td', null, h('b', null, it.title), it.note ? h('div', { class: 'muted small' }, `Trainee note: ${it.note}`) : null),
            h('td', null, it.kind ? h('span', { class: 'chip grey' }, KIND_LABEL[it.kind]) : 'Skipped'),
            h('td', null, it.done ? h('span', { class: 'chip green' }, it.signoff ? (it.signed_off ? 'Signed off' : 'Done') : 'Done') : it.skipped ? '–' : h('span', { class: 'muted small' }, 'Open')),
            h('td', null, it.signoff && it.done && !it.signed_off ? h('button', { class: 'btn sm primary', on: { click: async () => { await api('POST', `/api/admin/trainees/${personId}/items/${it.key}/signoff`); toast('Signed off'); reload(); } } }, 'Sign off') : null,
              it.kind === 'milestone' && !it.done ? h('button', { class: 'btn sm', on: { click: async () => { await api('POST', `/api/admin/trainees/${personId}/items/${it.key}/done`, {}); toast('Marked done'); reload(); } } }, 'Mark done') : null))))))) : null,
      d.attempts.length ? h('div', { class: 'card' }, h('h2', null, 'Checks taken'), d.attempts.slice(0, 20).map((a) => h('div', { class: 'row spread', style: 'padding:6px 0;border-top:1px solid var(--border-soft)' }, h('span', null, a.module_key === 'baseline' ? 'Baseline check' : d.modules.find((m) => m.key === a.module_key)?.title || a.module_key, a.item_key?.startsWith('review') ? ' (review)' : '', a.kind === 'scenario' ? ' (walkthrough)' : '', a.counts === false ? h('span', { class: 'chip grey', style: 'margin-left:6px' }, 'Practice') : h('span', { class: 'chip blue', style: 'margin-left:6px' }, 'Recorded')), h('span', null, h('b', null, `${a.correct}/${a.total}`), h('span', { class: 'muted small' }, ` · ${fmtDate(a.created_at)}`))))) : null,
    ].filter(Boolean));
  })().catch((e) => box.replaceChildren(h('div', { class: 'card empty' }, h('b', null, 'Could not load the programme'), e.message)));
  return box;
}

// ------------------------------------------------------------------ person: inputs tab
export function tabInputs(personId, reload) {
  const box = h('div', { class: 'stack' }, h('div', { class: 'muted' }, 'Loading…'));
  (async () => {
    await meta();
    const d = await api('GET', `/api/admin/trainees/${personId}/programme`);
    const openJack = (d.approved || d.draft)?.state.items.filter((i) => i.owner === 'jack' && i.kind === 'one_to_one' && !i.done) || [];
    const kind = h('select', null, Object.entries(INPUT_KIND).map(([k, l]) => h('option', { value: k }, l)));
    const date = h('input', { type: 'date', value: new Date().toISOString().slice(0, 10) });
    const title = h('input', { type: 'text', maxlength: 200, placeholder: 'e.g. Coaching on Teams' });
    const link = h('input', { type: 'text', placeholder: 'https://… (recording on SharePoint, optional)' });
    const item = h('select', null, h('option', { value: '' }, 'Not linked to a plan item'), openJack.map((i) => h('option', { value: i.key }, `Ticks off: ${i.title}`)));
    item.addEventListener('change', () => { const it = openJack.find((i) => i.key === item.value); if (it && !title.value) title.value = it.title; });
    const body = h('textarea', { rows: 8, placeholder: 'Paste the 1:1 transcript or your notes. You can also load a .txt or .vtt file below.' });
    const file = h('input', { type: 'file', accept: '.txt,.vtt,.md,.srt,text/plain', on: { change: async (e) => { const f = e.target.files[0]; if (!f) return; if (f.size > 2_000_000) return toast('That file is too large (2 MB max).', true); body.value = await f.text(); toast(`Loaded ${f.name}`); } } });
    const sel = Object.fromEntries(META.scenarios.map((s) => [s.key, h('select', { 'aria-label': s.label }, RATING.map(([v, l]) => h('option', { value: v }, l)))]));
    const hints = h('div', { class: 'muted small' });
    const suggest = async () => {
      if (!body.value.trim()) return toast('Paste the transcript or notes first.', true);
      const r = await api('POST', '/api/admin/inputs/suggest', { text: body.value });
      if (!r.signals.length) { hints.replaceChildren('No scenario was mentioned often enough to suggest a rating. Set them yourself.'); return; }
      for (const s of r.signals) sel[s.scenario].value = s.rating;
      hints.replaceChildren(h('b', null, 'Suggested from the text. Check each one before saving: '), ...r.signals.map((s) => h('div', null, `${sc(s.scenario)}: ${s.rating} (${s.mentions} mentions) — “${s.example}”`)));
    };
    const shared = h('textarea', { rows: 3, maxlength: 2000, placeholder: 'What the trainee sees on their programme page (optional). Keep the transcript private.' });
    const save = async () => {
      try {
        const signals = Object.entries(sel).filter(([, s]) => s.value).map(([scenario, s]) => ({ scenario, rating: s.value }));
        const r = await api('POST', `/api/admin/trainees/${personId}/inputs`, { kind: kind.value, happened_on: date.value, title: title.value, link: link.value.trim() || null, body: body.value, signals, item_key: item.value || null, shared_summary: shared.value.trim() || null });
        toast(r.planChanged ? 'Saved. The plan changed: approve it on the Programme tab.' : 'Saved. Levels updated.'); reload();
      } catch (e) { toast(e.message, true); }
    };
    box.replaceChildren(...[
      h('div', { class: 'card' }, h('h2', null, 'Add an input'), h('p', { class: 'sub' }, 'A 1:1, a reviewed call or video, or something you observed. Ratings shape this person\'s plan (it is rebuilt as a draft if it needs to change). Their levels move only with their test results.'),
        h('div', { class: 'grid g3' }, h('label', { class: 'f' }, h('span', { class: 'l' }, 'Type'), kind), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Date'), date), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Plan item'), item)),
        h('div', { class: 'grid g2' }, h('label', { class: 'f' }, h('span', { class: 'l' }, 'Title'), title), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Recording link'), link)),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Transcript or notes (private)'), body), h('div', { class: 'row' }, file, h('button', { class: 'btn', on: { click: suggest } }, 'Suggest ratings from the text')), hints,
        h('h3', { style: 'margin:14px 0 6px' }, 'What this showed, by scenario'), h('div', { class: 'sig-grid' }, META.scenarios.map((s) => h('label', null, h('span', null, s.short), sel[s.key]))),
        h('p', { class: 'muted small' }, 'Gap caps the level at 45%. Developing sets it between 50 and 69%. Solid raises it to at least 80%.'),
        h('label', { class: 'f' }, h('span', { class: 'l' }, 'Summary for the trainee'), shared), h('button', { class: 'btn primary', on: { click: save } }, 'Save input')),
      h('div', { class: 'card' }, h('h2', null, 'Inputs so far'), d.inputs.length ? d.inputs.map((i) => h('div', { class: 'note-box' },
        h('div', { class: 'row spread' }, h('b', null, `${i.title}`), h('span', { class: 'row' }, h('span', { class: 'chip grey' }, INPUT_KIND[i.kind]), h('button', { class: 'btn sm danger', on: { click: async () => { if (!confirmBox('Delete this input? Levels and the plan are recalculated.')) return; await api('DELETE', `/api/admin/inputs/${i.id}`); toast('Deleted'); reload(); } } }, 'Delete'))),
        h('div', { class: 'muted small' }, [fmtDate(i.happened_on), i.author, i.item_key ? `ticks off ${i.item_key}` : null].filter(Boolean).join(' · ')),
        i.signals.length ? h('div', { class: 'row', style: 'margin-top:6px;flex-wrap:wrap' }, i.signals.map((s) => h('span', { class: `chip ${{ gap: 'coral', developing: 'amber', solid: 'green' }[s.rating]}` }, `${sc(s.scenario)}: ${s.rating}`))) : null,
        i.shared_summary ? h('div', { style: 'margin-top:6px' }, h('b', null, 'Shared: '), i.shared_summary) : null,
        i.link ? h('div', null, h('a', { href: i.link, target: '_blank', rel: 'noopener noreferrer' }, 'Recording')) : null,
        i.body ? h('details', { style: 'margin-top:6px' }, h('summary', null, 'Transcript or notes'), h('div', { class: 'pre' }, i.body)) : null)) : h('div', { class: 'muted' }, 'No inputs yet.'))].filter(Boolean));
  })().catch((e) => box.replaceChildren(h('div', { class: 'card empty' }, h('b', null, 'Could not load'), e.message)));
  return box;
}

// ------------------------------------------------------------------ preview and curriculum
export async function previewProgramme(id, draft) {
  const data = await api('GET', `/api/admin/trainees/${id}/preview${draft ? '?draft=1' : ''}`);
  const bar = h('div', { class: 'preview-bar' }, h('span', null, `Preview: ${draft ? 'the draft plan for' : 'what'} ${data.user?.name} ${draft ? '' : 'sees'}. Read only.`), h('div', { class: 'row' }, h('a', { class: 'btn sm', href: `#person-${id}`, on: { click: () => sessionStorage.setItem('personTab', 'programme') } }, 'Exit preview')));
  return programmeView(data, { readOnly: true, banner: bar, part: 'all' });
}

let CUR = null;
export async function curriculumView(key) {
  if (!CUR) CUR = await api('GET', '/api/admin/curriculum');
  if (key) {
    const m = CUR.modules.find((x) => x.key === key);
    if (!m) return h('div', { class: 'page' }, h('div', { class: 'card empty' }, 'Module not found.'));
    return moduleView({ ...m, pass: 0.8 }, { mode: 'admin' });
  }
  const track = { core: 'Core', scenario: 'Scenario', cross: 'Cross-cutting' };
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Curriculum'), h('p', null, `${CUR.modules.length} modules written for KUDO from the CM Onboarding Guide V3, the explainer videos and the current Help Center. Each has objectives, a lesson, practice, a graded check and hand-over rules.`))),
    h('div', { class: 'card' }, h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Module', 'Track', 'Depth', 'Minutes', 'Check'].map((x, i) => h('th', { class: i > 2 ? 'num' : '' }, x)))),
      h('tbody', null, CUR.modules.map((m) => h('tr', { class: 'click', on: { click: () => { location.hash = `curriculum-${m.key}`; } } }, h('td', null, h('b', null, m.title), h('div', { class: 'muted small' }, m.summary)), h('td', null, track[m.track]), h('td', null, DEPTH_LABEL[m.depth]), h('td', { class: 'num' }, m.minutes), h('td', { class: 'num' }, `${m.quiz.length} q`))))))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Depth levels'), Object.values(CUR.depth).map((d) => h('div', { style: 'padding:6px 0' }, h('b', null, `${d.label}: `), d.can))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Source decisions'), h('p', { class: 'sub' }, 'Where the Guide, the videos and the Help Center disagree, this is what the lessons teach.'), CUR.decisions.map((x) => h('div', { class: 'q-item' }, h('b', null, x.topic), h('div', null, x.decision)))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Videos and the Guide'), h('p', null, 'Video and Guide links in the lessons open the ', h('a', { href: CUR.folder, target: '_blank', rel: 'noopener noreferrer' }, 'Academy SharePoint folder'), '.')));
}
void dateOnly; void modal;

// ------------------------------------------------------------------ explain-it reviews
export async function reviewsView() {
  const d = await api('GET', '/api/admin/reviews');
  const pending = d.items.filter((x) => x.status !== 'reviewed' && x.needs_human), done = d.items.filter((x) => !(x.status !== 'reviewed' && x.needs_human));
  const card = (x) => {
    const sel = Object.fromEntries(d.rubric.map((c) => [c.key, h('select', { 'aria-label': c.label }, h('option', { value: '' }, '–'), [1, 2, 3].map((n) => h('option', { value: n, selected: (x.rubric || x.auto?.rubric)?.[c.key] === n }, `${n} · ${['Not yet', 'Partly', 'Fully'][n - 1]}`)))]));
    const comment = h('textarea', { rows: 2, placeholder: 'Feedback the trainee will see' }, x.review_comment || '');
    return h('div', { class: 'card', style: 'margin-bottom:14px' },
      h('div', { class: 'row spread' }, h('div', null, h('h2', null, x.name), h('div', { class: 'muted small' }, `${x.kind === 'practice' ? 'Practice' : 'Explain it'}${x.counts === false ? ' (practice retry, does not count)' : ' (recorded result)'} · ${x.module} · sent ${fmtDate(x.created_at)}`)), h('span', { class: `chip ${x.status === 'reviewed' ? 'green' : x.needs_human ? 'amber' : 'blue'}` }, x.status === 'reviewed' ? 'Reviewed by you' : x.status === 'auto' ? (x.needs_human ? 'Spot-check' : 'Auto-reviewed') : 'To review')),
      h('div', { class: 'explain-prompt' }, x.prompt),
      x.has_audio ? h('audio', { controls: true, preload: 'none', src: `/api/admin/submissions/${x.id}/audio`, style: 'width:100%;margin:8px 0' }) : null,
      x.transcript ? h('details', { open: true }, h('summary', null, 'Transcript'), h('div', { class: 'pre' }, x.transcript)) : x.text_answer ? h('div', { class: 'pre' }, x.text_answer) : null,
      x.auto?.rubric ? h('div', { class: 'auto-box' }, h('b', null, `Automatic review: ${x.auto.rating} (${x.auto.avg}/3)`), h('div', { class: 'small' }, x.auto.note), x.auto.flags?.length ? h('div', { class: 'small', style: 'color:var(--danger)' }, `Flags: ${x.auto.flags.join('; ')}`) : null, h('div', { class: 'muted small' }, `Pace ${x.auto.metrics?.wpm ?? '–'} words/min · ${x.auto.metrics?.fillers ?? 0} filler words`)) : null,
      x.human_requested ? h('div', { class: 'chip coral' }, 'The trainee asked for your view') : null,
      h('div', { class: 'small', style: 'margin-top:8px' }, h('b', null, 'Key points (✓ = trainee says they covered it): '), h('ul', { style: 'list-style:none;padding-left:4px;margin:4px 0' }, x.points.map((p, i) => h('li', null, (x.self_points || []).includes(i) ? '✓ ' : '○ ', p)))),
      h('div', { class: 'grid g4' }, d.rubric.map((c) => h('label', { class: 'f' }, h('span', { class: 'l' }, c.label), sel[c.key], h('div', { class: 'hint' }, c.hint)))),
      comment,
      h('button', { class: 'btn primary', style: 'margin-top:8px', on: { click: async () => {
        const rubric = Object.fromEntries(Object.entries(sel).map(([k, s]) => [k, Number(s.value)]));
        try { const r = await api('POST', `/api/admin/submissions/${x.id}/review`, { rubric, comment: comment.value.trim() || null }); toast(`Saved: counts as ${r.rating}${r.planChanged ? '. The plan changed: approve it on the Programme tab.' : '.'}`); location.reload(); } catch (e) { toast(e.message, true); }
      } } }, x.status === 'reviewed' ? 'Update review' : x.status === 'auto' ? 'Confirm or change the scores' : 'Save review'));
  };
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Reviews'), h('p', null, 'Practice tasks and explain-it recordings are reviewed automatically. You only see spot-checks here: flagged answers, gaps, requests from trainees and a random 20%. Your scores replace the automatic ones.'))),
    pending.length ? pending.map(card) : h('div', { class: 'card empty' }, h('b', null, 'No spot-checks waiting'), 'Flagged or sampled recordings appear here.'),
    done.length ? h('h2', { class: 'sec-h' }, 'Recent reviews') : null, done.slice(0, 20).map(card));
}

// ------------------------------------------------------------------ feedback and item analysis
export async function feedbackView() {
  const d = await api('GET', '/api/admin/feedback');
  const f1 = (v) => (v == null ? '–' : v.toFixed(1));
  const low = (v) => v != null && v < 3.5;
  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Feedback'), h('p', null, 'What trainees say about each module, what they answer at the end, and which questions they miss most. Comments are shown without names.'))),
    h('div', { class: 'grid g3' },
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Recommendation score (NPS)'), h('div', { class: 'value' }, d.survey.nps ?? '–'), h('div', { class: 'note' }, `${d.survey.n} end-of-programme answers`)),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Module ratings'), h('div', { class: 'value' }, d.modules.reduce((a, m) => a + m.n, 0)), h('div', { class: 'note' }, 'After each module')),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Questions analysed'), h('div', { class: 'value' }, d.hardest.length), h('div', { class: 'note' }, 'Answered at least twice'))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'By module'), h('p', { class: 'sub' }, 'Average from 1 to 5. Below 3.5 is highlighted.'),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Module', 'Answers', 'Clear', 'Relevant', 'Confident'].map((x, i) => h('th', { class: i ? 'num' : '' }, x)))),
        h('tbody', null, d.modules.map((m) => h('tr', null, h('td', null, m.title), h('td', { class: 'num' }, m.n), ...['clear', 'relevant', 'confidence'].map((k) => h('td', { class: 'num' }, h('span', { class: low(m[k]) ? 'chip coral' : '' }, f1(m[k])))))))))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Questions missed most'), h('p', { class: 'sub' }, 'Low success points to unclear content or a misconception. "Certain but wrong" is the strongest misconception signal.'),
      d.hardest.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Question', 'Module', 'Answered', 'Success', 'Certain but wrong'].map((x, i) => h('th', { class: i > 1 ? 'num' : '' }, x)))),
        h('tbody', null, d.hardest.map((x) => h('tr', null, h('td', null, x.q), h('td', null, x.module), h('td', { class: 'num' }, x.n), h('td', { class: 'num' }, `${x.rate}%`), h('td', { class: 'num' }, x.confWrong || '')))))) : h('div', { class: 'muted' }, 'Appears once questions have been answered at least twice.')),
    qualityCard(d.stats || []),
    agreementCard(d.agreement),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Comments on modules'), d.comments.length ? d.comments.map((c) => h('div', { class: 'note-box' }, h('b', null, c.module), h('div', null, c.comment), h('div', { class: 'when' }, fmtDate(c.created_at)))) : h('div', { class: 'muted' }, 'No comments yet.')),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'End-of-programme survey'), d.survey.n ? h('div', null,
      Object.entries(d.survey.averages).map(([q, v]) => h('div', { class: 'row spread', style: 'padding:6px 0;border-top:1px solid var(--border-soft)' }, h('span', null, q), h('b', null, f1(v)))),
      h('h3', { style: 'margin-top:12px' }, 'Used it with a client yet?'), d.survey.applied.map((a) => h('div', { class: 'row spread' }, h('span', null, a.o), h('b', null, a.n))),
      d.survey.texts.map((t) => h('div', { style: 'margin-top:12px' }, h('h3', null, t.q), t.answers.length ? t.answers.map((a) => h('div', { class: 'note-box' }, a)) : h('div', { class: 'muted' }, 'No answers.')))) : h('div', { class: 'muted' }, 'Opens in week 12 of each plan.')))
}

const VERDICT_CHIP = { keep: 'green', 'too few answers yet': 'grey' };
function qualityCard(stats) {
  const flagged = stats.filter((x) => !['keep', 'too few answers yet'].includes(x.verdict));
  const row = (x) => h('tr', null,
    h('td', null, x.q, x.options ? h('details', null, h('summary', { class: 'small' }, 'Options picked'), h('ul', { class: 'ans-list' }, x.options.map((o) => h('li', null, o.key ? h('b', null, o.o) : o.o, ` · ${o.n}${!o.key && o.n === 0 && x.n >= 20 ? ' · never picked' : ''}`)))) : null),
    h('td', null, x.module), h('td', { class: 'num' }, x.n), h('td', { class: 'num' }, `${x.p}%`), h('td', { class: 'num' }, x.d == null ? '–' : x.d.toFixed(2)),
    h('td', null, h('span', { class: `chip ${VERDICT_CHIP[x.verdict] || 'coral'}` }, x.verdict)));
  return h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Question quality'),
    h('p', { class: 'sub' }, 'From first attempts only. Success is the share answered right. Separation is how much better strong trainees do on this question than weak ones (0.2 or more is good; below 0 means the key may be wrong). The numbers mean little under 20 answers.'),
    stats.length ? h('div', null,
      h('p', null, flagged.length ? `${flagged.length} question${flagged.length > 1 ? 's' : ''} to look at.` : 'No question needs attention yet.'),
      h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Question', 'Module', 'Answers', 'Success', 'Separation', 'Verdict'].map((x, i) => h('th', { class: i > 1 && i < 5 ? 'num' : '' }, x)))),
        h('tbody', null, [...flagged, ...stats.filter((x) => !flagged.includes(x))].map(row))))) : h('div', { class: 'muted' }, 'Appears once trainees have taken checks.'));
}
function agreementCard(a) {
  if (!a) return null;
  return h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Automatic review compared with the KUDO Trainer'),
    h('p', { class: 'sub' }, `Every recording or practice that the KUDO Trainer also reviewed (${a.n} so far). ${a.enough ? 'Enough to judge: tune the automatic review where agreement is low.' : 'About 30 are needed before tuning anything.'} Clarity is a tip only and does not count towards levels until it agrees well.`),
    a.n ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Rubric line', 'Compared', 'Same score', 'Within 1 point'].map((x, i) => h('th', { class: i ? 'num' : '' }, x)))),
      h('tbody', null, a.lines.map((l) => h('tr', null, h('td', null, l.label), h('td', { class: 'num' }, l.n), h('td', { class: 'num' }, l.exactPct == null ? '–' : `${l.exactPct}%`), h('td', { class: 'num' }, l.within1Pct == null ? '–' : `${l.within1Pct}%`))),
        h('tr', null, h('td', null, h('b', null, 'Overall rating (Gap / Developing / Solid)')), h('td', { class: 'num' }, a.rating.n), h('td', { class: 'num' }, a.rating.samePct == null ? '–' : `${a.rating.samePct}%`), h('td', null, ''))))) : h('div', { class: 'muted' }, 'Appears once the KUDO Trainer has spot-checked a submission.'));
}

// ------------------------------------------------------------------ test trainees (Users & access)
export function testTraineesCard() {
  const box = h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'muted' }, 'Loading…'));
  const draw = async () => {
    const list = await api('GET', '/api/admin/demo');
    const first = h('input', { type: 'text', placeholder: 'Tester first name, e.g. Erick', maxlength: 30, style: 'max-width:260px' });
    box.replaceChildren(
      h('h2', null, 'Test trainees'), h('p', { class: 'sub' }, 'Fictional trainees for trying the trainee side: same plan, lessons, checks and recordings as a real person, but never counted in team results, priorities, feedback or the board\'s schedule. One per tester, because the first sign-in changes the password. Sign in with the generic password.'),
      list.length ? h('div', { class: 'tbl-wrap' }, h('table', { class: 'tbl' }, h('thead', null, h('tr', null, ['Test trainee', 'Sign-in email', 'Status', ''].map((x) => h('th', null, x)))),
        h('tbody', null, list.map((u) => h('tr', null, h('td', null, h('b', null, u.name)), h('td', null, h('code', { class: 'k' }, u.email)),
          h('td', null, u.must_change_password ? h('span', { class: 'chip grey' }, 'Not used yet') : h('span', { class: 'chip green' }, `In use${u.last_login_at ? ` · ${fmtDate(u.last_login_at)}` : ''}`)),
          h('td', null, h('div', { class: 'row' }, h('button', { class: 'btn sm primary', on: { click: () => actAs(u.id) } }, 'Take the courses'), h('a', { class: 'btn sm', href: `#person-${u.id}` }, 'Admin view'), h('button', { class: 'btn sm', on: { click: async () => {
            if (!confirmBox(`Reset ${u.name}? Its progress, recordings and password go back to the start.`)) return;
            try { await api('POST', `/api/admin/demo/${u.id}/reset`); toast('Reset. Sign in again with the generic password.'); draw(); } catch (e) { toast(e.message, true); }
          } } }, 'Reset to start')))))))) : h('div', { class: 'muted' }, 'None yet.'),
      h('div', { class: 'row', style: 'margin-top:12px;gap:8px' }, first, h('button', { class: 'btn primary', on: { click: async () => {
        try { const r = await api('POST', '/api/admin/demo', { name: first.value }); toast(`Created: sign in as ${r.email}`); draw(); } catch (e) { toast(e.message, true); }
      } } }, 'Create a test trainee')));
  };
  draw().catch((e) => box.replaceChildren(h('div', { class: 'muted' }, e.message)));
  return box;
}

export async function actAs(id) {
  try { await api('POST', '/api/auth/act-as', { id }); location.hash = 'programme'; location.reload(); } catch (e) { toast(e.message, true); }
}

// "Try as a trainee": step straight into the admin's own test trainee (demo.<first name>@kudo.ai), or pick one.
export async function tryView(me) {
  const list = await api('GET', '/api/admin/demo');
  const first = String(me.email || '').split('@')[0].split(/[._-]/)[0].toLowerCase();
  const mine = list.find((u) => u.email.toLowerCase() === `demo.${first}@kudo.ai`);
  const page = h('div', { class: 'page' }, h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Try as a trainee'), h('p', null, 'Step into a test trainee and take the courses for real: lessons, checks, walkthroughs, recordings. Nothing counts in the team results. A banner brings you back to admin in one click.'))),
    mine ? h('div', { class: 'card' }, h('h2', null, mine.name), h('p', { class: 'sub' }, 'Your own test trainee.'), h('button', { class: 'btn primary', on: { click: () => actAs(mine.id) } }, 'Start as my test trainee')) : null,
    testTraineesCard());
  return page;
}
