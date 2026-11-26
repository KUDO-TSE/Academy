// Sandbox: a replica of the KUDO screens a scenario needs, rebuilt from an expert's screen recording.
// The trainee does the task here instead of in a test account. Everything they do is recorded (clicks, fields,
// screens, time, detours, hints) and the run is scored: outcome first, then path, then time.
// Scenario 1 (pilot): run a meeting, add a language live, find the recordings. Test data only.
import { h, api, toast, svg } from './ui.js';
// Line icons (stroke) in the style of the KUDO screens.
const I = {
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/>', clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  lang: '<path d="M4 6h9M8.5 4v2M6 6c.5 3 2.5 5.5 5 7M11 6c-.6 3.4-3 6.4-6 8M13 20l4-9 4 9M14.5 17h5"/>', play: '<path d="M8 5l11 7-11 7z"/>', edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>', stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>', restart: '<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>', trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M16 5a3.5 3.5 0 010 7M18 14c2 .6 3.5 2.4 3.5 6"/>', link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  doc: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/>', plus: '<path d="M12 5v14M5 12h14"/>', speaker: '<path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6"/>', cc: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M10 10a2 2 0 100 4M17 10a2 2 0 100 4"/>',
  bell: '<path d="M6 16V11a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0"/>', help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 114 2c-1 .7-1.5 1.3-1.5 2.5M12 17v.01"/>', lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>', warn: '<path d="M12 4l9 16H3zM12 10v4M12 17v.01"/>',
};
const ic = (n, size = 16) => svg(`<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[n]}</svg>`);


const SPEAKER = ['Arabic', 'Basque', 'Bulgarian', 'Cantonese', 'Catalan', 'Chinese', 'Dutch', 'English', 'Estonian', 'Filipino', 'Finnish', 'French', 'Galician', 'Georgian', 'German', 'Italian', 'Japanese', 'Korean', 'Portuguese', 'Russian', 'Spanish'];
const TRANSLATION = ['Afrikaans', 'Arabic', 'Bulgarian', 'Dutch', 'English (UK)', 'English (US)', 'Estonian', 'Filipino', 'Finnish', 'French (Canada)', 'French (France)', 'Galician', 'Georgian', 'German', 'Italian', 'Japanese', 'Korean', 'Portuguese (Brazil)', 'Portuguese (Portugal)', 'Russian', 'Spanish (Mexico)', 'Spanish (Spain)'];
const HOST = 'host@client-demo.com';
const NAME = 'Quarterly Partner Update';
const fr = (l) => /^French/.test(l), de = (l) => l === 'German', es = (l) => /^Spanish/.test(l);

export const SCENARIOS = {
  'platform-1': {
    module: 'platform', title: 'Run a meeting, add a language live, find the recording',
    request: `A client runs "${NAME}" with AI Translation. Create the meeting with English as the speaker language and French and German as translation languages. Add the Host (${HOST}) and make sure the meeting is recorded. Start it. While it is live, the client asks for Spanish: add it. Then end the meeting and show where the client will find the recordings.`,
    expert: ['Log in with the Client account', 'New meeting, AI speech translation', 'Name, date and time', 'Speaker language English; translation languages French and German', 'Tick "Automatically record this meeting when it starts"', 'Save', 'Users, Participants', 'Add participant: the Host\'s email, Next', 'Make host', 'Start meeting', 'Edit meeting: add Spanish, Update', 'Restart translation service', 'End meeting', 'Content, Recordings & transcripts', 'Download: one file per language'],
    expertSeconds: 180,
  },
};

