import { h, api, toast, fmtDate, dateOnly, modal } from './ui.js';
import { programmeView, moduleView, KIND_LABEL, DEPTH_LABEL } from './views-programme.js';

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
    jackItems.length ? h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Sessions to book'), h('p', { class: 'sub' }, 'The next open Jack items in approved plans. Log each one as an input on the person\'s page: that ticks it off.'),
      jackItems.map((x) => h('div', { class: 'row spread', style: 'padding:7px 0;border-top:1px solid var(--border-soft)' }, h('span', null, h('b', null, x.who), ` · ${x.t}`), h('a', { href: `#person-${x.id}`, on: { click: () => sessionStorage.setItem('personTab', 'inputs') } }, 'Log it')))) : null);
}
function confirmBox(text) { return window.confirm(text); } // eslint-disable-line no-alert

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
      h('div', { class: 'row' }, d.approved ? h('a', { class: 'btn', href: `#pview-${personId}` }, 'View as trainee') : null),
      h('div', { class: 'card' }, h('h2', null, 'Levels now'), h('p', { class: 'sub' }, 'Estimate per scenario and what last moved it.'),
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
      d.attempts.length ? h('div', { class: 'card' }, h('h2', null, 'Checks taken'), d.attempts.slice(0, 20).map((a) => h('div', { class: 'row spread', style: 'padding:6px 0;border-top:1px solid var(--border-soft)' }, h('span', null, a.module_key === 'baseline' ? 'Baseline check' : d.modules.find((m) => m.key === a.module_key)?.title || a.module_key, a.item_key?.startsWith('review') ? ' (review)' : ''), h('span', null, h('b', null, `${a.correct}/${a.total}`), h('span', { class: 'muted small' }, ` · ${fmtDate(a.created_at)}`))))) : null,
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
      h('div', { class: 'card' }, h('h2', null, 'Add an input'), h('p', { class: 'sub' }, 'A 1:1, a reviewed call or video, or something you observed. Ratings move this person\'s levels; the plan is rebuilt as a draft if it needs to change.'),
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
  return programmeView(data, { readOnly: true, banner: bar });
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
