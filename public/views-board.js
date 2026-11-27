import { h, api, toast, fmtDate, modal } from './ui.js';

const TYPE = { approval: ['amber', 'Approve'], session: ['coral', 'Session'], milestone: ['coral', 'Milestone'], review: ['blue', 'Review'], signoff: ['green', 'Sign-off'], nudge: ['grey', 'Nudge'], pairing: ['green', 'Teach-back'], learning: ['blue', 'Sessions'], content: ['blue', 'Content'], message: ['amber', 'Message'] };
const GROUPS = [['overdue', 'Overdue', 'Sessions that should have happened already'], ['now', 'Do first', 'Waiting on you and blocking a trainee'], ['this_week', 'This week', ''], ['next_week', 'Next week', 'Book these now'], ['later_ok', 'When you can', '']];
const hrs = (m) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}`.trim() : `${m} min`);

export async function boardView() {
  const b = await api('GET', '/api/admin/board');
  const act = async (key, action) => { try { await api('POST', '/api/admin/board/tasks', { key, action }); toast(action === 'snooze' ? 'Snoozed for a week' : 'Marked as handled'); window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { toast(e.message, true); } };
  const openBtn = (t) => h('a', { class: 'btn sm primary', href: t.link, on: { click: () => { if (t.tab) sessionStorage.setItem('personTab', t.tab); } } }, { session: 'Log it', milestone: 'Open', approval: 'Review', review: 'Listen', signoff: 'Sign off', nudge: 'Open', pairing: 'Open', learning: 'Review', content: 'Open' }[t.type]);
  const groupHeld = (t) => {
    const names = t.detail.split(': ')[1].split('. Mark')[0].split(', ');
    const boxes = t.userIds.map((id, i) => h('label', { class: 'opt' }, h('input', { type: 'checkbox', checked: true, value: id }), h('span', null, names[i])));
    const body = h('div', null, h('p', { class: 'muted' }, 'Untick anyone who did not attend. Their own session stays in their plan.'), ...boxes);
    modal(t.title, body, { actions: (close) => [h('button', { class: 'btn', on: { click: close } }, 'Cancel'), h('button', { class: 'btn primary', on: { click: async () => {
      const ids = boxes.map((b) => b.querySelector('input')).filter((x) => x.checked).map((x) => Number(x.value));
      try { const r = await api('POST', '/api/admin/board/group-done', { itemKey: t.itemKey, userIds: ids }); close(); toast(`Logged for ${r.logged} trainees`); window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { toast(e.message, true); }
    } } }, 'Mark held')] });
  };
  // A trainee's message from the coach panel: reply (they see it in their panel) or mark it noted.
  const replyTo = (t) => {
    const ta = h('textarea', { rows: 5, placeholder: 'Your reply: the trainee sees it in their coach panel', maxlength: 4000 });
    const send = async (noted, close) => { try { await api('POST', `/api/admin/trainer-messages/${t.messageId}/reply`, noted ? { noted: true, reply: ta.value } : { reply: ta.value }); close(); toast(noted ? 'Marked as noted' : 'Reply sent'); window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { toast(e.message, true); } };
    modal(`${t.title}`, h('div', null, h('div', { class: 'note-box' }, h('div', { class: 'muted small' }, `${t.person}, ${new Date(t.sent).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`), h('p', { style: 'white-space:pre-wrap;margin:6px 0 0' }, t.detail)), h('label', { class: 'f', style: 'margin-top:12px' }, h('span', { class: 'l' }, 'Reply'), ta)),
      { actions: (close) => [h('button', { class: 'btn', on: { click: close } }, 'Cancel'), h('button', { class: 'btn', title: 'No answer needed: the trainee sees it was noted (with your note, if you wrote one)', on: { click: () => send(true, close) } }, 'Noted'), h('button', { class: 'btn primary', on: { click: () => send(false, close) } }, 'Send reply')] });
  };
  const card = (t) => h('div', { class: `task ${t.urgency}` },
    h('div', { class: 'task-main' },
      h('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' }, h('span', { class: `chip ${TYPE[t.type][0]}` }, TYPE[t.type][1]), t.person ? h('b', null, t.person) : null, t.demo ? h('span', { class: 'chip grey' }, 'Demo') : null, h('span', { class: 'muted small' }, `${t.minutes} min`), t.type === 'session' || t.type === 'milestone' ? h('span', { class: 'muted small' }, `due ${fmtDate(t.due)}`) : null),
      h('div', { class: 'task-t' }, t.title), t.detail ? h('div', { class: 'muted small' }, t.detail) : null),
    h('div', { class: 'task-act' }, t.type === 'message' ? h('button', { class: 'btn sm primary', on: { click: () => replyTo(t) } }, 'Reply') : t.group ? h('button', { class: 'btn sm primary', on: { click: () => groupHeld(t) } }, 'Mark held') : openBtn(t),
      t.message ? h('button', { class: 'btn sm', on: { click: async () => { try { await navigator.clipboard.writeText(t.message); toast('Message copied: paste it in Teams'); } catch { toast('Could not copy', true); } } } }, 'Copy message') : null,
      t.canHandle ? h('button', { class: 'btn sm', on: { click: () => act(t.key, 'handled') } }, 'Done') : null,
      h('button', { class: 'btn sm', title: 'Hide for a week', on: { click: () => act(t.key, 'snooze') } }, 'Snooze')));

  const hours = h('input', { type: 'number', min: 1, max: 40, value: b.settings.hours, style: 'width:80px', id: 'wk-hours' });
  const dayBoxes = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => h('label', { class: 'daybox' }, h('input', { type: 'checkbox', checked: b.settings.days.includes(i + 1) }), h('span', null, d)));
  const saveSettings = async () => { try { await api('PUT', '/api/admin/board/settings', { hours: Number(hours.value), days: dayBoxes.map((x, i) => (x.querySelector('input').checked ? i + 1 : null)).filter(Boolean) }); toast('Saved'); window.dispatchEvent(new HashChangeEvent('hashchange')); } catch (e) { toast(e.message, true); } };
  const over = b.week.needMinutes > b.week.capacityMinutes;
  const c = b.counts;

  return h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My board'), h('p', null, `Everything the Academy is waiting on you for, week of ${fmtDate(b.weekOf)}. Doing the action clears the task.`)),
      h('a', { class: 'btn', href: '/api/admin/board/week.ics' }, 'Add this week\'s sessions to my calendar')),
    h('div', { class: 'grid g4' },
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Sessions to hold'), h('div', { class: 'value' }, c.session), h('div', { class: 'note' }, 'This week, next week and overdue')),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Approvals and messages'), h('div', { class: 'value' }, c.approval + (c.message || 0)), h('div', { class: 'note' }, `${c.approval} plan${c.approval === 1 ? '' : 's'}, ${c.message || 0} message${c.message === 1 ? '' : 's'}`)),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Reviews and sign-offs'), h('div', { class: 'value' }, c.review + c.signoff), h('div', { class: 'note' }, [b.reviewSplit ? `${b.reviewSplit.recording} recording${b.reviewSplit.recording === 1 ? '' : 's'}` : `${c.review} reviews`, b.reviewSplit?.practice ? `${b.reviewSplit.practice} practice` : null, c.signoff ? `${c.signoff} sign-off${c.signoff === 1 ? '' : 's'}` : null].filter(Boolean).join(', '))),
      h('div', { class: 'card kpi' }, h('div', { class: 'label' }, 'Trainees to nudge'), h('div', { class: 'value' }, c.nudge), h('div', { class: 'note' }, 'Behind pace or inactive'))),

    h('div', { class: 'card', style: 'margin-top:16px' },
      h('div', { class: 'row spread', style: 'flex-wrap:wrap;gap:12px' }, h('div', null, h('h2', null, 'Your suggested week'), h('p', { class: 'sub', style: 'margin:2px 0 0' }, `Needs ${hrs(b.week.needMinutes)}, you have ${hrs(b.week.capacityMinutes)}. Sessions are spread out, small tasks are batched.`)),
        h('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap' }, h('label', { class: 'muted small', for: 'wk-hours' }, 'Hours a week for the Academy'), hours, ...dayBoxes, h('button', { class: 'btn sm', on: { click: saveSettings } }, 'Save'))),
      over ? h('div', { class: 'warn-line' }, `This week needs more time than you have. ${b.week.overflow.length} task${b.week.overflow.length > 1 ? 's' : ''} do not fit: snooze them, or raise your hours.`) : null,
      h('div', { class: 'weekgrid' }, b.week.days.map((d) => h('div', { class: `wday ${d.date === b.today ? 'today' : ''}` },
        h('div', { class: 'wday-h' }, h('b', null, d.label), h('span', null, fmtDate(d.date)), h('span', { class: 'muted small' }, hrs(d.minutes))),
        d.tasks.length ? d.tasks.map((t) => h('div', { class: `wtask ${t.type}` }, h('b', null, t.person || 'Content'), h('div', null, t.title), h('span', { class: 'muted small' }, `${TYPE[t.type]?.[1] || 'Task'}, ${t.minutes} min`))) : h('div', { class: 'muted small' }, 'Free')))),
      b.week.overflow.length ? h('div', { class: 'small', style: 'margin-top:10px' }, h('b', null, 'Does not fit: '), b.week.overflow.map((t) => `${t.title}${t.person ? ` (${t.person})` : ''}`).join(', ')) : null),

    ...GROUPS.map(([k, label, sub]) => {
      const list = b.tasks.filter((t) => t.urgency === k);
      if (!list.length) return null;
      return h('div', { class: 'card', style: 'margin-top:16px' }, h('div', { class: 'row spread' }, h('h2', null, `${label} (${list.length})`), sub ? h('span', { class: 'muted small' }, sub) : null), list.map(card));
    }),
    b.tasks.length ? null : h('div', { class: 'card empty', style: 'margin-top:16px' }, h('b', null, 'Nothing waiting on you'), 'Enjoy it.'));
}