// ------------------------------------------------------------------ the run
export function sandboxView(key, { onExit } = {}) {
  const sc = SCENARIOS[key]; if (!sc) return h('div', { class: 'page' }, h('div', { class: 'card empty' }, 'Unknown sandbox'));
  const S = { screen: 'login', menu: null, modal: null, meeting: null, form: null, picker: null, t0: Date.now(), events: [], hints: 0, flags: {}, finished: false };
  const log = (type, what, extra = {}) => S.events.push({ t: Math.round((Date.now() - S.t0) / 1000), screen: S.screen, type, what, ...extra });
  const detour = (what) => { log('detour', what); S.flags.detours = (S.flags.detours || 0) + 1; };
  const root = h('div', { class: 'sbx' });
  const app = h('div', { class: 'sbx-app' });
  const timer = h('span', { class: 'sbx-timer' }, '0:00');
  const tick = setInterval(() => { if (!document.body.contains(root)) return clearInterval(tick); const s = Math.round((Date.now() - S.t0) / 1000); timer.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }, 1000);
  const taskBox = h('div', { class: 'sbx-task' }, h('b', null, 'Your task'), h('p', null, sc.request));
  const bar = h('div', { class: 'sbx-bar' },
    h('div', { class: 'sbx-bar-l' }, h('span', { class: 'sbx-pill' }, 'Sandbox'), h('b', null, `Scenario 1 · ${sc.title}`), timer),
    h('div', { class: 'sbx-bar-r' },
      h('button', { class: 'btn sm', type: 'button', on: { click: () => { taskBox.hidden = !taskBox.hidden; } } }, 'Task'),
      h('button', { class: 'btn sm', type: 'button', on: { click: hint } }, 'Hint'),
      h('button', { class: 'btn sm primary', type: 'button', on: { click: () => finish(false) } }, 'I am done'),
      h('button', { class: 'btn sm', type: 'button', on: { click: () => { if (confirm('Leave the sandbox? This run is not saved.')) { clearInterval(tick); onExit?.(); } } } }, 'Leave')));
  root.append(bar, taskBox, h('div', { class: 'sbx-browser' }, h('div', { class: 'sbx-url' }, ic('lock', 13), h('span', { class: 'sbx-url-t' }), h('span', { class: 'sbx-note' }, 'Replica for training · test data only')), app));

  const go = (screen, what) => { S.screen = screen; S.menu = null; log('nav', what || screen); draw(); };
  const url = () => ({ login: 'live.kudoway.eu/users/sign_in', home: 'live.kudoway.eu', new: 'live.kudoway.eu/sessions/new?ai_interpretation=true', meeting: `live.kudoway.eu/sessions/800212907037`, participants: 'live.kudoway.eu/sessions/800212907037/participants', edit: 'live.kudoway.eu/sessions/800212907037/edit', recordings: 'live.kudoway.eu/sessions/800212907037/recordings' }[S.screen]);

  // ---------------------------------------------------------------- shared pieces
  const sidebar = () => h('aside', { class: 'k-side' },
    h('div', { class: 'k-newwrap' }, h('button', { class: 'k-new', type: 'button', on: { click: () => { S.menu = S.menu === 'new' ? null : 'new'; log('click', 'New meeting'); draw(); } } }, ic('plus'), ' New meeting ▾'),
      S.menu === 'new' ? h('div', { class: 'k-menu' }, h('button', { type: 'button', on: { click: () => { detour('New meeting: Human interpretation'); notYet(); S.menu = null; draw(); } } }, 'Human interpretation'), h('button', { type: 'button', on: { click: startForm } }, 'AI speech translation')) : null),
    ...[['home', 'Home'], ['meetings', 'My meetings'], ['glossaries', 'My glossaries'], ['usage', 'Usage & analytics']].map(([k, l]) => h('button', { class: `k-nav ${(k === 'home' && S.screen === 'home') || (k === 'meetings' && ['meeting', 'participants', 'edit', 'recordings'].includes(S.screen)) ? 'on' : ''}`, type: 'button', on: { click: () => {
      if (k === 'home') return go('home', 'Home');
      if (k === 'meetings' && S.meeting) return go('meeting', 'My meetings');
      detour(l); notYet();
    } } }, l)),
    h('div', { class: 'k-acct' }, h('span', { class: 'k-av' }, 'DN'), 'Demo NDK'));
  const top = () => h('header', { class: 'k-top' }, h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO', class: 'k-logo' }), h('span', { class: 'k-top-r' }, ic('help', 20), ic('bell', 20)));
  const shell = (...main) => h('div', { class: 'k-shell' }, top(), h('div', { class: 'k-body' }, sidebar(), h('main', { class: 'k-main' }, ...main)));
  // Same neutral answer for everything not rebuilt yet, so it never hints at what the task needs.
  const notYet = () => toastK('This page is not available in the sandbox yet');
  const toastK = (msg) => { const t = h('div', { class: 'k-toast' }, h('span', { class: 'k-dot' }), msg); app.append(t); setTimeout(() => t.remove(), 2600); };

  // ---------------------------------------------------------------- screens
  function loginScreen() {
    const pw = h('input', { type: 'password', value: '••••••••••', readonly: true });
    return h('div', { class: 'k-login' }, h('div', { class: 'k-login-card' },
      h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO', class: 'k-login-logo' }),
      h('div', { class: 'k-seg' }, h('span', { class: 'on' }, 'Log In'), h('span', null, 'Join a Meeting')),
      h('h3', null, 'Log into your KUDO account'),
      h('input', { type: 'email', value: 'client-demo@kudoway.com', readonly: true }), pw,
      h('label', { class: 'k-check' }, h('input', { type: 'checkbox' }), ' Remember me'),
      h('button', { class: 'k-yellow', type: 'button', on: { click: () => { go('home', 'Log in'); toastK('Logged in successfully.'); } } }, 'Log In'),
      h('p', { class: 'k-mini' }, 'Sandbox account: the Client role, filled in for you')));
  }
  function homeScreen() {
    const card = (m) => h('button', { class: 'k-mcard', type: 'button', on: { click: () => (m.mine ? go('meeting', 'Open the meeting') : (detour(`Open ${m.name}`), notYet())) } },
      h('b', null, m.name, ' ›'), h('div', null, ic('cal', 14), m.date), h('div', null, ic('clock', 14), m.time, ' CET'), h('div', null, ic('lang', 14), m.langs), h('span', { class: `k-chip ${m.status}` }, m.status.toUpperCase()));
    const meetings = [...(S.meeting ? [{ name: S.meeting.name, date: 'Thu, Nov 26, 2026', time: '14:00 – 15:00', langs: [...S.meeting.speakers, ...S.meeting.translations].join(', '), status: S.meeting.status, mine: true }] : []), { name: 'Weekly Partner Sync', date: 'Fri, Nov 27, 2026', time: '10:00 – 10:30', langs: 'English, Italian', status: 'scheduled' }];
    return shell(h('h1', { class: 'k-h1' }, 'Welcome back, Demo'), h('h3', { class: 'k-h3' }, 'Upcoming meetings'), h('div', { class: 'k-cards' }, meetings.map(card)),
      h('div', { class: 'k-grid2' }, h('div', { class: 'k-panel' }, h('h3', null, 'Usage & analytics'), h('div', { class: 'k-big' }, '412.5', h('small', null, ' / 500 available'))), h('div', { class: 'k-panel' }, h('h3', null, 'Your productivity gain'), h('div', { class: 'k-big green' }, '41.2'))));
  }
  function startForm() {
    S.menu = null; log('click', 'New meeting: AI speech translation');
    S.form = { name: '', type: 'speech', speakers: [], translations: [], detect: false, recording: true, autoRecord: false, hosts: [], external: false, recurring: false };
    go('new', 'New AI speech translation meeting');
  }
  // A language picker like KUDO's: chips plus a searchable list.
  function picker(id, list, selected, { locked = false, onChange }) {
    const open = S.picker === id;
    const input = h('input', { class: 'k-pick-in', placeholder: selected.length ? '' : 'Select an option', disabled: locked, on: { focus: () => { if (!locked) { S.picker = id; draw(); } }, input: (e) => { S.pq = e.target.value; drawList(); } } });
    const listBox = h('div', { class: 'k-pick-list' });
    const drawList = () => listBox.replaceChildren(...list.filter((l) => !selected.includes(l) && l.toLowerCase().includes((S.pq || '').toLowerCase())).map((l) => h('button', { type: 'button', on: { mousedown: (e) => { e.preventDefault(); selected.push(l); S.pq = ''; log('pick', `${id}: ${l}`); onChange?.(l); draw(); } } }, l)));
    drawList();
    const box = h('div', { class: `k-pick ${locked ? 'locked' : ''} ${open ? 'open' : ''}`, 'data-pick': id, on: { click: () => { if (locked) { log('locked', `${id} is locked`); S.flags[`locked_${id}`] = true; toastK('This setting cannot be changed once the meeting has started'); return; } if (S.picker !== id) { S.picker = id; draw(); app.querySelector(`[data-pick="${id}"] input`)?.focus(); } } } },
      h('div', { class: 'k-pick-chips' }, selected.map((l) => h('span', { class: 'k-lchip' }, locked ? null : h('button', { type: 'button', on: { click: (e) => { e.stopPropagation(); selected.splice(selected.indexOf(l), 1); log('remove', `${id}: ${l}`); draw(); } } }, '×'), l)), input), h('span', { class: 'k-caret' }, '▾'));
    return h('div', { class: 'k-pick-wrap' }, box, open && !locked ? listBox : null, selected.length && !locked ? h('button', { class: 'k-link small', type: 'button', on: { click: () => { selected.length = 0; draw(); } } }, 'Clear all languages') : null);
  }
  function formScreen(editing) {
    const f = S.form, live = editing && S.meeting.status === 'live';
    const warn = (t) => h('div', { class: 'k-warn' }, ic('warn', 13), t);
    const row = (label, ...body) => h('div', { class: 'k-frow' }, h('div', { class: 'k-flabel' }, label), h('div', { class: 'k-fbody' }, ...body));
    const toggle = (on, label, fn, disabled) => h('label', { class: `k-toggle ${on ? 'on' : ''} ${disabled ? 'off' : ''}` }, h('input', { type: 'checkbox', checked: on, disabled, on: { change: (e) => fn(e.target.checked) } }), h('span', { class: 'k-sw' }), label ? h('span', null, label) : null);
    const name = h('input', { class: 'k-in', value: f.name, placeholder: 'Enter your meeting title', on: { input: (e) => { f.name = e.target.value; }, change: (e) => log('input', `Meeting name: ${e.target.value}`) } });
    const hostEmail = h('input', { class: 'k-in', placeholder: 'Host email' });
    const form = h('div', { class: 'k-form' }, h('h2', null, editing ? 'Edit a meeting' : 'AI speech translation meeting'),
      row('Meeting name *', name, h('div', { class: 'k-mini' }, h('span', { class: 'k-link' }, 'Add description'))),
      row('Date/time *', h('div', { class: 'k-dt' }, h('div', null, h('small', null, 'Start date/time'), h('span', { class: 'k-in fake' }, ic('cal', 14), 'Thu, 26 Nov 2026'), h('span', { class: 'k-in fake' }, ic('clock', 14), '2:00 PM')), h('div', null, h('small', null, 'End date/time'), h('span', { class: 'k-in fake' }, ic('cal', 14), 'Thu, 26 Nov 2026'), h('span', { class: 'k-in fake' }, ic('clock', 14), '3:00 PM'))),
        h('div', { class: 'k-mini' }, h('span', { class: 'k-link' }, 'Change time zone (CET)'), '   ', h('label', null, h('input', { type: 'checkbox', on: { change: (e) => log('toggle', `Force close meeting: ${e.target.checked}`) } }), ' Force close meeting'))),
      editing ? null : row('Recurring meeting', toggle(f.recurring, null, (v) => { f.recurring = v; log('toggle', `Recurring: ${v}`); draw(); })),
      warn('This setting cannot be changed once the meeting has been created'),
      row('Translation type', ...[['speech', 'AI speech & captions', 'Offer multilingual audio, captions, recording, transcriptions, and AI customization for greater accuracy.'], ['captions', 'AI captions only', 'Supports multilingual closed captioning only, with enhanced display speed. This mode does not support AI customization features.']].map(([k, t, d]) =>
        h('label', { class: `k-type ${f.type === k ? 'on' : ''} ${editing ? 'dis' : ''}` }, h('input', { type: 'radio', name: 'ttype', checked: f.type === k, disabled: editing, on: { change: () => { f.type = k; log('choose', `Translation type: ${t}`); draw(); } } }), h('span', { class: 'k-type-ic' }, ic(k === 'speech' ? 'speaker' : 'cc', 22)), h('span', null, h('b', null, t), h('small', null, d))))),
      row('Languages', h('small', null, 'Speaker language(s)'), picker('Speaker language', SPEAKER, f.speakers, { locked: live, onChange: (l) => { if (l === 'English' && !f.translations.includes('English (US)')) f.translations.unshift('English (US)'); } }),
        toggle(f.detect, 'Detect language automatically', (v) => { f.detect = v; log('toggle', `Detect language automatically: ${v}`); draw(); }, live), h('small', null, 'Translation language(s)'), picker('Translation language', TRANSLATION, f.translations, { onChange: (l) => { if (live) { S.flags.addedLive = S.flags.addedLive || []; S.flags.addedLive.push(l); } } })),
      warn('This setting cannot be changed once the meeting has been created'),
      row('External meeting: Using KUDO on another platform?', toggle(f.external, null, (v) => { f.external = v; log('toggle', `External meeting: ${v}`); if (v) detour('External meeting switched on'); draw(); }, editing)),
      editing ? null : row('Host', h('span', { class: 'k-mini' }, 'Optional · Max. 2 hosts per meeting'), ...f.hosts.map((x) => h('div', { class: 'k-hostrow' }, ic('user', 14), x)),
        S.addHost ? h('div', { class: 'k-inline' }, hostEmail, h('button', { class: 'k-btn', type: 'button', on: { click: () => { const v = hostEmail.value.trim().toLowerCase(); if (!v) return; f.hosts.push(v); S.addHost = false; log('input', `Host added in the form: ${v}`); draw(); } } }, 'Add')) : h('button', { class: 'k-link', type: 'button', on: { click: () => { S.addHost = true; log('click', '+ Add host'); draw(); } } }, '+ Add host')),
      warn('This setting cannot be changed once the meeting starts'),
      row('Recording and transcript', toggle(f.recording, null, (v) => { f.recording = v; log('toggle', `Recording and transcript: ${v}`); draw(); }, live),
        h('label', { class: 'k-check' }, h('input', { type: 'checkbox', checked: f.autoRecord, disabled: live || !f.recording, on: { change: (e) => { f.autoRecord = e.target.checked; log('toggle', `Automatically record: ${e.target.checked}`); } } }), ' Automatically record this meeting when it starts')),
      h('div', { class: 'k-formfoot' }, h('button', { class: 'k-link', type: 'button', on: { click: () => { detour('Advanced settings'); notYet(); } } }, 'Advanced settings ▾'),
        h('div', { class: 'k-row' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { log('click', 'Cancel'); go(editing ? 'meeting' : 'home', 'Cancel'); } } }, 'Cancel'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => (editing ? update() : save()) } }, editing ? 'Update' : 'Save'))));
    return shell(form);
  }
  function save() {
    const f = S.form;
    if (!f.name.trim()) return toastK('Meeting name is required');
    if (!f.speakers.length || !f.translations.length) return toastK('Choose the speaker and translation languages');
    S.meeting = { name: f.name.trim(), type: f.type, speakers: [...f.speakers], translations: [...f.translations], recording: f.recording, autoRecord: f.autoRecord, external: f.external,
      participants: f.hosts.map((e) => ({ email: e, name: e.split('@')[0], role: 'Host', via: 'form' })), status: 'scheduled' };
    log('save', 'Save: meeting created', { meeting: { ...S.meeting, participants: undefined } });
    go('meeting', 'Meeting created'); toastK('Meeting scheduled successfully');
  }
  function update() {
    const f = S.form, m = S.meeting;
    const added = f.translations.filter((l) => !m.translations.includes(l)), removed = m.translations.filter((l) => !f.translations.includes(l));
    m.translations = [...f.translations]; m.name = f.name.trim() || m.name;
    if (m.status !== 'live') { m.speakers = [...f.speakers]; m.autoRecord = f.autoRecord; m.recording = f.recording; }
    if (added.length && m.status === 'live') { m.pendingRestart = true; S.flags.liveAdded = [...(S.flags.liveAdded || []), ...added]; }
    if (added.length && m.status === 'scheduled') S.flags.addedBeforeStart = [...(S.flags.addedBeforeStart || []), ...added];
    if (removed.length) S.flags.removed = [...(S.flags.removed || []), ...removed];
    log('save', `Update: ${added.length ? `added ${added.join(', ')}` : 'no new language'}${removed.length ? `, removed ${removed.join(', ')}` : ''}`);
    go('meeting', 'Meeting updated'); toastK('Meeting updated successfully');
  }
  const tabs = () => {
    const m = S.meeting;
    const menu = (k, label, items) => h('span', { class: 'k-tabw' }, h('button', { class: `k-tab ${S.tab === k ? 'on' : ''}`, type: 'button', on: { click: () => { S.menu = S.menu === k ? null : k; log('click', `${label} menu`); draw(); } } }, `${label} ▾`),
      S.menu === k ? h('div', { class: 'k-menu' }, items.map(([l, fn]) => h('button', { type: 'button', on: { click: fn } }, l))) : null);
    const off = (l) => () => { detour(l); S.menu = null; draw(); notYet(); };
    return h('div', { class: 'k-mhead' }, h('div', { class: 'k-mtitle' }, h('h2', null, m.name), h('span', { class: `k-chip ${m.status}` }, m.status.toUpperCase())),
      h('nav', { class: 'k-tabs' }, h('button', { class: `k-tab ${S.screen === 'meeting' ? 'on' : ''}`, type: 'button', on: { click: () => go('meeting', 'Overview') } }, 'Overview'),
        menu('users', 'Users', [['All users', off('Users: All users')], ['Participants', () => go('participants', 'Users: Participants')], ['Operators', off('Users: Operators')], ['Viewers', off('Users: Viewers')]]),
        menu('content', 'Content', [['Polls', off('Content: Polls')], ['Files', off('Content: Files')], ['Messages', off('Content: Messages')], ['Recordings & transcripts', () => go('recordings', 'Content: Recordings & transcripts')]]),
        menu('settings', 'Settings', [['Meeting settings', off('Settings')]]),
        h('button', { class: 'k-tab', type: 'button', on: { click: off('My glossaries') } }, 'My glossaries'),
        m.status === 'finished' ? h('button', { class: 'k-tab', type: 'button', on: { click: off('Meeting statistics') } }, 'Meeting statistics') : null));
  };
  const links = () => (S.meeting.status === 'finished' ? h('aside', { class: 'k-links' }, h('p', { class: 'k-mini' }, 'The meeting is finished. The invite links are not available.'))
    : h('aside', { class: 'k-links' }, h('h4', null, ic('link'), ' KUDO meeting links ', h('small', null, 'Copy all links')),
      ...['Participant/Speaker', 'Operator', 'Viewer-Only'].map((l) => h('div', { class: 'k-lbox' }, h('b', null, l), h('button', { class: 'k-copy', type: 'button', on: { click: () => { detour(`Copied the ${l} link`); toastK('Link copied'); } } }, 'https://live.kudoway.eu/k8/2402…'))),
      h('h4', null, 'KUDO language access'), h('div', { class: 'k-lbox' }, h('b', null, 'iframe widget'), h('span', { class: 'k-copy' }, '<iframe name="KUDO Widget"…')), h('div', { class: 'k-lbox' }, h('b', null, 'Mobile Link'), h('span', { class: 'k-copy' }, 'https://audio-widget.kudoway.com/7702…'))));
  function meetingScreen() {
    const m = S.meeting;
    const iconBtn = (ic, tip, fn, cls = '') => h('button', { class: `k-ic ${cls}`, type: 'button', title: tip, 'aria-label': tip, on: { click: fn } }, ic);
    const actions = m.status === 'scheduled' ? [iconBtn(ic('play'), 'Start meeting', () => { m.status = 'live'; S.flags.started = true; log('click', 'Start meeting'); toastK('Meeting has been started'); draw(); }, 'go'), iconBtn(ic('edit'), 'Edit meeting', editForm), iconBtn(ic('x'), 'Cancel meeting', () => { log('trap', 'Cancel meeting clicked'); S.flags.cancelTried = true; if (confirm('Cancel this meeting? Its links stop working.')) { log('trap', 'Meeting cancelled'); S.flags.cancelled = true; m.status = 'finished'; } draw(); }, 'stop')]
      : m.status === 'live' ? [iconBtn(ic('restart'), 'Restart translation service', () => { log('click', 'Restart translation service'); if (m.pendingRestart) { m.pendingRestart = false; S.flags.restarted = true; } else S.flags.restartNoChange = (S.flags.restartNoChange || 0) + 1; toastK('Translation service restart in progress. Service should resume shortly'); draw(); }), iconBtn(ic('edit'), 'Edit meeting', editForm), iconBtn(ic('stop'), 'End meeting', () => { log('click', 'End meeting'); if (!confirm('End the meeting for everyone? An AI meeting cannot be restarted.')) return; m.status = 'finished'; S.flags.ended = true; S.flags.endedBeforeSpanish = !(S.flags.liveAdded || []).some(es); toastK('Meeting has been stopped'); draw(); }, 'stop')]
        : [iconBtn(ic('edit'), 'Edit meeting', () => { detour('Edit a finished meeting'); toastK('The meeting is finished'); })];
    return shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' }, h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Overview'), h('div', { class: 'k-acts' }, ...actions)),
      h('div', { class: 'k-def' }, h('span', null, 'Date/time'), h('div', null, h('b', null, 'Thursday, Nov 26, 2026'), '  14:00 – 15:00', h('small', null, 'Brussels (UTC +01:00)'))),
      h('div', { class: 'k-def' }, h('span', null, 'Translation type'), h('div', { class: 'k-typebox' }, m.type === 'speech' ? 'AI speech and captions' : 'AI captions only')),
      h('div', { class: 'k-def' }, h('span', null, 'Languages'), h('div', null, h('small', null, 'Speaker languages'), h('div', null, m.speakers.map((l) => h('span', { class: 'k-lchip' }, l))), h('small', null, 'Translation languages'), h('div', null, m.translations.map((l) => h('span', { class: 'k-lchip' }, l))))),
      h('div', { class: 'k-cardf' }, h('button', { class: 'k-link', type: 'button', on: { click: () => { detour('Advanced settings (overview)'); notYet(); } } }, 'Advanced settings ▾'), h('span', { class: 'k-mini' }, 'Support ID: 800 212 907 037'))), links()));
  }
  function editForm() {
    const m = S.meeting; log('click', 'Edit meeting');
    if (m.status === 'finished') return;
    S.form = { name: m.name, type: m.type, speakers: [...m.speakers], translations: [...m.translations], detect: false, recording: m.recording, autoRecord: m.autoRecord, hosts: [], external: m.external };
    go('edit', 'Edit meeting');
  }
  function participantsScreen() {
    const m = S.meeting; const email = h('input', { class: 'k-in', placeholder: 'Email', type: 'email' });
    const rows = m.participants.map((p) => h('tr', null, h('td', null, h('input', { type: 'checkbox' })), h('td', null, p.name), h('td', null, p.email), h('td', null, p.role === 'Host' ? h('span', null, 'Participant ', h('span', { class: 'k-chip host' }, 'HOST')) : 'Participant'), h('td', null, 'Invited | ', h('span', { class: 'k-link' }, 'Resend')),
      h('td', { class: 'k-acts' }, p.role === 'Host' ? null : h('button', { class: 'k-ic go', type: 'button', title: 'Make Host', 'aria-label': 'Make Host', on: { click: () => { p.role = 'Host'; log('click', `Make host: ${p.email}`); toastK('New Host appointed successfully'); draw(); } } }, ic('user')),
        h('button', { class: 'k-ic', type: 'button', title: 'Edit', on: { click: () => detour('Edit participant') } }, ic('edit')),
        h('button', { class: 'k-ic stop', type: 'button', title: 'Delete', on: { click: () => { log('trap', `Deleted participant ${p.email}`); m.participants.splice(m.participants.indexOf(p), 1); draw(); } } }, ic('trash')))));
    return shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' },
      h('div', { class: 'k-cardh' }, h('b', null, ic('users'), ' Users  ', h('span', { class: 'k-mini' }, 'Participants ▾')), h('div', { class: 'k-row' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { S.modal = 'add'; log('click', '+ Add participant'); draw(); } } }, '+ Add participant'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => detour('Import participants') } }, 'Import participants'))),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['', 'Name', 'Email', 'Role', 'Status', ''].map((x) => h('th', null, x)))), h('tbody', null, rows.length ? rows : h('tr', null, h('td', { colspan: 6, class: 'k-empty' }, "No participant added to this meeting. To add participant click on the '+ Add Participant' button above."))))), links()),
      S.modal === 'add' ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal' }, h('div', { class: 'k-modal-h' }, h('b', null, 'Add participant'), h('button', { type: 'button', on: { click: () => { S.modal = null; draw(); } } }, '×')),
        h('div', { class: 'k-frow' }, h('div', { class: 'k-flabel' }, 'Email'), email),
        h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { S.modal = null; draw(); } } }, 'Close'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => { const v = email.value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toastK('Enter a valid email'); m.participants.push({ email: v, name: v === HOST ? 'Host Client Demo' : v.split('@')[0], role: 'Participant', via: 'participants' }); log('input', `Participant added: ${v}`); S.modal = null; toastK('Participant added successfully'); draw(); } } }, 'Next')))) : null);
  }
  function recordingsScreen() {
    const m = S.meeting; const done = m.status === 'finished' && m.recording && m.autoRecord && !S.flags.cancelled;
    const files = done ? ['Original Audio', ...m.translations] : [];
    return shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' }, h('b', null, ic('doc'), ' Recordings & Transcripts'),
      h('p', { class: 'k-mini' }, 'If you choose to record your meeting, your recording and transcripts will be stored in the KUDO cloud for 30 days before being automatically deleted.'),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['ID', 'Meeting Title', 'Start Date and Time', 'End Date and Time', 'Time Zone', 'Action'].map((x) => h('th', null, x)))),
        h('tbody', null, done ? h('tr', null, h('td', null, '1'), h('td', null, m.name), h('td', null, '26 November 2026 02:00 PM'), h('td', null, '26 November 2026 03:00 PM'), h('td', null, 'Europe/Brussels'), h('td', null, h('button', { class: 'k-ic go', type: 'button', title: 'Download', on: { click: () => { S.modal = 'dl'; S.flags.foundRecording = true; log('click', 'Download recordings'); draw(); } } }, ic('dl'))))
          : h('tr', null, h('td', { colspan: 6, class: 'k-empty' }, m.status !== 'finished' ? 'No recordings available of this meeting.' : !m.autoRecord || !m.recording ? 'No recordings available of this meeting. Recording was not switched on.' : 'No recordings available of this meeting.')))),
      done ? h('p', { class: 'k-mini' }, 'Sandbox time is fast-forwarded: in reality recordings appear 15 to 20 minutes after the meeting ends.') : null), links()),
    S.modal === 'dl' ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal' }, h('div', { class: 'k-modal-h' }, h('b', null, 'Download Recordings & Transcripts'), h('button', { type: 'button', on: { click: () => { S.modal = null; draw(); } } }, '×')),
      h('p', { class: 'k-mini' }, 'For videos with captioning we recommend to use VLC media player'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => log('click', 'Download all (zip)') } }, ic('dl'), ' Download Recordings & Transcripts'),
      h('table', { class: 'k-tbl' }, h('tbody', null, files.map((l) => h('tr', null, h('td', null, h('b', null, l)), h('td', null, '1.2 MB'), h('td', { class: 'k-acts' }, h('span', { class: 'k-ic go' }, ic('play', 14)), h('span', { class: 'k-ic go' }, ic('dl', 14)), h('span', { class: 'k-ic go' }, ic('dl', 14))))))))) : null);
  }

  // ---------------------------------------------------------------- hints, scoring, report
  function nextStep() {
    const m = S.meeting, host = m?.participants.find((p) => p.email === HOST && p.role === 'Host');
    if (S.screen === 'login') return 'Log in: the account is filled in for you.';
    if (!m) return 'Create the meeting: New meeting, then AI speech translation.';
    if (!host) return m.participants.some((p) => p.email === HOST) ? 'The person is a participant, not the Host yet: Users, Participants, then Make Host on their row.' : 'Add the Host: Users, Participants, + Add participant.';
    if (!m.autoRecord) return 'The meeting must record itself: Edit meeting, Recording and transcript, tick "Automatically record this meeting when it starts". Do it before you start.';
    if (m.status === 'scheduled') return 'Start the meeting from the Overview.';
    if (m.status === 'live' && !(S.flags.liveAdded || []).some(es)) return 'Add Spanish while it is live: Edit meeting, translation languages, Update.';
    if (m.status === 'live' && m.pendingRestart) return 'The new language needs the translation service restarted: the circular arrow on the Overview.';
    if (m.status === 'live') return 'End the meeting from the Overview.';
    if (!S.flags.foundRecording) return 'Find the recordings: Content, Recordings & transcripts, then Download.';
    return 'All done: click "I am done".';
  }
  function hint() { S.hints++; log('hint', nextStep()); toast(nextStep()); }

  function score() {
    const m = S.meeting || { participants: [], translations: [], speakers: [] }, F = S.flags;
    const host = m.participants.find((p) => p.email === HOST && p.role === 'Host');
    const extra = m.translations.filter((l) => !['English (US)', 'English (UK)'].includes(l) && !fr(l) && !de(l) && !es(l));
    const checks = [
      ['AI speech & captions meeting created', !!S.meeting && m.type === 'speech', 8],
      [`Named "${NAME}"`, !!S.meeting && m.name.toLowerCase().includes('quarterly partner update'), 4],
      ['English as the only speaker language', m.speakers.length === 1 && m.speakers[0] === 'English', 8],
      ['French and German as translation languages, nothing extra', m.translations.some(fr) && m.translations.some(de) && !extra.length, 8],
      ['Automatic recording on before the start', !!m.autoRecord && !!m.recording, 10],
      [`${HOST} is the Host`, !!host, 10],
      ['Meeting started', !!F.started && !F.cancelled, 6],
      ['Spanish added while live', (F.liveAdded || []).some(es), 12],
      ['Translation service restarted after adding Spanish', !!F.restarted, 12],
      ['Meeting ended after Spanish was added', !!F.ended && !F.endedBeforeSpanish, 6],
      ['Recordings found in Content, Recordings & transcripts', !!F.foundRecording, 16],
    ];
    const outcome = Math.round(checks.reduce((t, c) => t + (c[1] ? c[2] : 0), 0));
    const traps = [];
    if (F.endedBeforeSpanish && F.ended) traps.push(['Ended the meeting before adding Spanish: an AI meeting cannot be restarted', 10]);
    if (F.cancelled) traps.push(['Cancelled the meeting', 10]);
    if ((F.addedBeforeStart || []).some(es)) traps.push(['Added Spanish before the start, not while live', 4]);
    if (F.locked_Speaker_language || F['locked_Speaker language']) traps.push(['Tried to change the speaker language while live (locked)', 3]);
    if ((F.removed || []).length) traps.push([`Removed a language (${F.removed.join(', ')})`, 4]);
    if (F.restartNoChange) traps.push(['Restarted the translation service with nothing to apply', 2]);
    const detours = S.events.filter((e) => e.type === 'detour').length;
    const path = Math.max(0, 100 - detours * 6 - traps.reduce((t, x) => t + x[1], 0) * 3 - S.hints * 8);
    const secs = Math.round((Date.now() - S.t0) / 1000);
    const time = secs <= 300 ? 100 : secs >= 720 ? 0 : Math.round(100 - ((secs - 300) / 420) * 100);
    const total = Math.round(outcome * 0.7 + path * 0.2 + time * 0.1);
    return { total, outcome, path, time, secs, checks: checks.map(([label, ok, w]) => ({ label, ok, w })), traps: traps.map(([label]) => label), detours, hints: S.hints, actions: S.events.filter((e) => ['click', 'pick', 'input', 'toggle', 'choose', 'save', 'remove'].includes(e.type)).length };
  }
  async function finish() {
    if (S.finished) return;
    if (!confirm('Finish and see your result?')) return;
    S.finished = true; clearInterval(tick);
    const r = score();
    let saved = null;
    try { saved = await api('POST', `/api/me/sandbox/${key}`, { result: r, events: S.events }); } catch (e) { toast(`Your run could not be saved: ${e.message}`, true); }
    root.replaceChildren(report(sc, r, S.events, saved, onExit));
  }

  function draw() {
    root.querySelector('.sbx-url-t').textContent = url();
    const view = { login: loginScreen, home: homeScreen, new: () => formScreen(false), edit: () => formScreen(true), meeting: meetingScreen, participants: participantsScreen, recordings: recordingsScreen }[S.screen]();
    app.replaceChildren(view);
  }
  app.addEventListener('click', (e) => { if (S.picker && !e.target.closest('.k-pick-wrap')) { S.picker = null; draw(); } if (S.menu && !e.target.closest('.k-tabw, .k-newwrap')) { S.menu = null; draw(); } });
  log('start', 'Sandbox opened');
  draw();
  return root;
}

// ------------------------------------------------------------------ the result
const fmtS = (s) => `${Math.floor(s / 60)} min ${String(s % 60).padStart(2, '0')} s`;
export function report(sc, r, events, saved, onExit) {
  const bar = (label, v, note) => h('div', { class: 'sbx-sc' }, h('div', { class: 'row spread' }, h('b', null, label), h('span', null, `${v}%`)), h('i', { class: 'ph-bar' }, h('i', { style: `width:${v}%` })), h('span', { class: 'muted small' }, note));
  const steps = events.filter((e) => !['start'].includes(e.type));
  return h('div', { class: 'page sbx-report' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, `Your result: ${r.total}%`), h('p', null, `${sc.title}. ${r.total >= 80 ? 'Passed.' : 'Below the pass mark of 80%.'} ${saved?.record ? 'This first run is your result of record.' : saved ? 'This run is practice: your first run stays your result of record.' : ''}`)),
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', on: { click: () => onExit?.(true) } }, 'Try again'), h('a', { class: 'btn primary', href: `#module-${sc.module}` }, 'Back to the lesson'))),
    h('div', { class: 'grid g3' },
      bar('Outcome · 70%', r.outcome, 'Did the meeting end up in the right state'),
      bar('Path · 20%', r.path, `${r.detours} detour${r.detours === 1 ? '' : 's'}, ${r.traps.length} mistake${r.traps.length === 1 ? '' : 's'}, ${r.hints} hint${r.hints === 1 ? '' : 's'}`),
      bar('Time · 10%', r.time, `${fmtS(r.secs)}, full marks up to 5 min`)),
    h('div', { class: 'grid g2', style: 'margin-top:16px' },
      h('div', { class: 'card' }, h('h2', null, 'What you achieved'), h('ul', { class: 'sbx-checks' }, r.checks.map((c) => h('li', { class: c.ok ? 'yes' : 'no' }, h('span', null, c.ok ? '✓' : '✗'), c.label))),
        r.traps.length ? h('div', { class: 'sbx-traps' }, h('b', null, 'Mistakes'), h('ul', null, r.traps.map((t) => h('li', null, t)))) : null),
      h('div', { class: 'card' }, h('h2', null, 'The expert\'s path'), h('p', { class: 'sub' }, `About ${Math.round(sc.expertSeconds / 60)} minutes, ${sc.expert.length} steps. You took ${r.actions} actions`), h('ol', { class: 'sbx-expert' }, sc.expert.map((s) => h('li', null, s))))),
    h('div', { class: 'card', style: 'margin-top:16px' }, h('h2', null, 'Your path, step by step'), h('p', { class: 'sub' }, 'Detours and mistakes are marked'),
      h('ol', { class: 'sbx-path' }, steps.map((e) => h('li', { class: e.type }, h('span', { class: 'muted small' }, `${Math.floor(e.t / 60)}:${String(e.t % 60).padStart(2, '0')}`), h('span', null, e.what), e.type === 'detour' ? h('span', { class: 'chip amber' }, 'Detour') : e.type === 'trap' ? h('span', { class: 'chip coral' }, 'Mistake') : e.type === 'hint' ? h('span', { class: 'chip grey' }, 'Hint') : null)))));
}
