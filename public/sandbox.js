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
const SIGN = ['American Sign Language', 'British Sign Language', 'French Sign Language', 'International Sign', 'German Sign Language'];
const HOST = 'host@client-demo.com';
const NAME = 'Quarterly Partner Update';
const fr = (l) => /^French/.test(l), de = (l) => l === 'German', es = (l) => /^Spanish/.test(l);

export const SCENARIOS = {
  'platform-1': {
    module: 'platform', title: 'Run a meeting, add a language live, find the recording',
    request: `A client runs "${NAME}" with AI Translation. Create the meeting with English as the speaker language and French and German as translation languages. Add the Host (${HOST}) and make sure the meeting is recorded. Start it. While it is live, the client asks for Spanish: add it. Then end the meeting and show where the client will find the recordings.`,
    expert: ['Log in with the Client account', 'New meeting, AI speech translation', 'Name, date and time', 'Speaker language English; translation languages French and German', 'Tick "Automatically record this meeting when it starts"', 'Save', 'Users, Participants', 'Add participant: the Host\'s email, Next', 'Make host', 'Start meeting', 'Edit meeting: add Spanish, Update', 'Restart translation service', 'End meeting', 'Content, Recordings & transcripts', 'Download: one file per language'],
    expertSeconds: 180,
    // Screens the task needs. Anything else is fully built but logged as a detour.
    screens: ['login', 'home', 'meetings', 'new-ai', 'meeting', 'participants', 'users', 'edit', 'recordings'],
  },
};

// ------------------------------------------------------------------ the run

export function sandboxView(key, { onExit } = {}) {
  const sc = SCENARIOS[key]; if (!sc) return h('div', { class: 'page' }, h('div', { class: 'card empty' }, 'Unknown sandbox'));
  // Everything a trainee can see in the replica. Screens the scenario does not need are fully built too, so the
  // replica never hints at the path; entering one is logged silently as a detour and shows only in the report.
  const S = { screen: 'login', menu: null, modal: null, meeting: null, form: null, picker: null, t0: Date.now(), events: [], hints: 0, flags: {}, finished: false,
    glossaries: [['Default Glossary', 120, 14, 0, 0, 106, 0], ['Acme Launch', 64, 20, 10, 2, 30, 2], ['Board Meetings', 41, 12, 0, 4, 25, 0], ['Product Names', 88, 30, 8, 0, 50, 0], ['Medical Terms', 37, 37, 0, 0, 0, 0]].map(([name, terms, rec, tr, block, dnt, rep], i) => ({ name, terms, rec, tr, block, dnt, rep, def: i === 0 })) };
  const RELEVANT = new Set(sc.screens || []);
  // Flags score the trainee's own meeting only; actions on the sample meetings go to a scratch object.
  const F = () => (S.meeting && S.meeting === S.mine ? S.flags : (S.scratch = S.scratch || {}));
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
      h('button', { class: 'btn sm primary', type: 'button', on: { click: () => finish() } }, 'I am done'),
      h('button', { class: 'btn sm', type: 'button', on: { click: () => { if (confirm('Leave the sandbox? This run is not saved.')) { clearInterval(tick); onExit?.(); } } } }, 'Leave')));
  root.append(bar, taskBox, h('div', { class: 'sbx-browser' }, h('div', { class: 'sbx-url' }, ic('lock', 13), h('span', { class: 'sbx-url-t' }), h('span', { class: 'sbx-note' }, 'Replica for training · test data only')), app));

  // Navigation. Entering a screen the scenario does not need is a detour (silent).
  const go = (screen, what, extra = {}) => {
    S.screen = screen; S.menu = null; S.modal = null; S.picker = null; Object.assign(S, extra);
    log('nav', what || screen);
    if (!RELEVANT.has(screen)) detour(what || screen);
    draw(); app.scrollTop = 0; app.querySelector('.k-main')?.scrollTo?.(0, 0);
  };
  const URL = { login: 'users/sign_in', home: '', meetings: 'sessions', glossaries: 'glossaries', usage: 'usage', 'new-ai': 'sessions/new?ai_interpretation=true', 'new-hi': 'sessions/new', meeting: 'sessions/800212907037', users: 'sessions/800212907037/users', participants: 'sessions/800212907037/participants', operators: 'sessions/800212907037/operators', viewers: 'sessions/800212907037/viewers', edit: 'sessions/800212907037/edit', polls: 'sessions/800212907037/polls', 'poll-new': 'sessions/800212907037/polls/new', poll: 'sessions/800212907037/polls/2', files: 'sessions/800212907037/documents', messages: 'sessions/800212907037/messages', recordings: 'sessions/800212907037/recordings', av: 'sessions/800212907037/configurations', features: 'sessions/800212907037/security', mglossaries: 'sessions/800212907037/meeting_glossaries', stats: 'sessions/800212907037/report', broadcast: 'sessions/800212907037/broadcasts', interpreters: 'sessions/800212907037/interpreters' };
  const url = () => `live.kudoway.eu/${URL[S.screen] ?? ''}`;

  // ---------------------------------------------------------------- shared pieces
  const toastK = (msg) => { const t = h('div', { class: 'k-toast' }, h('span', { class: 'k-dot' }), msg); app.append(t); setTimeout(() => t.remove(), 2600); };
  const toggle = (on, label, fn, disabled) => h('label', { class: `k-toggle ${on ? 'on' : ''} ${disabled ? 'off' : ''}` }, h('input', { type: 'checkbox', checked: on, disabled, on: { change: (e) => fn(e.target.checked) } }), h('span', { class: 'k-sw' }), label ? h('span', null, label) : null);
  const radio = (name, opts, val, fn, disabled) => h('div', { class: 'k-radios' }, opts.map(([v, l, note]) => h('label', { class: 'k-check' }, h('input', { type: 'radio', name, checked: val === v, disabled, on: { change: () => fn(v) } }), ' ', l, note ? h('small', { class: 'k-mini' }, ` ${note}`) : null)));
  const check = (on, label, fn, disabled) => h('label', { class: 'k-check' }, h('input', { type: 'checkbox', checked: on, disabled, on: { change: (e) => fn(e.target.checked) } }), ' ', label);
  const select = (opts, val, fn, cls = '') => h('select', { class: `k-in k-sel ${cls}`, on: { change: (e) => fn(e.target.value) } }, opts.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return h('option', { value: v, selected: String(v) === String(val) }, l); }));
  const warn = (t) => h('div', { class: 'k-warn' }, ic('warn', 13), t);
  const row = (label, ...body) => h('div', { class: 'k-frow' }, h('div', { class: 'k-flabel' }, label), h('div', { class: 'k-fbody' }, ...body));
  const set = (obj, k, label) => (v) => { obj[k] = v; log('change', `${label}: ${v}`); draw(); };
  const pager = (n) => h('div', { class: 'k-pager' }, h('span', { class: 'k-mini' }, `Showing ${n ? 1 : 0} to ${n} of ${n} entries`), h('span', { class: 'k-mini' }, '‹  1  ›   10 per page ▾'));

  const sidebar = () => h('aside', { class: 'k-side' },
    h('div', { class: 'k-newwrap' }, h('button', { class: 'k-new', type: 'button', on: { click: () => { S.menu = S.menu === 'new' ? null : 'new'; log('click', 'New meeting'); draw(); } } }, ic('plus'), ' New meeting ▾'),
      S.menu === 'new' ? h('div', { class: 'k-menu' }, h('button', { type: 'button', on: { click: () => startForm('hi') } }, 'Human interpretation'), h('button', { type: 'button', on: { click: () => startForm('ai') } }, 'AI speech translation')) : null),
    ...[['home', 'Home'], ['meetings', 'My meetings'], ['glossaries', 'My glossaries', 'New'], ['usage', 'Usage & analytics']].map(([k, l, badge]) => h('button', { class: `k-nav ${S.screen === k || (k === 'meetings' && S.meeting && !['home', 'glossaries', 'usage', 'login', 'new-ai', 'new-hi'].includes(S.screen)) ? 'on' : ''}`, type: 'button', on: { click: () => go(k, l) } }, l, badge ? h('span', { class: 'k-badge' }, badge) : null)),
    h('div', { class: 'k-acct' }, h('span', { class: 'k-av' }, 'DN'), 'Demo NDK ▾'));
  const top = () => h('header', { class: 'k-top' }, h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO', class: 'k-logo' }), h('span', { class: 'k-top-r' }, ic('help', 20), ic('bell', 20)));
  const shell = (...main) => h('div', { class: 'k-shell' }, top(), h('div', { class: 'k-body' }, sidebar(), h('main', { class: 'k-main' }, ...main)));

  // ---------------------------------------------------------------- account-level screens
  function loginScreen() {
    return h('div', { class: 'k-login' }, h('div', { class: 'k-login-card' },
      h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO', class: 'k-login-logo' }),
      h('div', { class: 'k-seg' }, h('span', { class: 'on' }, 'Log In'), h('span', null, 'Join a Meeting')),
      h('h3', null, 'Log into your KUDO account'),
      h('input', { type: 'email', value: 'client-demo@kudoway.com', readonly: true }), h('input', { type: 'password', value: '••••••••••', readonly: true }),
      h('label', { class: 'k-check' }, h('input', { type: 'checkbox' }), ' Remember me'),
      h('button', { class: 'k-yellow', type: 'button', on: { click: () => { go('home', 'Log in'); toastK('Logged in successfully.'); } } }, 'Log In'),
      h('p', { class: 'k-mini' }, 'Sandbox account: the Client role, filled in for you')));
  }
  const baseMeeting = (o) => ({ kind: 'ai', type: 'speech', speakers: ['English'], translations: [], sign: [], recording: true, autoRecord: true, external: false, adv: advDefaults(), prep: '0 minutes', aiAssist: false,
    participants: [{ email: 'speaker@client-demo.com', name: 'Speaker Demo', role: 'Host' }], operators: [], viewers: [], polls: [], files: [], glossary: null,
    av: { res: 'Auto (adaptive)', fps: 'Auto (adaptive)', bitrate: 'Auto (adaptive)', stereo: false, level: 50, processing: true },
    features: { lobby: false, lobbyP: false, lobbyV: false, users: true, docs: true, msg: true, polls: true, request: false, share: true }, ...o });
  // Other meetings in the demo account, with generic names. Opening one is a detour; nothing done there counts.
  const samples = () => (S.samples = S.samples || [
    ['Weekly Partner Sync', 'Fri, Nov 27, 2026', '10:00 - 10:30', '30 minutes', ['English'], ['Italian'], 'ai', 'scheduled'],
    ['Customer Advisory Board', 'Fri, Nov 20, 2026', '14:08 - 15:08', '1 hour', ['Chinese', 'English', 'French'], ['English (US)', 'French (France)', 'German', 'Spanish (Spain)', 'Japanese'], 'ai', 'finished'],
    ['Q3 Board Review', 'Mon, Nov 16, 2026', '15:34 - 18:34', '3 hours', ['English', 'French', 'Spanish'], ['English (US)', 'French (France)', 'Spanish (Spain)'], 'ai', 'finished'],
    ['Partner Webinar', 'Fri, Oct 30, 2026', '10:15 - 12:15', '2 hours', ['English'], ['English (UK)'], 'captions', 'finished'],
    ['Medical Symposium', 'Thu, Oct 15, 2026', '07:00 - 11:55', '4 hours 55 minutes', ['Chinese', 'English', 'French', 'German'], [], 'hi', 'finished'],
    ['Multilingual Town Hall', 'Wed, Oct 14, 2026', '17:00 - 18:00', '1 hour', ['Arabic', 'Chinese', 'English'], ['Arabic', 'English (US)', 'French (France)', 'German', 'Italian', 'Korean', 'Russian', 'Spanish (Spain)'], 'ai', 'finished'],
    ['Interpreter Briefing', 'Mon, Oct 12, 2026', '15:59 - 16:59', '1 hour', ['Amharic', 'English'], [], 'hi', 'finished'],
    ['Sales Kick-off', 'Mon, Oct 05, 2026', '10:35 - 11:35', '1 hour', ['English', 'French'], [], 'hi', 'finished'],
    ['Product Day rehearsal', 'Mon, Oct 05, 2026', '10:31 - 11:31', '1 hour', ['English'], ['French (France)'], 'ai', 'finished'],
    ['Press Briefing', 'Thu, Sep 24, 2026', '12:53 - 13:53', '1 hour', ['English', 'French'], [], 'hi', 'finished'],
    ['Investor Call', 'Tue, Sep 22, 2026', '16:00 - 17:00', '1 hour', ['English'], ['German'], 'ai', 'canceled'],
  ].map(([name, date, time, dur, speakers, translations, k, status]) => baseMeeting({ name, date, time, dur, speakers, translations, kind: k === 'hi' ? 'hi' : 'ai', type: k === 'hi' ? 'hi' : k === 'captions' ? 'captions' : 'speech', status, sample: true })));
  const powered = (m) => (m.kind === 'hi' ? 'Human interpretation' : m.type === 'captions' ? 'AI captions only' : 'AI speech & captions');
  const langsOf = (m) => { const all = [...new Set([...m.speakers, ...m.translations.map((l) => l.replace(/ \(.*\)$/, ''))])]; return all.length > 3 ? `${all.slice(0, 3).join(', ')} +${all.length - 3}` : all.join(', '); };
  const mineRow = () => (S.mine ? [S.mine] : []);
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dt = (iso) => new Date(`${iso}T12:00:00`);
  const fmtLong = (iso) => { const d = dt(iso); return `${DOW[d.getDay()]}, ${MON[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`; };
  const fmtForm = (iso) => { const d = dt(iso); return `${DOW[d.getDay()]}, ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };
  const TODAY = '2026-11-26';
  const dOf = (m) => (m === S.mine ? { date: fmtLong(m.day || TODAY), time: '14:00 - 15:00', dur: '1 hour' } : m);
  const notYetBox = () => h('div', { class: 'k-note' }, 'This page is not available in the sandbox yet');
  const openMeeting = (m) => { S.meeting = m; S.ovAdv = false; if (m === S.mine) go('meeting', 'Open the meeting'); else { go('meeting', `Open ${m.name}`); detour(`Opened another meeting: ${m.name}`); } };
  function homeScreen() {
    const card = (m) => { const d = dOf(m); return h('button', { class: 'k-mcard', type: 'button', on: { click: () => openMeeting(m) } },
      h('b', null, m.name, ' ›'), h('div', null, ic('cal', 14), d.date), h('div', null, ic('clock', 14), d.time, ' CET'), h('div', null, ic('lang', 14), langsOf(m)), h('span', { class: `k-chip ${m.status}` }, m.status.toUpperCase())); };
    const list = [...mineRow(), ...samples()].filter((m) => m.status === 'scheduled' || m.status === 'live').slice(0, 3);
    const empty = (i) => h('div', { class: 'k-mcard empty' }, ic('help', 16), h('span', null, 'No more meetings scheduled'), i === 0 ? h('button', { class: 'k-btn soft', type: 'button', on: { click: (e) => { e.stopPropagation(); S.menu = 'new'; log('click', 'New meeting (home card)'); draw(); } } }, 'New meeting ▾') : null);
    const stat = (k, v) => h('div', null, h('small', null, k), h('b', null, v));
    return shell(h('h1', { class: 'k-h1' }, 'Welcome back, Demo'), h('h3', { class: 'k-h3' }, 'Upcoming meetings'), h('div', { class: 'k-cards' }, list.map(card), ...Array.from({ length: 3 - list.length }, (_, i) => empty(i))),
      h('button', { class: 'k-link', type: 'button', on: { click: () => go('meetings', 'View all my meetings', { mtab: 'upcoming' }) } }, 'View all my meetings'),
      h('div', { class: 'k-grid2' },
        h('div', { class: 'k-panel' }, h('h3', null, 'Usage & analytics'), h('div', { class: 'k-rowsp' }, h('b', null, 'Platform hours'), h('div', { class: 'k-big' }, '412.5', h('small', null, ' / 500 available'))), h('div', { class: 'k-bar' }, h('i', { style: 'width:82%' })),
          h('div', { class: 'k-stats' }, stat('Completed', '38'), stat('Upcoming', String(list.length)), stat('Booked', '52 h 30 m'), stat('Consumed', '41 h 10 m')),
          h('div', { class: 'k-rowsp' }, h('button', { class: 'k-link', type: 'button', on: { click: () => go('usage', 'View all my data') } }, 'View all my data'), h('small', { class: 'k-mini' }, '214 days left this billing cycle'))),
        h('div', { class: 'k-panel' }, h('h3', null, 'Your productivity gain'), h('div', { class: 'k-roi' }, h('small', null, 'Index ROI'), h('div', { class: 'k-big green' }, '41.2'), h('small', null, 'Of your KUDO plan')),
          h('button', { class: 'k-link', type: 'button', on: { click: () => go('usage', 'View my ROI analysis') } }, 'View my ROI analysis'))));
  }
  function meetingsScreen() {
    const tab = S.mtab || 'upcoming';
    const all = [...mineRow(), ...samples()];
    const list = all.filter((m) => (tab === 'upcoming' ? ['scheduled', 'live'].includes(m.status) : tab === 'previous' ? m.status === 'finished' : m.status === 'canceled'));
    const total = tab === 'previous' ? 602 : list.length;
    const tabBtn = (k, l) => h('button', { class: `k-tab ${tab === k ? 'on' : ''}`, type: 'button', on: { click: () => { S.mtab = k; log('nav', `My meetings: ${l}`); if (k === 'canceled' || (k === 'previous' && S.mine?.status !== 'finished')) detour(`My meetings: ${l}`); draw(); } } }, l);
    const statsBtn = (m) => h('button', { class: 'k-ic', type: 'button', title: 'Meeting statistics', 'aria-label': 'Meeting statistics', on: { click: (e) => { e.stopPropagation(); S.meeting = m; go('stats', `Meeting statistics: ${m.name}`); if (m !== S.mine) detour(`Opened another meeting: ${m.name}`); } } }, ic('doc', 14));
    const row = (m) => { const d = dOf(m); return h('tr', { class: 'k-click', on: { click: () => openMeeting(m) } },
      h('td', null, h('span', { class: `k-dot ${m.status}` }), m.status === 'finished' ? h('span', { class: 'k-chip finished k-hoverchip' }, 'FINISHED') : null, h('span', { class: 'k-link' }, m.name)), h('td', null, d.date), h('td', null, d.time, h('small', { class: 'k-mini' }, ' CET')), h('td', null, d.dur), h('td', null, langsOf(m)), h('td', null, powered(m)),
      h('td', null, m.status === 'finished' && m.type !== 'captions' ? statsBtn(m) : null)); };
    return shell(h('div', { class: 'k-rowsp' }, h('div', null, h('h1', { class: 'k-h1' }, 'My meetings'), h('nav', { class: 'k-tabs' }, tabBtn('upcoming', 'Upcoming'), tabBtn('previous', 'Previous'), tabBtn('canceled', 'Canceled'))), h('input', { class: 'k-in k-search', placeholder: 'Search' })),
      h('section', { class: 'k-card' }, h('div', { class: 'k-row end' }, h('button', { class: 'k-ic', type: 'button', title: 'Columns', on: { click: () => { log('click', 'Columns'); toastK('Choose the columns to show'); } } }, ic('doc', 14))),
        h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Meeting name', 'Date', 'Time', 'Duration', 'Languages', 'Powered by', ''].map((x) => h('th', null, x)))),
          h('tbody', null, list.length ? list.map(row) : h('tr', null, h('td', { colspan: 7, class: 'k-empty' }, 'No meetings to show')))),
        h('div', { class: 'k-pager' }, h('span', { class: 'k-mini' }, `Showing ${list.length ? 1 : 0} to ${list.length} of ${total} meetings`), h('span', { class: 'k-mini' }, tab === 'previous' ? '‹  1  2  3  4  5  …  61  ›   10 per page ▾' : '‹  1  ›   10 per page ▾'))));
  }
  function glossaryTable(inMeeting) {
    const m = S.meeting;
    const used = inMeeting ? (m.glossary || S.glossaries.find((g) => g.def).name) : null;
    const menu = (g) => S.menu === `g:${g.name}` ? h('div', { class: 'k-menu right' }, ...(inMeeting ? [h('button', { type: 'button', on: { click: () => { S.modal = { kind: 'gconfirm', g, def: false }; S.menu = null; draw(); } } }, 'Use for this meeting')] : []),
      h('button', { type: 'button', on: { click: () => { S.modal = { kind: 'gconfirm', g, def: true }; S.menu = null; draw(); } } }, 'Set as default for all meetings'), h('button', { type: 'button', on: { click: () => { log('click', `View terms: ${g.name}`); toastK(`${g.name}: ${g.terms} terms`); S.menu = null; draw(); } } }, 'View terms')) : null;
    const chip = (n, label) => h('span', { class: 'k-gchip' }, `${label} ${n}`);
    return [h('div', { class: 'k-gfilter' }, chip(5, 'All actions'), chip(5, 'Recognize'), chip(1, 'Translate as'), chip(2, 'Block'), chip(4, 'Do-not-translate'), chip(1, 'Replace'), h('input', { class: 'k-in k-search', placeholder: 'Search glossaries...' })),
      inMeeting ? h('div', { class: 'k-mini', style: 'margin:6px 0 10px' }, 'Terms in this meeting   0 / 500   0 / 2,000   0 / 500   0 / 1,000   0 / 500') : null,
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Glossary name', 'Terms', 'Actions', ''].map((x) => h('th', null, x)))),
        h('tbody', null, S.glossaries.map((g) => h('tr', null, h('td', null, h('b', null, g.name), inMeeting && used === g.name ? h('span', { class: 'k-tag green' }, 'Use for this meeting') : null, g.def ? h('span', { class: 'k-tag' }, 'Default glossary') : null),
          h('td', null, String(g.terms)), h('td', null, h('span', { class: 'k-gchip sm' }, `◉ ${g.rec}`), h('span', { class: 'k-gchip sm' }, `⊘ ${g.dnt}`)),
          h('td', { class: 'k-rel' }, h('button', { class: 'k-dots', type: 'button', on: { click: () => { S.menu = S.menu === `g:${g.name}` ? null : `g:${g.name}`; log('click', `Glossary menu: ${g.name}`); draw(); } } }, '⋮'), menu(g)))))),
      pager(S.glossaries.length)];
  }
  function glossariesScreen() { return shell(h('div', { class: 'k-rowsp' }, h('h1', { class: 'k-h1' }, 'My glossaries'), h('button', { class: 'k-btn', type: 'button', on: { click: () => { log('click', 'Create glossary'); toastK('Glossary creation is not part of this sandbox yet'); } } }, '+ Create glossary')), h('section', { class: 'k-card' }, ...glossaryTable(false))); }
  function usageScreen() {
    return shell(h('h1', { class: 'k-h1' }, 'Usage & analytics'), h('div', { class: 'k-grid2' }, h('div', { class: 'k-panel' }, h('h3', null, 'Platform hours'), h('div', { class: 'k-big' }, '412.5', h('small', null, ' / 500 available')), h('div', { class: 'k-bar' }, h('i', { style: 'width:82%' }))),
      h('div', { class: 'k-panel' }, h('h3', null, 'This billing cycle'), h('div', { class: 'k-stats' }, ...[['Completed', '38'], ['Upcoming', '4'], ['Booked', '52 h 30 m'], ['Consumed', '41 h 10 m']].map(([k, v]) => h('div', null, h('small', null, k), h('b', null, v)))))),
      h('section', { class: 'k-card', style: 'margin-top:14px' }, h('b', null, 'Meetings this cycle'), h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Meeting', 'Date', 'Duration', 'Languages'].map((x) => h('th', null, x)))), h('tbody', null, [['Q3 Board Review', '19 Nov 2026', '1 h 02 m', '2'], ['Weekly Partner Sync', '20 Nov 2026', '31 m', '2'], ['Sales Kick-off', '12 Nov 2026', '2 h 15 m', '4']].map((r) => h('tr', null, r.map((c) => h('td', null, c))))))));
  }

  // ---------------------------------------------------------------- the meeting form (new AI, new HI, edit)
  function startForm(kind) {
    S.menu = null; log('click', `New meeting: ${kind === 'ai' ? 'AI speech translation' : 'Human interpretation'}`);
    S.form = { day: TODAY, kind, name: '', type: 'speech', speakers: [], translations: [], sign: [], detect: false, recording: true, autoRecord: false, hosts: [], external: false, platform: '', link: '', recurring: false, every: 1, unit: 'day(s)', prep: '0 minutes', aiAssist: false, adv: advDefaults(), advOpen: false, defaults: false };
    go(kind === 'ai' ? 'new-ai' : 'new-hi', kind === 'ai' ? 'New AI speech translation meeting' : 'New Human interpretation meeting');
  }
  const advDefaults = () => ({ size: 'small', desktop: 'off', widget: true, autoFloor: true, projection: false, speaking: 'open', mics: 1, poo: false, raise: true, camera: true, stream: 'av', invite: 'links', viewerAuth: false, pin: false, pinSend: 'link', audioMgr: false, audioMode: 'both', pro: false });
  function picker(id, list, selected, { locked = false, onChange } = {}) {
    const open = S.picker === id;
    const input = h('input', { class: 'k-pick-in', placeholder: selected.length ? '' : 'Select an option', disabled: locked, on: { input: (e) => { S.pq = e.target.value; drawList(); } } });
    const listBox = h('div', { class: 'k-pick-list' });
    const drawList = () => listBox.replaceChildren(...list.filter((l) => !selected.includes(l) && l.toLowerCase().includes((S.pq || '').toLowerCase())).map((l) => h('button', { type: 'button', on: { mousedown: (e) => { e.preventDefault(); selected.push(l); S.pq = ''; log('pick', `${id}: ${l}`); onChange?.(l); draw(); } } }, l)));
    drawList();
    const box = h('div', { class: `k-pick ${locked ? 'locked' : ''} ${open ? 'open' : ''}`, 'data-pick': id, on: { click: () => { if (locked) { log('locked', `${id} is locked`); S.flags[`locked_${id}`] = true; toastK('This setting cannot be changed once the meeting has started'); return; } if (S.picker !== id) { S.picker = id; draw(); app.querySelector(`[data-pick="${id}"] input`)?.focus(); } } } },
      h('div', { class: 'k-pick-chips' }, selected.map((l) => h('span', { class: 'k-lchip' }, locked ? null : h('button', { type: 'button', on: { click: (e) => { e.stopPropagation(); selected.splice(selected.indexOf(l), 1); log('remove', `${id}: ${l}`); draw(); } } }, '×'), l)), input), h('span', { class: 'k-caret' }, '▾'));
    return h('div', { class: 'k-pick-wrap' }, box, open && !locked ? listBox : null, selected.length && !locked ? h('button', { class: 'k-link small', type: 'button', on: { click: () => { selected.length = 0; draw(); } } }, 'Clear all languages') : null);
  }
  function advancedBlock(f, editing, live) {
    const a = f.adv, created = 'This setting cannot be changed once the meeting has been created', starts = 'This setting cannot be changed once the meeting starts';
    const lockC = editing, lockS = live;
    return h('div', { class: 'k-adv' },
      warn(created), row('Meeting type', radio('size', [['small', 'Small - Optimised for interactive meetings'], ['large', 'Large - Optimised for broadcasting']], a.size, set(a, 'size', 'Meeting type'), lockC)),
      warn(created), row('Language Access Desktop App', radio('desk', [['on', 'On'], ['off', 'Off']], a.desktop, set(a, 'desktop', 'Language Access Desktop App'), lockC)),
      row('Mobile link and iframe widget', toggle(a.widget, null, set(a, 'widget', 'Mobile link and iframe widget')), a.widget ? h('div', null, check(a.autoFloor, 'Enable auto-floor', set(a, 'autoFloor', 'Auto-floor')), check(a.projection, 'Enable horizontal screen projection', set(a, 'projection', 'Horizontal screen projection'))) : null),
      warn(starts), row('Your logo', h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Upload logo'); a.logo = true; toastK('Logo uploaded'); draw(); } } }, a.logo ? 'logo.png  ×' : '↑ Upload logo')),
      row('Speaking mode', radio('speak', [['open', 'Open microphone'], ['rts', 'Request-to-speak']], a.speaking, set(a, 'speaking', 'Speaking mode'), lockS),
        a.speaking === 'rts' ? h('div', { class: 'k-sub' }, h('span', null, 'Number of active mics '), select(Array.from({ length: 20 }, (_, i) => i + 1), a.mics, set(a, 'mics', 'Number of active mics'), 'sm'), h('span', null, '  Point of order request '), toggle(a.poo, null, set(a, 'poo', 'Point of order request'))) : null),
      row('Raise hand', toggle(a.raise, null, set(a, 'raise', 'Raise hand'))),
      row('Mobile application settings', h('div', { class: 'k-sub' }, h('span', null, "Participants' camera access "), toggle(a.camera, null, set(a, 'camera', 'Camera access'))), h('div', { class: 'k-sub' }, h('span', null, "Participant's live stream "), radio('stream', [['av', 'Deliver audio and video'], ['a', 'Deliver audio only']], a.stream, set(a, 'stream', 'Live stream')))),
      warn(starts), row('Invite method', radio('invite', [['links', 'Shareable links and user invites'], ['pre', 'Pre-approved users']], a.invite, set(a, 'invite', 'Invite method'), lockS), a.invite === 'pre' ? h('div', { class: 'k-sub' }, h('span', null, 'Viewer authentication '), toggle(a.viewerAuth, null, set(a, 'viewerAuth', 'Viewer authentication'))) : null),
      warn("You can't enable it after the meeting starts. Once enabled, it can't be turned off"), row('PIN protection', toggle(a.pin, null, set(a, 'pin', 'PIN protection'), lockS), a.pin ? radio('pinsend', [['link', 'Send PIN with the invite link'], ['sep', 'Send PIN separately']], a.pinSend, set(a, 'pinSend', 'Send PIN')) : null),
      warn(created), row('Audio manager', toggle(a.audioMgr, null, set(a, 'audioMgr', 'Audio manager'), lockC), h('small', { class: 'k-mini' }, 'Enable on-site and online participants to join the meeting'),
        a.audioMgr ? h('div', null, h('div', { class: 'k-warn strong' }, 'Remember to add an Audio manager (in the Users tab) before the start of your meeting.'), radio('amode', [['both', 'On-Site And Online Participants Join Via KUDO'], ['online', 'Online Participants Only Join Via KUDO']], a.audioMode, set(a, 'audioMode', 'Audio manager mode'), lockC), h('small', { class: 'k-mini' }, 'Suitable for when you have a mix of online and on-site participants')) : null),
      row('Professional services', toggle(a.pro, null, set(a, 'pro', 'Professional services'))));
  }
  function calendar(f) {
    const [y, mo] = S.cal.split('-').map(Number), first = new Date(y, mo - 1, 1), days = new Date(y, mo, 0).getDate();
    const cells = [...Array(first.getDay()).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
    const iso = (d) => `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const shift = (n) => { const d = new Date(y, mo - 1 + n, 1); S.cal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; draw(); };
    return h('div', { class: 'k-cal' }, h('div', { class: 'k-rowsp' }, h('button', { type: 'button', on: { click: () => shift(-1) } }, '‹'), h('b', null, `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][mo - 1]} ${y}`), h('button', { type: 'button', on: { click: () => shift(1) } }, '›')),
      h('div', { class: 'k-calgrid' }, ...['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => h('small', null, d)), ...cells.map((d) => (d ? h('button', { type: 'button', disabled: iso(d) < TODAY, class: iso(d) === f.day ? 'on' : '', on: { click: () => { f.day = iso(d); S.cal = null; log('change', `Date: ${fmtForm(f.day)}`); draw(); } } }, String(d)) : h('span')))));
  }
  function formScreen(mode) {
    const editing = mode === 'edit', f = S.form, live = editing && S.meeting.status === 'live', hi = f.kind === 'hi';
    const name = h('input', { class: 'k-in', value: f.name, placeholder: 'Enter your meeting title', on: { input: (e) => { f.name = e.target.value; }, change: (e) => log('input', `Meeting name: ${e.target.value}`) } });
    const hostEmail = h('input', { class: 'k-in', placeholder: 'Email' });
    const created = 'This setting cannot be changed once the meeting has been created', starts = 'This setting cannot be changed once the meeting starts';
    const form = h('div', { class: 'k-form' }, h('h2', null, editing ? 'Edit a meeting' : hi ? 'Human interpretation meeting' : 'AI speech translation meeting'),
      row('Meeting name *', name, h('div', { class: 'k-mini' }, h('span', { class: 'k-link' }, 'Add description'))),
      row(hi ? 'Date/Time *' : 'Date/time *', h('div', { class: 'k-dt' }, h('div', null, h('small', null, 'Start date/time'), h('button', { class: 'k-in fake k-click', type: 'button', on: { click: () => { S.cal = S.cal ? null : (f.day || TODAY).slice(0, 7); log('click', 'Start date'); draw(); } } }, ic('cal', 14), fmtForm(f.day || TODAY)), h('span', { class: 'k-in fake' }, ic('clock', 14), '2:00 PM'), S.cal ? calendar(f) : null), h('div', null, h('small', null, 'End date/time'), h('span', { class: 'k-in fake' }, ic('cal', 14), fmtForm(f.day || TODAY)), h('span', { class: 'k-in fake' }, ic('clock', 14), '3:00 PM'))),
        h('div', { class: 'k-mini' }, h('span', { class: 'k-link' }, 'Change time zone (CET)'), '   ', check(!!f.force, 'Force close meeting', set(f, 'force', 'Force close meeting')))),
      editing ? null : row('Recurring meeting', toggle(f.recurring, null, set(f, 'recurring', 'Recurring meeting')), f.recurring ? h('div', { class: 'k-sub' }, h('span', null, 'Repeat every '), select([1, 2, 3, 4], f.every, set(f, 'every', 'Repeat every'), 'sm'), select(['day(s)', 'week(s)', 'month(s)'], f.unit, set(f, 'unit', 'Repeat unit'), 'sm'), h('span', null, '  Ends '), select(['On this day', 'After'], 'On this day', set(f, 'ends', 'Ends'), 'sm'), h('span', { class: 'k-in fake' }, ic('cal', 14), 'Select date')) : null),
      hi ? row(h('span', null, 'Preparation time', h('small', { class: 'k-mini' }, ' Optional')), select(['0 minutes', '15 minutes', '30 minutes', '45 minutes', '60 minutes', '2 hours'], f.prep, set(f, 'prep', 'Preparation time'), 'sm')) : null,
      hi ? null : warn(created),
      hi ? null : row('Translation type', ...[['speech', 'AI speech & captions', 'Offer multilingual audio, captions, recording, transcriptions, and AI customization for greater accuracy.'], ['captions', 'AI captions only', 'Supports multilingual closed captioning only, with enhanced display speed. This mode does not support AI customization features.']].map(([k, t, d]) =>
        h('label', { class: `k-type ${f.type === k ? 'on' : ''} ${editing ? 'dis' : ''}` }, h('input', { type: 'radio', name: 'ttype', checked: f.type === k, disabled: editing, on: { change: () => { f.type = k; log('choose', `Translation type: ${t}`); draw(); } } }), h('span', { class: 'k-type-ic' }, ic(k === 'speech' ? 'speaker' : 'cc', 22)), h('span', null, h('b', null, t), h('small', null, d))))),
      hi ? row('Languages', h('small', null, 'Spoken language(s)'), picker('Spoken language', SPEAKER, f.speakers, { locked: live }), h('small', null, 'Sign language(s)'), picker('Sign language', SIGN, f.sign, { locked: live }))
        : row('Languages', h('small', null, 'Speaker language(s)'), picker('Speaker language', SPEAKER, f.speakers, { locked: live, onChange: (l) => { if (l === 'English' && !f.translations.includes('English (US)')) f.translations.unshift('English (US)'); } }),
          toggle(f.detect, 'Detect language automatically', set(f, 'detect', 'Detect language automatically'), live), h('small', { class: 'k-mini' }, 'Up to 10 speaker languages, accuracy may be affected'), h('small', null, 'Translation language(s)'), picker('Translation language', TRANSLATION, f.translations)),
      warn(created),
      row('External meeting: Using KUDO on another platform?', toggle(f.external, null, set(f, 'external', 'External meeting'), editing),
        f.external ? h('div', null, h('small', null, 'Meeting platform *'), select([['', 'Please select'], 'Google Meet', 'Microsoft Teams', 'Zoom', 'Webex', 'ON24'], f.platform, set(f, 'platform', 'Meeting platform')), h('small', null, 'Meeting link *'), h('input', { class: 'k-in', placeholder: 'Enter your meeting link', value: f.link, on: { change: (e) => { f.link = e.target.value; log('input', 'Meeting link'); } } })) : null),
      hi ? warn(starts) : null, hi ? row('AI Assist & Transcripts', toggle(f.aiAssist, null, (v) => { if (v) { S.modal = { kind: 'aiassist' }; log('click', 'AI Assist & Transcripts on'); draw(); } else set(f, 'aiAssist', 'AI Assist & Transcripts')(false); }, live)) : null,
      editing ? null : row(h('span', null, 'Host', h('small', { class: 'k-mini' }, ' Optional')), ...f.hosts.map((x) => h('div', { class: 'k-hostrow' }, ic('user', 14), x)), h('button', { class: 'k-link', type: 'button', on: { click: () => { S.modal = { kind: 'addhost' }; log('click', '+ Add host'); draw(); } } }, '+ Add host'), h('small', { class: 'k-mini' }, 'Max. 2 hosts per meeting')),
      warn(starts),
      row(hi ? 'Recording' : 'Recording and transcript', toggle(f.recording, null, set(f, 'recording', 'Recording'), live), check(f.autoRecord, 'Automatically record this meeting when it starts', (v) => { f.autoRecord = v; log('toggle', `Automatically record: ${v}`); }, live || !f.recording)),
      f.advOpen ? advancedBlock(f, editing, live) : null,
      h('div', { class: 'k-formfoot' }, h('button', { class: 'k-link', type: 'button', on: { click: () => { f.advOpen = !f.advOpen; log('click', f.advOpen ? 'Advanced settings' : 'Less settings'); if (f.advOpen && !RELEVANT.has('advanced')) detour('Advanced settings'); draw(); } } }, f.advOpen ? 'Less settings ▴' : 'Advanced settings ▾'),
        h('div', { class: 'k-row' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => { log('click', 'Cancel'); go(editing ? 'meeting' : 'home', 'Cancel'); } } }, 'Cancel'),
          h('button', { class: 'k-btn', type: 'button', on: { click: () => (editing ? update() : save()) } }, editing ? 'Update' : 'Save'))),
      editing ? null : h('div', { class: 'k-defaults' }, toggle(f.defaults, 'Save settings as default for future meetings', set(f, 'defaults', 'Save settings as default')), h('small', { class: 'k-mini' }, 'Meeting name, description, date/time, recurrence, host, logo, and meeting integration settings are not saved as default.')));
    const extra = S.modal?.kind === 'aiassist' ? modal('AI Assist & Transcripts disclaimer', [h('p', { class: 'k-mini' }, 'AI Assist & Transcripts provides real-time captions in the source language to support interpreters. These captions are automatically generated and may contain inaccuracies. KUDO and its interpreters are not responsible for any errors or omissions.')], [['Cancel', () => { S.modal = null; log('click', 'AI Assist disclaimer: Cancel'); draw(); }, 'ghost'], ['Ok', () => { f.aiAssist = true; S.modal = null; log('toggle', 'AI Assist & Transcripts: true'); draw(); }]])
      : S.modal?.kind === 'editconfirm' ? modal('Are you sure you want to edit this meeting?', [h('div', { class: 'k-kv' }, ...[['Meeting title', f.name], ['Start date', `${fmtForm(f.day || TODAY)}, 02:00 PM`], ['End date', `${fmtForm(f.day || TODAY)}, 03:00 PM`], ['Timezone', 'Brussels']].map(([k, v]) => h('div', null, h('b', null, k), h('span', null, v)))),
        h('p', { class: 'k-mini' }, "If you invited attendees by sending invite links or through calendar don't forget to let them know about the update."), check(S.modal.notify !== false, 'Send a notification email about the update to the users who were added to the meeting in KUDO interface', (v) => { S.modal.notify = v; })],
        [['Cancel', () => { S.modal = null; draw(); }, 'ghost'], ['Edit Meeting', () => { log('click', `Edit Meeting (notify: ${S.modal.notify !== false})`); S.modal = null; update(true); }]]) : null;
    return shell(form, h('div', { class: 'k-terms' }, ic('help', 14), ' By continuing to use KUDO, you agree to our ', h('span', { class: 'k-link' }, 'Terms and Conditions')), extra, S.modal?.kind === 'addhost' ? modal('Add host', [row('Email', hostEmail)], [['Close', () => { S.modal = null; draw(); }, 'ghost'], ['Next', () => { const v = hostEmail.value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toastK('Enter a valid email'); if (f.hosts.length >= 2) return toastK('Max. 2 hosts per meeting'); f.hosts.push(v); S.modal = null; log('input', `Host added in the form: ${v}`); draw(); }]]) : null);
  }
  const modal = (title, body, actions) => h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal' }, h('div', { class: 'k-modal-h' }, h('b', null, title), h('button', { type: 'button', on: { click: () => { S.modal = null; draw(); } } }, '×')), ...body,
    h('div', { class: 'k-row end' }, actions.map(([l, fn, cls]) => h('button', { class: `k-btn ${cls || ''}`, type: 'button', on: { click: fn } }, l)))));
  function save() {
    const f = S.form;
    if (!f.name.trim()) return toastK('Meeting name is required');
    if (!f.speakers.length || (f.kind === 'ai' && !f.translations.length)) return toastK('Choose the languages');
    if (f.external && (!f.platform || !f.link)) return toastK('Choose the meeting platform and paste the meeting link');
    S.meeting = { day: f.day || TODAY, kind: f.kind, name: f.name.trim(), type: f.kind === 'ai' ? f.type : 'hi', speakers: [...f.speakers], translations: f.kind === 'ai' ? [...f.translations] : [], sign: [...f.sign], recording: f.recording, autoRecord: f.autoRecord, external: f.external, adv: { ...f.adv }, prep: f.prep, aiAssist: f.aiAssist,
      participants: f.hosts.map((e) => ({ email: e, name: e.split('@')[0], role: 'Host', via: 'form' })), operators: [], viewers: [], polls: [], files: [], status: 'scheduled', glossary: null,
      av: { res: 'Auto (adaptive)', fps: 'Auto (adaptive)', bitrate: 'Auto (adaptive)', stereo: false, level: 50, processing: true },
      features: { lobby: false, lobbyP: false, lobbyV: false, users: true, docs: true, msg: true, polls: true, request: false, share: true } };
    S.mine = S.meeting;
    log('save', 'Save: meeting created', { meeting: { kind: f.kind, name: S.meeting.name, speakers: S.meeting.speakers, translations: S.meeting.translations, autoRecord: f.autoRecord } });
    go('meeting', 'Meeting created'); toastK('Meeting scheduled successfully');
  }
  function update(confirmed) {
    const f = S.form, m = S.meeting;
    if (m.status === 'scheduled' && !confirmed) { S.modal = { kind: 'editconfirm' }; log('click', 'Update'); draw(); return; }
    const added = f.translations.filter((l) => !m.translations.includes(l)), removed = m.translations.filter((l) => !f.translations.includes(l));
    m.translations = [...f.translations]; m.name = f.name.trim() || m.name; Object.assign(m.adv, f.adv);
    if (m.status !== 'live') { m.speakers = [...f.speakers]; m.autoRecord = f.autoRecord; m.recording = f.recording; m.sign = [...f.sign]; m.aiAssist = f.aiAssist; m.prep = f.prep; if (f.day && f.day !== m.day) log('change', `Meeting moved to ${fmtForm(f.day)}`); m.day = f.day; }
    if (added.length && m.status === 'live') { m.pendingRestart = true; F().liveAdded = [...(F().liveAdded || []), ...added]; }
    if (added.length && m.status === 'scheduled') F().addedBeforeStart = [...(F().addedBeforeStart || []), ...added];
    if (removed.length) F().removed = [...(F().removed || []), ...removed];
    log('save', `Update: ${added.length ? `added ${added.join(', ')}` : 'no new language'}${removed.length ? `, removed ${removed.join(', ')}` : ''}`);
    go('meeting', 'Meeting updated'); toastK('Meeting updated successfully');
  }

  // ---------------------------------------------------------------- the meeting page and its tabs
  const TAB_OF = { meeting: 'overview', users: 'users', participants: 'users', operators: 'users', viewers: 'users', polls: 'content', 'poll-new': 'content', poll: 'content', files: 'content', messages: 'content', recordings: 'content', av: 'settings', features: 'settings', broadcast: 'settings', interpreters: 'users', mglossaries: 'glossaries', stats: 'stats' };
  const tabs = () => {
    const m = S.meeting, cur = TAB_OF[S.screen];
    const menu = (k, label, items) => h('span', { class: 'k-tabw' }, h('button', { class: `k-tab ${cur === k ? 'on' : ''}`, type: 'button', on: { click: () => { S.menu = S.menu === k ? null : k; log('click', `${label} menu`); draw(); } } }, `${label} ▾`),
      S.menu === k ? h('div', { class: 'k-menu' }, items.filter(Boolean).map(([l, fn, dis]) => h('button', { type: 'button', disabled: !!dis, class: dis ? 'dis' : '', on: { click: fn } }, l))) : null);
    return h('div', { class: 'k-mhead' }, h('div', { class: 'k-mtitle' }, h('h2', null, m.name), h('span', { class: `k-chip ${m.status}` }, m.status.toUpperCase())),
      h('nav', { class: 'k-tabs' }, h('button', { class: `k-tab ${cur === 'overview' ? 'on' : ''}`, type: 'button', on: { click: () => go('meeting', 'Overview') } }, 'Overview'),
        menu('users', 'Users', [['All users', () => go('users', 'Users: All users')], ['Participants', () => go('participants', 'Users: Participants')], ['Operators', () => go('operators', 'Users: Operators')], ['Viewers', () => go('viewers', 'Users: Viewers')], m.kind === 'hi' ? ['Interpreters', () => go('interpreters', 'Users: Interpreters')] : null]),
        menu('content', 'Content', [['Polls', () => go('polls', 'Content: Polls')], ['Files', () => go('files', 'Content: Files')], m.status !== 'scheduled' ? ['Messages', () => go('messages', 'Content: Messages')] : null, ['Recordings & transcripts', () => go('recordings', 'Content: Recordings & transcripts')]]),
        menu('settings', 'Settings', [['AV configurations', () => go('av', 'Settings: AV configurations')], ['Meeting features', () => go('features', 'Settings: Meeting features')], ['Broadcast', () => go('broadcast', 'Settings: Broadcast')]]),
        h('button', { class: `k-tab ${cur === 'glossaries' ? 'on' : ''}`, type: 'button', on: { click: () => go('mglossaries', 'My glossaries (meeting)') } }, 'My glossaries'),
        m.status === 'finished' ? h('button', { class: `k-tab ${cur === 'stats' ? 'on' : ''}`, type: 'button', on: { click: () => go('stats', 'Meeting statistics') } }, 'Meeting statistics') : null));
  };
  const links = () => (['finished', 'canceled'].includes(S.meeting.status) ? h('aside', { class: 'k-links' }, h('p', { class: 'k-mini' }, 'The meeting is finished. The invite links are not available.'))
    : h('aside', { class: 'k-links' }, h('h4', null, ic('link'), ' KUDO meeting links ', h('small', { class: 'k-click', on: { click: () => { detour('Copy all links'); toastK('Links copied'); } } }, 'Copy all links')),
      ...['Participant/Speaker', ...(S.meeting.kind === 'hi' ? ['Interpreter'] : []), 'Operator', 'Viewer-Only'].map((l) => h('div', { class: 'k-lbox' }, h('div', { class: 'k-rowsp' }, h('b', null, l), l === 'Viewer-Only' ? h('span', { class: 'k-rel' }, h('button', { class: 'k-link small', type: 'button', on: { click: () => { S.menu = S.menu === 'wcode' ? null : 'wcode'; log('click', 'Copy widget code'); draw(); } } }, 'Copy widget code ▾'),
          S.menu === 'wcode' ? h('div', { class: 'k-menu right' }, ...[['Real time stream *', 'real time'], ['Broadcasting **', 'broadcasting']].map(([t, k]) => h('button', { type: 'button', on: { click: () => { S.menu = null; S.wcode = k; log('copy', `Widget code copied: ${k}`); toastK('Copy Successful! Copied!'); draw(); } } }, t))) : null) : null),
        h('button', { class: 'k-copy', type: 'button', on: { click: () => { detour(`Copied the ${l} link`); toastK('Copy Successful! Copied!'); } } }, `https://live.kudoway.eu/${l === 'Interpreter' ? 'ad/3302' : 'k8/2402'}…`), h('div', { class: 'k-rowsp' }, h('span', { class: 'k-mini' }, 'Add to calendar:'), h('span', null, ...['Google', 'Outlook'].map((c) => h('button', { class: 'k-cal-ic', type: 'button', title: c, on: { click: () => { detour(`Add to calendar (${c}): ${l}`); toastK(`${c} calendar invite downloaded`); } } }, ic('cal', 12))))))),
      h('h4', null, 'KUDO language access'), h('div', { class: 'k-lbox' }, h('b', null, 'iframe widget'), h('button', { class: 'k-copy', type: 'button', on: { click: () => { detour('Copied the iframe widget'); toastK('Code copied'); } } }, '<iframe name="KUDO Widget"…')),
      h('div', { class: 'k-lbox' }, h('b', null, 'Mobile Link'), h('button', { class: 'k-copy', type: 'button', on: { click: () => { detour('Copied the Mobile Link'); toastK('Link copied'); } } }, 'https://audio-widget.kudoway.com/7702…')), h('div', { class: 'k-lbox k-qr' }, h('span', null, 'Download QR code'), h('span', { class: 'k-qrbox' }))));
  const page = (...body) => shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' }, ...body), links()));
  const iconBtn = (icon, tip, fn, cls = '') => h('button', { class: `k-ic ${cls}`, type: 'button', title: tip, 'aria-label': tip, on: { click: fn } }, icon);
  function meetingScreen() {
    const m = S.meeting;
    const actions = m.status === 'scheduled' ? [iconBtn(ic('play'), 'Start meeting', () => { m.status = 'live'; F().started = true; log('click', 'Start meeting'); toastK('Meeting has been started'); draw(); }, 'go'), iconBtn(ic('edit'), 'Edit meeting', editForm), iconBtn(ic('x'), 'Cancel meeting', () => { log('trap', 'Cancel meeting clicked'); S.modal = { kind: 'cancel' }; draw(); }, 'stop')]
      : m.status === 'live' ? [iconBtn(ic('restart'), 'Restart translation service', () => { log('click', 'Restart translation service'); if (m.pendingRestart) { m.pendingRestart = false; F().restarted = true; } else F().restartNoChange = (F().restartNoChange || 0) + 1; toastK('Translation service restart in progress. Service should resume shortly'); draw(); }), iconBtn(ic('edit'), 'Edit meeting', editForm), iconBtn(ic('stop'), 'End meeting', () => { log('click', 'End meeting'); if (!confirm('End the meeting for everyone? An AI meeting cannot be restarted.')) return; m.status = 'finished'; F().ended = true; F().endedBeforeSpanish = !(F().liveAdded || []).some(es); toastK('Meeting has been stopped'); draw(); }, 'stop')]
        : [iconBtn(ic('edit'), 'Edit meeting', () => { detour('Edit a finished meeting'); toastK('The meeting is finished'); })];
    const a = m.adv;
    return withModal(page(h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Overview'), h('div', { class: 'k-acts' }, ...actions)),
      h('div', { class: 'k-def' }, h('span', null, 'Date/time'), h('div', { class: 'k-dtv' }, h('div', null, h('small', null, 'Date'), h('b', null, dOf(m).date)), h('div', null, h('small', null, 'Time'), h('b', null, dOf(m).time)), h('div', { class: 'k-full' }, h('small', null, 'Timezone'), h('span', null, 'Brussels (UTC +01:00)')))),
      m.kind === 'hi' ? null : h('div', { class: 'k-def' }, h('span', null, 'Translation type'), h('div', { class: 'k-typebox' }, m.type === 'speech' ? 'AI speech and captions' : 'AI captions only')),
      m.kind === 'hi' ? h('div', { class: 'k-def' }, h('span', null, 'Languages'), h('div', null, h('small', null, 'Translation languages'), h('div', null, m.speakers.map((l) => h('span', { class: 'k-lchip' }, l))), (m.sign || []).length ? h('small', null, 'Sign languages') : null, h('div', null, (m.sign || []).map((l) => h('span', { class: 'k-lchip' }, l))),
          h('button', { class: `k-book ${canBook(m) ? 'on' : ''}`, type: 'button', disabled: !canBook(m), on: { click: () => { S.bk = { subject: '', topics: [], agree: false, q: '' }; S.modal = { kind: 'book' }; log('click', 'Book Interpreters'); draw(); } } }, ic('user', 13), ' Book Interpreters')))
        : h('div', { class: 'k-def' }, h('span', null, 'Languages'), h('div', null, h('small', null, 'Speaker languages'), h('div', null, m.speakers.map((l) => h('span', { class: 'k-lchip' }, l))), h('small', null, 'Translation languages'), h('div', null, m.translations.map((l) => h('span', { class: 'k-lchip' }, l))))),
      m.booked ? h('div', { class: 'k-def' }, h('span', null, 'Interpreters'), h('div', null, '✓ Booked')) : null,
      m.booked ? h('div', { class: 'k-def' }, h('span', null, 'Preparation materials for interpreters'), h('div', null, h('div', { class: 'k-red' }, '! No preparation materials/information added'), h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Add preparation materials'); S.modal = { kind: 'notyet' }; draw(); } } }, '+ Add preparation materials securely and exclusively for interpreters'))) : null,
      S.ovAdv ? h('div', { class: 'k-def' }, h('span', null, 'Advanced settings'), h('div', { class: 'k-mini k-advlist' }, ...[['Meeting type', a.size === 'large' ? 'Large' : 'Small'], ['Mobile link and iframe widget', a.widget ? 'On' : 'Off'], ['Auto-floor', a.autoFloor ? 'On' : 'Off'], ['Speaking mode', a.speaking === 'rts' ? 'Request-to-speak' : 'Open microphone'], ['Raise hand', a.raise ? 'On' : 'Off'], ['Invite method', a.invite === 'pre' ? 'Pre-approved users' : 'Shareable links and user invites'], ['PIN protection', a.pin ? 'On' : 'Off'], ['Audio manager', a.audioMgr ? 'On' : 'Off'], ['Recording', m.recording ? (m.autoRecord ? 'Automatic' : 'Manual') : 'Off']].map(([k, v]) => h('div', null, h('span', null, k), h('b', null, v))))) : null,
      h('div', { class: 'k-cardf' }, h('button', { class: 'k-link', type: 'button', on: { click: () => { S.ovAdv = !S.ovAdv; log('click', 'Advanced settings (overview)'); if (S.ovAdv) detour('Advanced settings (overview)'); draw(); } } }, S.ovAdv ? 'Less settings ▴' : 'Advanced settings ▾'), h('span', { class: 'k-mini' }, 'Support ID: ', h('button', { class: 'k-copy sm', type: 'button', on: { click: () => { log('click', 'Copy Support ID'); toastK('Support ID copied'); } } }, m === S.mine ? '800 212 907 037' : '800 214 597 772')))));
  }
  const canBook = (m) => m.kind === 'hi' && m.status === 'scheduled' && !m.booked && (m.day || TODAY) > TODAY;
  const SUBJECTS = ['Animals / Veterinary', 'Art / Culture', 'Automotive', 'Banking / Finance', 'Business / Trade', 'Community Service', 'Education', 'Energy', 'Healthcare / Medical', 'Legal', 'Politics / Government', 'Technology / IT', 'Other'];
  function bookModal() {
    const m = S.meeting, b = S.bk, d = fmtForm(m.day || TODAY);
    const topicIn = h('input', { class: 'k-pick-in', placeholder: b.topics.length ? '' : 'Enter key topics like machinery or device names', value: b.q, on: { input: (e) => { b.q = e.target.value; const l = e.target.parentNode.parentNode.querySelector('.k-pick-list'); if (l) l.replaceChildren(...sugg()); }, keydown: (e) => { if (e.key === 'Enter' && b.q.trim()) { e.preventDefault(); add(b.q.trim()); } } } });
    const add = (t) => { if (!b.topics.includes(t)) b.topics.push(t); b.q = ''; log('input', `Specific topic: ${t}`); draw(); };
    const sugg = () => (b.q.trim() ? [h('button', { type: 'button', on: { mousedown: (e) => { e.preventDefault(); add(b.q.trim()); } } }, b.q.trim())] : [h('span', { class: 'k-mini' }, 'No results found')]);
    return modal('Book Interpreters', [
      row('Date / time', h('div', null, `${d} - ${d} 14:00 - 15:00 Brussels`), h('span', { class: 'k-link small', on: { click: () => { log('click', 'Portion of the meeting'); S.modal = { kind: 'notyet', back: 'book' }; draw(); } } }, 'Click here if you only need interpreters for a portion of the meeting')),
      row('Subject matter *', select([['', 'Select the main subject of your meeting'], ...SUBJECTS], b.subject, (v) => { b.subject = v; log('change', `Subject matter: ${v}`); })),
      row('Specific topic for interpreters', h('div', { class: 'k-pick-wrap' }, h('div', { class: 'k-pick open' }, h('div', { class: 'k-pick-chips' }, b.topics.map((t) => h('span', { class: 'k-lchip' }, h('button', { type: 'button', on: { click: () => { b.topics.splice(b.topics.indexOf(t), 1); draw(); } } }, '×'), t)), topicIn)), h('div', { class: 'k-pick-list' }, ...sugg()))),
      row('Additional Cost', h('div', { class: 'k-mini' }, h('p', null, 'A total of ', h('b', null, '2 (two) interpreter-credits'), ' will be deducted from your prepaid bundle. If your balance is running low, we will add any additional credits to your next invoice.'), h('p', null, 'Overtime, cancellation, and change fees apply, as per the Terms and Conditions of Service you signed with KUDO. ISO 23155 recommends at least 2 interpreters per language for meetings longer than 45 minutes.')),
        check(b.agree, 'I agree to this additional non-refundable cost', (v) => { b.agree = v; log('toggle', `Agree to cost: ${v}`); }))],
      [['Cancel', () => { S.modal = null; log('click', 'Booking cancelled'); draw(); }, 'ghost'], ['Complete Booking', () => {
        if (!b.subject) return toastK('Select the subject matter');
        if (!b.agree) return toastK('Tick "I agree to this additional non-refundable cost"');
        m.booked = { subject: b.subject, topics: [...b.topics] }; m.bookState = 'progress'; S.modal = null;
        log('save', `Interpreters booked: ${b.subject}${b.topics.length ? ` (${b.topics.join(', ')})` : ''}`);
        go('interpreters', 'Interpreter Booking');
        setTimeout(() => { m.bookState = 'done'; if (S.screen === 'interpreters' && S.meeting === m) { S.modal = { kind: 'prepask' }; draw(); } }, 1600);
      }]]);
  }
  function withModal(el) {
    const m = S.meeting, k = S.modal?.kind;
    const close = () => { S.modal = null; draw(); };
    const mod = k === 'book' ? bookModal()
      : k === 'cancel' ? modal('Are you sure you want to cancel this meeting?', [h('div', { class: 'k-kv' }, ...[['Meeting title', m.name], ['Start date', `${fmtForm(m.day || TODAY)}, 02:00 PM`], ['End date', `${fmtForm(m.day || TODAY)}, 03:00 PM`], ['Timezone', 'Brussels']].map(([a, v]) => h('div', null, h('b', null, a), h('span', null, v)))),
          h('p', { class: 'k-mini' }, 'Please note that if you invited attendees via a calendar invite or by sharing the meeting link, they will not be notified.'), check(S.modal.notify !== false, 'Notify all users who were added to the meeting in the KUDO interface.', (v) => { S.modal.notify = v; })],
          [['Cancel', close, 'ghost'], ['Cancel meeting', () => { log('trap', 'Meeting cancelled'); F().cancelled = true; m.status = 'canceled'; S.modal = null; go('meetings', 'My meetings', { mtab: 'upcoming' }); toastK('Meeting canceled successfully.'); }]])
      : k === 'prepask' ? modal('', [h('div', { class: 'k-center' }, ic('doc', 30), h('p', null, 'Please add files or links to help interpreters prepare.'))], [['Later', () => { log('click', 'Preparation materials: Later'); close(); }, 'ghost'], ['Add', () => { log('click', 'Preparation materials: Add'); S.modal = { kind: 'notyet' }; draw(); }]])
      : k === 'starthls' ? modal('Start broadcast', [h('p', { class: 'k-mini' }, 'The session will be broadcasted to all streams.')], [['Cancel', close, 'ghost'], ['Start HLS broadcast', () => { m.bc.live = true; S.modal = null; log('click', 'Start HLS broadcast'); if (m === S.mine) S.flags.hlsStarted = true; toastK('Your HLS broadcast has started.'); draw(); }]])
      : k === 'notyet' ? modal('', [notYetBox()], [['Close', () => { S.modal = S.modal.back ? { kind: S.modal.back } : null; draw(); }, 'ghost']]) : null;
    if (mod) el.append(mod);
    return el;
  }
  function interpretersScreen() {
    const m = S.meeting, b = m.booked;
    const body = !b ? [h('b', null, ic('users'), ' Users  ', h('span', { class: 'k-mini' }, 'Interpreters ▾')), notYetBox()]
      : [h('b', null, ic('users'), ' Users  ', h('span', { class: 'k-mini' }, 'Interpreters ▾')), h('h3', { class: 'k-h3' }, 'Interpreter Booking'),
        row('Status', h('div', { class: `k-bstat ${m.bookState}` }, h('div', { class: 'k-bar' }, h('i', { style: `width:${m.bookState === 'done' ? 100 : 70}%` })), h('small', null, m.bookState === 'done' ? 'Booking Completed' : 'Booking in progress...'))),
        h('b', null, 'Summary'), ...[['Title', m.name], ['Date', `${fmtForm(m.day || TODAY)} - ${fmtForm(m.day || TODAY)}`], ['Time', '14:00 - 15:00'], ['Languages', h('span', null, [...m.speakers, ...(m.sign || [])].map((l) => h('span', { class: 'k-lchip' }, l)))], ['Subject Matter', b.subject]].map(([k, v]) => h('div', { class: 'k-def' }, h('span', null, k), h('div', null, v))),
        h('div', { class: 'k-def' }, h('span', null, 'Preparation Materials for Interpreters'), h('button', { class: 'k-link', type: 'button', on: { click: () => { log('click', 'Add preparation materials'); S.modal = { kind: 'notyet' }; draw(); } } }, '+ Add preparation materials securely and exclusively for interpreters')),
        h('div', { class: 'k-def' }, h('span', null, 'Interpreters'), h('span', { class: 'k-mini' }, 'Meet your interpreters'))];
    return withModal(page(...body));
  }
  function broadcastScreen() {
    const m = S.meeting; m.bc = m.bc || { hls: false, dur: '4 hours', rtmp: false, live: false };
    const bc = m.bc, live = m.status === 'live';
    const saved = (t) => { toastK(t); setTimeout(() => toastK('Please wait! Refreshing...'), 300); };
    return withModal(page(
      h('div', { class: 'k-rowsp' }, h('b', null, ic('speaker'), ' HLS broadcast'), live && bc.hls ? h('button', { class: `k-link small ${bc.live ? 'k-red' : ''}`, type: 'button', on: { click: () => { if (bc.live) { bc.live = false; log('click', 'Stop broadcast'); draw(); } else { S.modal = { kind: 'starthls' }; log('click', 'Start broadcast'); draw(); } } } }, bc.live ? '■ Stop broadcast' : '▸ Start broadcast') : null),
      row('HLS Stream', toggle(bc.hls, null, (v) => { bc.hls = v; log('toggle', `HLS Stream: ${v}`); if (m === S.mine) S.flags.hls = v; saved('Successful! Broadcast settings saved successfully.'); draw(); }, bc.live || m.status === 'finished')),
      bc.hls && !bc.live ? row('Stream Duration', select(['1 hour', '2 hours', '3 hours', '4 hours', '5 hours', '6 hours', '8 hours', '12 hours'], bc.dur, (v) => { bc.dur = v; log('change', `Stream Duration: ${v}`); saved('Successful! Broadcast settings updated successfully.'); }, 'sm')) : null,
      h('b', null, '≡ RTMP broadcast'),
      row('RTMP Stream', toggle(bc.rtmp, null, () => { log('toggle', 'RTMP Stream'); S.modal = { kind: 'notyet' }; draw(); }, bc.live))));
  }
  function editForm() {
    const m = S.meeting; log('click', 'Edit meeting');
    if (m.status === 'finished') return;
    S.form = { day: m.day || TODAY, kind: m.kind, name: m.name, type: m.type, speakers: [...m.speakers], translations: [...m.translations], sign: [...(m.sign || [])], detect: false, recording: m.recording, autoRecord: m.autoRecord, hosts: [], external: m.external, adv: { ...m.adv }, advOpen: false, prep: m.prep, aiAssist: m.aiAssist };
    go('edit', 'Edit meeting');
  }
  function usersScreen(kind) {
    const m = S.meeting; const list = kind === 'all' ? [...m.participants.map((p) => ({ ...p, type: 'Participant' })), ...m.operators.map((p) => ({ ...p, type: 'Operator' })), ...m.viewers.map((p) => ({ ...p, type: 'Viewer' }))] : kind === 'participants' ? m.participants : kind === 'operators' ? m.operators : m.viewers;
    const label = { all: 'All users', participants: 'Participants', operators: 'Operators', viewers: 'Viewers' }[kind];
    const addLabel = { participants: '+ Add participant', operators: '+ Add operator', viewers: '+ Add viewer' }[kind];
    const email = h('input', { class: 'k-in', placeholder: 'Email', type: 'email' });
    const rows = list.map((p) => h('tr', null, h('td', null, h('input', { type: 'checkbox' })), h('td', null, p.name), h('td', null, p.email),
      h('td', null, p.type && kind === 'all' ? p.type : kind === 'participants' ? (p.role === 'Host' ? h('span', null, 'Participant ', h('span', { class: 'k-chip host' }, 'HOST')) : 'Participant') : label.replace(/s$/, '')), h('td', null, 'Invited | ', h('span', { class: 'k-link' }, 'Resend')),
      h('td', { class: 'k-acts' }, kind === 'participants' && p.role !== 'Host' ? h('button', { class: 'k-ic go', type: 'button', title: 'Make Host', 'aria-label': 'Make Host', on: { click: () => { p.role = 'Host'; log('click', `Make host: ${p.email}`); toastK('New Host appointed successfully'); draw(); } } }, ic('user')) : null,
        h('button', { class: 'k-ic', type: 'button', title: 'Edit', on: { click: () => { log('click', `Edit user ${p.email}`); toastK('User details are managed by the user'); } } }, ic('edit')),
        kind !== 'all' ? h('button', { class: 'k-ic stop', type: 'button', title: 'Delete', on: { click: () => { log('trap', `Deleted ${label.toLowerCase().replace(/s$/, '')} ${p.email}`); list.splice(list.indexOf(p), 1); draw(); } } }, ic('trash')) : null)));
    const target = kind === 'operators' ? m.operators : kind === 'viewers' ? m.viewers : m.participants;
    return shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' },
      h('div', { class: 'k-cardh' }, h('b', null, ic('users'), ' Users  ', h('span', { class: 'k-mini' }, `${label} ▾`)), addLabel ? h('div', { class: 'k-row' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { S.modal = { kind: 'adduser' }; log('click', addLabel); draw(); } } }, addLabel), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { log('click', 'Import'); toastK('Import from a CSV file: download the template first'); } } }, `Import ${label.toLowerCase()}`)) : null),
      h('input', { class: 'k-in k-search', placeholder: 'Search' }),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['', 'Name', 'Email', 'Role', 'Status', ''].map((x) => h('th', null, x)))), h('tbody', null, rows.length ? rows : h('tr', null, h('td', { colspan: 6, class: 'k-empty' }, `No ${label.toLowerCase()} added to this meeting. To add one click on the '${addLabel || '+ Add'}' button above. You can simply invite them by the 'Kudo Meeting Links'.`)))), pager(rows.length)), links()),
      S.modal?.kind === 'adduser' ? modal(addLabel.slice(2).replace(/^./, (c) => c.toUpperCase()), [row('Email', email)], [['Close', () => { S.modal = null; draw(); }, 'ghost'], ['Next', () => { const v = email.value.trim().toLowerCase(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toastK('Enter a valid email'); target.push({ email: v, name: v === HOST ? 'Host Client Demo' : v.split('@')[0], role: kind === 'participants' ? 'Participant' : label.replace(/s$/, ''), via: kind }); log('input', `${label.replace(/s$/, '')} added: ${v}`); S.modal = null; toastK('Successful! User added successfully'); draw(); }]]) : null);
  }
  // Polls: list, add, details with rights, weight and advanced settings
  function pollsScreen() {
    const m = S.meeting;
    return page(h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Polls'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { S.pf = { title: '', q: '', type: 'mc', n: 2, sel: 1, min: 1, answers: ['', ''], results: 'nominative' }; go('poll-new', 'Add poll'); } } }, '+ Add poll')),
      h('input', { class: 'k-in k-search', placeholder: 'Search' }),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Poll title', 'Participant polling rights', 'Status', ''].map((x) => h('th', null, x)))),
        h('tbody', null, m.polls.length ? m.polls.map((p) => h('tr', null, h('td', null, h('button', { class: 'k-link', type: 'button', on: { click: () => go('poll', `Open poll ${p.title}`, { poll: p, ptab: 'details' }) } }, p.title)), h('td', null, h('span', { class: 'k-link' }, 'Set List as Default')), h('td', null, h('span', { class: 'k-chip' }, p.status)),
          h('td', { class: 'k-acts' }, h('button', { class: 'k-ic', type: 'button', title: 'Edit', on: { click: () => go('poll', `Open poll ${p.title}`, { poll: p, ptab: 'details' }) } }, ic('edit')), h('button', { class: 'k-ic stop', type: 'button', title: 'Delete', on: { click: () => { m.polls.splice(m.polls.indexOf(p), 1); log('click', 'Delete poll'); draw(); } } }, ic('trash')))))
          : h('tr', null, h('td', { colspan: 4, class: 'k-empty' }, "No polling added to this meeting. To add polling click on the '+ Add poll' button above.")))), pager(m.polls.length));
  }
  function pollNewScreen() {
    const p = S.pf, parl = p.type === 'parl';
    const answers = parl ? ['Yes', 'No', 'Abstain'] : p.answers;
    return page(h('b', null, ic('doc'), ' Add poll'),
      row('Title *', h('input', { class: 'k-in', placeholder: 'Title of the poll', value: p.title, on: { input: (e) => { p.title = e.target.value; } } }), h('small', { class: 'k-mini' }, `${240 - p.title.length} characters remaining`)),
      row('Question *', h('input', { class: 'k-in', placeholder: 'Question', value: p.q, on: { input: (e) => { p.q = e.target.value; } } })),
      row('Type of poll *', radio('ptype', [['mc', 'Multiple Choice'], ['parl', 'Parliamentary']], p.type, set(p, 'type', 'Type of poll'))),
      parl ? null : row('Number of answers', select([2, 3, 4, 5, 6, 7, 8, 9, 10], p.n, (v) => { p.n = Number(v); while (p.answers.length < p.n) p.answers.push(''); p.answers.length = p.n; log('change', `Number of answers: ${v}`); draw(); })),
      parl ? null : row('Number of options can be selected', select(Array.from({ length: p.n }, (_, i) => [i + 1, `${i + 1} option${i ? 's' : ''} can be selected`]), p.sel, set(p, 'sel', 'Options can be selected'))),
      parl ? null : row('Minimum number of options to be selected', select(Array.from({ length: p.n }, (_, i) => [i + 1, `${i + 1} option${i ? 's' : ''} should be selected`]), p.min, set(p, 'min', 'Minimum options'))),
      ...answers.map((a, i) => row(`Answer ${i + 1}`, h('input', { class: 'k-in', placeholder: `Answer ${i + 1}`, value: a, disabled: parl, on: { input: (e) => { p.answers[i] = e.target.value; } } }))),
      parl ? row('Results', radio('pres', [['ballot', 'Ballot (anonymous)'], ['nominative', 'Nominative (identifiable vote)']], p.results, set(p, 'results', 'Results')), h('small', { class: 'k-mini' }, 'You are responsible for collecting participants’ consent and to make use of these personally identifiable data in compliance with applicable data protection and privacy laws.')) : null,
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn ghost', type: 'button', on: { click: () => go('polls', 'Cancel poll') } }, 'Cancel'), h('button', { class: 'k-btn', type: 'button', on: { click: () => {
        if (!p.title.trim() || !p.q.trim()) return toastK('Title and question are required');
        if (!parl && p.answers.some((x) => !x.trim())) return toastK('Fill in every answer');
        const poll = { title: p.title.trim(), q: p.q.trim(), type: parl ? 'Parliamentary' : 'Multiple Choice', sel: parl ? 1 : p.sel, min: parl ? 1 : p.min, answers: [...answers], status: 'POLL CREATED', rights: 'all', selected: new Set(), weights: {}, control: { client: true, operator: true, host: true }, exp: 'yes', timed: 'no', time: '01:00' };
        S.meeting.polls.push(poll); log('save', `Poll created: ${poll.title}`); toastK('Poll has been created'); go('poll', `Open poll ${poll.title}`, { poll, ptab: 'details' });
      } } }, 'Save')));
  }
  function pollScreen() {
    const p = S.poll, m = S.meeting;
    const nav = [['details', 'Poll Details'], ['rights', 'Polling Rights'], ['weight', 'Polling Weight'], ['adv', 'Advanced Settings']];
    const body = { details: () => h('div', null, ...[['Question', p.q], ['Type', p.type], ['Number of options can be selected', p.sel], ['Minimum number of options to be selected', p.min], ['Status', h('span', { class: 'k-chip' }, p.status)], ['Answers', h('div', null, p.answers.map((a, i) => h('div', null, h('span', { class: 'k-link' }, `Option ${i + 1}: `), a)))]].map(([k, v]) => h('div', { class: 'k-def' }, h('span', null, k), h('div', null, v))),
        h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { if (m.status !== 'live') return toastK('The vote can start once the meeting has started'); p.status = 'VOTING'; log('click', 'Start vote'); draw(); } } }, 'Start vote')),
      rights: () => h('div', null, row('Polling Rights', radio('rights', [['all', 'All Participants'], ['sel', 'Selected Participants']], p.rights, (v) => { p.rights = v; log('change', `Polling rights: ${v}`); toastK('Polling rights has been updated'); draw(); })),
        p.rights === 'all' ? h('div', { class: 'k-note' }, h('b', null, 'All Participants: '), 'Everyone who is in the meeting can attend in this poll')
          : h('div', null, h('div', { class: 'k-note' }, h('b', null, 'Selected Participants: '), 'You can select from the participants who are added or joined to the meeting. To add more participants go to the Users tab.'), h('div', { class: 'k-rowsp' }, h('input', { class: 'k-in k-search', placeholder: 'Search' }), h('span', { class: 'k-link' }, '⟳ Refresh List')), h('b', null, 'All Participant List'),
            h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['Unselect all', 'Name', 'Email', 'Status'].map((x) => h('th', null, x)))), h('tbody', null, m.participants.length ? m.participants.map((u) => h('tr', null, h('td', null, h('input', { type: 'checkbox', checked: p.selected.has(u.email), on: { change: (e) => { if (e.target.checked) p.selected.add(u.email); else p.selected.delete(u.email); log('change', `Polling right ${u.email}: ${e.target.checked}`); } } })), h('td', null, u.name), h('td', null, u.email), h('td', null, 'Invited'))) : h('tr', null, h('td', { colspan: 4, class: 'k-empty' }, 'No participant added yet')))), h('span', { class: 'k-link' }, 'Set List as Default'))),
      weight: () => h('div', null, h('div', { class: 'k-note' }, 'You can assign polling weight to participants who have the polling rights.  ', h('span', { class: 'k-link' }, '⟳ Refresh List')),
        h('div', { class: 'k-grid2' }, h('div', null, h('div', { class: 'k-rowsp' }, h('input', { class: 'k-in k-search', placeholder: 'Search' }), h('span', { class: 'k-link' }, 'Reset')), h('small', { class: 'k-mini' }, 'Added Participants'), ...m.participants.map((u) => h('div', { class: 'k-rowsp' }, h('b', null, u.name), select(Array.from({ length: 10 }, (_, i) => i + 1), p.weights[u.email] || 1, (v) => { p.weights[u.email] = Number(v); log('change', `Polling weight ${u.email}: ${v}`); toastK('Polling weight has been updated'); }, 'sm')))),
          h('div', null, h('input', { class: 'k-in k-search', placeholder: 'Search' }), h('small', { class: 'k-mini' }, 'Joined Participants'), h('p', { class: 'k-mini' }, 'The list of joined participants will be available once the meeting starts')))),
      adv: () => h('div', null, row(h('span', null, 'Poll Control', h('small', { class: 'k-mini', style: 'display:block' }, 'Define who can manage the vote (start, stop, publish results)')), check(true, 'Client', () => {}, true), check(p.control.operator, 'Operator', (v) => { p.control.operator = v; log('change', `Poll control operator: ${v}`); toastK('Poll control has been updated'); }), check(p.control.host, 'Host(s)', (v) => { p.control.host = v; log('change', `Poll control host: ${v}`); toastK('Poll control has been updated'); })),
        row(h('span', null, 'Poll Export', h('small', { class: 'k-mini', style: 'display:block' }, 'Select Yes to have the ability to export poll responses with names in the Poll details after the Poll starts and in the reports after the meeting ends.')), radio('pexp', [['yes', 'Yes'], ['no', 'No']], p.exp, (v) => { p.exp = v; log('change', `Poll export: ${v}`); toastK('Poll has been updated'); draw(); })),
        row(h('span', null, 'Predefined Poll Time', h('small', { class: 'k-mini', style: 'display:block' }, 'This poll will be available to vote within the time assigned.')), radio('ptime', [['yes', 'Yes'], ['no', 'No']], p.timed, (v) => { p.timed = v; log('change', `Predefined poll time: ${v}`); toastK('Poll has been updated'); draw(); }), h('input', { class: 'k-in sm', value: p.time, disabled: p.timed !== 'yes', on: { change: (e) => { p.time = e.target.value; log('change', `Poll time: ${e.target.value}`); } } }))) }[S.ptab]();
    return shell(tabs(), h('section', { class: 'k-card' }, h('div', { class: 'k-rowsp' }, h('button', { class: 'k-link', type: 'button', on: { click: () => go('polls', 'Back to polls list') } }, '‹ Back to polls list'), h('div', { class: 'k-acts' }, iconBtn(ic('edit'), 'Edit poll', () => log('click', 'Edit poll'), 'go'), iconBtn(ic('trash'), 'Delete poll', () => { m.polls.splice(m.polls.indexOf(p), 1); log('click', 'Delete poll'); go('polls', 'Poll deleted'); }, 'stop'))),
      h('h3', { class: 'k-h3' }, p.title), h('div', { class: 'k-pollgrid' }, h('nav', { class: 'k-pollnav' }, nav.map(([k, l]) => h('button', { class: S.ptab === k ? 'on' : '', type: 'button', on: { click: () => { S.ptab = k; log('nav', `Poll: ${l}`); draw(); } } }, l))), body)));
  }
  function filesScreen() {
    const m = S.meeting;
    const SAMPLE = [['Agenda.pdf', 'PDF', '214 KB'], ['Speaker list.docx', 'DOCX', '38 KB'], ['Slides.pptx', 'PPTX', '4.2 MB']];
    return page(h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Files'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { S.modal = { kind: 'file', pick: SAMPLE[0][0], acc: 'All' }; log('click', '+ Add files'); draw(); } } }, '+ Add files')),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['File name', 'Content type', 'Accessibility', 'File size', 'Actions'].map((x) => h('th', null, x)))),
        h('tbody', null, m.files.length ? m.files.map((f) => h('tr', null, h('td', null, f.name), h('td', null, f.type), h('td', null, f.acc), h('td', null, f.size), h('td', { class: 'k-acts' }, h('span', { class: 'k-ic go' }, ic('dl', 14)), h('button', { class: 'k-ic stop', type: 'button', title: 'Delete', on: { click: () => { m.files.splice(m.files.indexOf(f), 1); log('click', 'Delete file'); draw(); } } }, ic('trash')))))
          : h('tr', null, h('td', { colspan: 5, class: 'k-empty' }, 'No files added to this meeting.')))), pager(m.files.length),
      S.modal?.kind === 'file' ? modal('Add files', [row('File', select(SAMPLE.map((x) => x[0]), S.modal.pick, (v) => { S.modal.pick = v; }), h('small', { class: 'k-mini' }, 'Sandbox: pick one of the sample files')), row('Accessible to', select(['All', 'Participants', 'Interpreters'], S.modal.acc, (v) => { S.modal.acc = v; }))],
        [['Cancel', () => { S.modal = null; draw(); }, 'ghost'], ['Upload', () => { const s = SAMPLE.find((x) => x[0] === S.modal.pick); m.files.push({ name: s[0].replace(/\.[^.]+$/, ''), type: s[1], size: s[2], acc: S.modal.acc }); log('save', `File uploaded: ${s[0]} (${S.modal.acc})`); S.modal = null; toastK('File uploaded successfully'); draw(); }]]) : null);
  }
  function messagesScreen() { return page(h('b', null, ic('doc'), ' Messages'), h('p', { class: 'k-mini' }, 'Messages exchanged in the meeting chat appear here.'), h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['From', 'Message', 'Time'].map((x) => h('th', null, x)))), h('tbody', null, h('tr', null, h('td', { colspan: 3, class: 'k-empty' }, 'No messages yet.'))))); }
  function recordingsScreen() {
    const m = S.meeting; const done = m.status === 'finished' && m.recording && m.autoRecord && m.kind !== 'hi' && !(m === S.mine && S.flags.cancelled);
    const files = done ? ['Original Audio', ...m.translations] : [];
    return shell(tabs(), h('div', { class: 'k-split' }, h('section', { class: 'k-card' }, h('b', null, ic('doc'), ' Recordings & Transcripts'),
      h('p', { class: 'k-mini' }, 'If you choose to record your meeting, your recording and transcripts will be stored in the KUDO cloud for 30 days before being automatically deleted. You can download them at any time during this period.'),
      h('table', { class: 'k-tbl' }, h('thead', null, h('tr', null, ['ID', 'Meeting Title', 'Start Date and Time', 'End Date and Time', 'Time Zone', 'Action'].map((x) => h('th', null, x)))),
        h('tbody', null, done ? h('tr', null, h('td', null, '1'), h('td', null, m.name), h('td', null, `${dOf(m).date} ${dOf(m).time.split(' - ')[0]}`), h('td', null, `${dOf(m).date} ${dOf(m).time.split(' - ')[1]}`), h('td', null, 'Europe/Brussels'), h('td', null, h('button', { class: 'k-ic go', type: 'button', title: 'Download', on: { click: () => { S.modal = { kind: 'dl' }; F().foundRecording = true; log('click', 'Download recordings'); draw(); } } }, ic('dl'))))
          : h('tr', null, h('td', { colspan: 6, class: 'k-empty' }, 'No recordings available of this meeting.')))),
      done ? h('p', { class: 'k-mini' }, 'Sandbox time is fast-forwarded: in reality recordings appear 15 to 20 minutes after the meeting ends.') : null), links()),
    S.modal?.kind === 'dl' ? h('div', { class: 'k-modal-bg' }, h('div', { class: 'k-modal' }, h('div', { class: 'k-modal-h' }, h('b', null, 'Download Recordings & Transcripts'), h('button', { type: 'button', on: { click: () => { S.modal = null; draw(); } } }, '×')),
      h('p', { class: 'k-mini' }, 'For videos with captioning we recommend to use VLC media player'), h('button', { class: 'k-btn soft', type: 'button', on: { click: () => log('click', 'Download all (zip)') } }, ic('dl'), ' Download Recordings & Transcripts'),
      h('table', { class: 'k-tbl' }, h('tbody', null, files.map((l) => h('tr', null, h('td', null, h('b', null, l)), h('td', null, '1.2 MB'), h('td', { class: 'k-acts' }, h('span', { class: 'k-ic go' }, ic('play', 14)), h('span', { class: 'k-ic go' }, ic('dl', 14)), h('span', { class: 'k-ic go' }, ic('dl', 14))))))))) : null);
  }
  function avScreen() {
    const v = S.meeting.av;
    return page(h('b', null, ic('doc'), ' AV configurations'), h('b', { class: 'k-subh' }, 'Participant/Speaker'),
      row('Video resolution', select(['Auto (adaptive)', 'High definition (1280×720)', 'Standard definition (640×480)', 'Low definition (320×240)'], v.res, (x) => { v.res = x; log('change', `Video resolution: ${x}`); })),
      row('Frame rate', select(['Auto (adaptive)', '15', '24', '30'], v.fps, (x) => { v.fps = x; log('change', `Frame rate: ${x}`); })),
      row('Audio bitrate', select(['Auto (adaptive)', 'Narrowband (8-12 kbps)', 'Wideband (16-20 kbps)', 'Fullband (28-40 kbps)', 'Fullband (48-64 kbps)'], v.bitrate, (x) => { v.bitrate = x; log('change', `Audio bitrate: ${x}`); })),
      row('Stereo sound', toggle(v.stereo, null, set(v, 'stereo', 'Stereo sound'))),
      row('Audio level', h('input', { type: 'range', min: 0, max: 100, value: v.level, class: 'k-range', on: { change: (e) => { v.level = Number(e.target.value); log('change', `Audio level: ${e.target.value}`); } } })),
      row('Audio processing *', toggle(v.processing, null, set(v, 'processing', 'Audio processing')), h('small', { class: 'k-mini' }, '* Echo cancellation, Automatic gain control, Noise suppression (Default is ON)')),
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { log('save', 'AV configurations updated'); toastK('AV configurations updated'); } } }, 'Update')));
  }
  function featuresScreen() {
    const ft = S.meeting.features, locked = S.meeting.status !== 'scheduled';
    const t = (k, label) => h('div', { class: 'k-rowsp k-feat' }, h('span', null, label), toggle(ft[k], null, set(ft, k, label), locked));
    return page(h('b', null, ic('lock'), ' Meeting features'), h('div', { class: 'k-warn strong' }, "You can't enable these after the meeting starts. Once enabled, they can't be turned off."),
      row('Lobby (waiting room)', check(ft.lobby, 'Enable Lobby (waiting room)', set(ft, 'lobby', 'Enable lobby'), locked), h('div', { class: 'k-sub' }, check(ft.lobbyP, 'Lobby for participants/speakers', set(ft, 'lobbyP', 'Lobby for participants/speakers'), locked || !ft.lobby), check(ft.lobbyV, 'Lobby for viewers-only', set(ft, 'lobbyV', 'Lobby for viewers-only'), locked || !ft.lobby))),
      row('Available features for participant/speaker', t('users', 'Active user list'), t('docs', 'Documents'), t('msg', 'Messaging'), t('polls', 'Polls'), t('request', 'Request list'), t('share', 'Screen share')),
      h('div', { class: 'k-row end' }, h('button', { class: 'k-btn soft', type: 'button', on: { click: () => { log('save', 'Meeting features saved'); toastK('Meeting features updated'); } } }, 'Save')));
  }
  function mGlossariesScreen() {
    const g = S.modal?.kind === 'gconfirm' ? S.modal : null;
    return shell(tabs(), h('section', { class: 'k-card' }, ...glossaryTable(true)),
      g ? modal(g.def ? 'Confirm default glossary change' : 'Confirm glossary change', [h('p', null, g.def ? 'Set this as your default glossary for all meetings?' : 'Use this glossary for this meeting?')], [['Cancel', () => { S.modal = null; draw(); }, 'ghost'], ['OK', () => { if (g.def) { S.glossaries.forEach((x) => { x.def = x === g.g; }); log('change', `Default glossary: ${g.g.name}`); } else { S.meeting.glossary = g.g.name; log('change', `Glossary for this meeting: ${g.g.name}`); } S.modal = null; toastK('Glossary updated'); draw(); }]]) : null);
  }
  // Meeting statistics (finished meetings): the report, as in the client portal.
  function statsScreen() {
    const m = S.meeting, mine = m === S.mine;
    const mins = mine ? Math.max(1, Math.round((Date.now() - S.t0) / 60000)) : ({ '30 minutes': 30, '1 hour': 58, '2 hours': 117, '3 hours': 176, '4 hours 55 minutes': 291 })[m.dur] || 60;
    const langs = m.kind === 'hi' ? m.speakers : m.translations;
    const users = m.participants.length + m.operators.length + m.viewers.length + 1;
    const tile = (k, icn, v, sub) => h('div', { class: 'k-tile' }, h('small', null, k), h('div', null, h('span', { class: 'k-tile-ic' }, ic(icn, 15)), h('b', null, String(v)), sub ? h('small', { class: 'k-mini' }, ` ${sub}`) : null));
    const bars = (labels) => h('div', { class: 'k-chart' }, svg(`<svg viewBox="0 0 220 120" width="100%" height="120"><g stroke="#E5E5E5">${[20, 45, 70, 95].map((y) => `<line x1="24" x2="215" y1="${y}" y2="${y}"/>`).join('')}</g>${labels.map((l, i, a) => { const w = 150 / a.length; const x = 40 + i * (180 / a.length); return `<rect x="${x}" y="${20 + (i * 17) % 40}" width="${w}" height="${75 - (i * 17) % 40}" fill="#14A88A"/><text x="${x + w / 2}" y="112" font-size="8" text-anchor="middle" fill="#555">${l}</text>`; }).join('')}</svg>`));
    const pie = () => h('div', { class: 'k-chart' }, svg('<svg viewBox="0 0 120 120" width="120" height="120"><circle cx="60" cy="55" r="45" fill="#14A88A"/><line x1="60" y1="10" x2="60" y2="55" stroke="#fff"/><text x="60" y="115" font-size="9" text-anchor="middle" fill="#555">participant</text></svg>'));
    const map = () => h('div', { class: 'k-chart k-map' }, svg('<svg viewBox="0 0 220 110" width="100%" height="110"><g fill="#E3E6EA"><ellipse cx="55" cy="40" rx="38" ry="22"/><ellipse cx="70" cy="82" rx="16" ry="22"/><ellipse cx="118" cy="38" rx="20" ry="16"/><ellipse cx="122" cy="76" rx="18" ry="24"/><ellipse cx="170" cy="42" rx="40" ry="24"/><ellipse cx="190" cy="90" rx="16" ry="10"/></g><circle cx="114" cy="36" r="3.5" fill="#2C6E9B"/></svg>'));
    const panel = (t, d, body) => h('div', { class: 'k-panel k-stat' }, h('b', null, t), h('small', { class: 'k-mini' }, d), body);
    const none = () => h('div', { class: 'k-none' }, ic('help', 18), h('b', null, 'No viewer data'));
    const lang = S.rtab === 'languages';
    return shell(tabs(), h('section', { class: 'k-card' },
      h('div', { class: 'k-cardh' }, h('b', null, ic('doc'), ' Report'), iconBtn(ic('dl'), 'Print report', () => { log('click', 'Print report'); toastK("The browser's print window opens: save it as a PDF"); })),
      h('div', { class: 'k-report' },
        h('div', null, h('nav', { class: 'k-tabs' }, ...[['details', 'Details'], ['languages', 'Languages']].map(([k, l]) => h('button', { class: `k-tab ${(S.rtab || 'details') === k ? 'on' : ''}`, type: 'button', on: { click: () => { S.rtab = k; log('nav', `Report: ${l}`); draw(); } } }, l))),
          lang ? h('div', { class: 'k-rdet' }, h('small', { class: 'k-mini' }, m.kind === 'hi' ? 'Human interpretation' : 'Powered by KUDO AI'), h('ol', null, langs.map((l) => h('li', null, l))))
            : h('div', { class: 'k-rdet' }, ...[['Meeting Name', m.name], ['Description', '-'], ['Created By', 'Demo NDK'], ['Scheduled Date', dOf(m).date], ['Timezone', 'Brussels']].map(([k, v]) => h('div', null, h('small', null, k), h('div', null, v))))),
        h('div', { class: 'k-tiles' }, tile('Duration', 'clock', mins, 'minutes'), tile('Languages', 'lang', langs.length), tile('Users', 'users', users), tile('Polls', 'doc', m.polls.length), tile('Documents', 'doc', m.files.length), tile('Participants', 'user', m.participants.length))),
      h('h4', { class: 'k-subh' }, 'Attendees Details'), h('small', { class: 'k-mini' }, 'This section provides insights into the users who actively participated in the meeting such as Participants and Hosts.'),
      h('div', { class: 'k-grid3' }, panel('User Statistics', 'Overview of the Roles distribution.', pie()), panel('Browser Details', 'Web browser used by participants and hosts.', bars(['Chrome', 'Edge'])), panel('Operating Systems', 'Operating systems used by participants and hosts.', bars(['Windows', 'macOS']))),
      h('div', { class: 'k-grid2' }, panel('Regional Statistics', 'Geographical distribution of the people connected to the meeting.', map()), panel('Language Statistics', 'Languages used by participants and hosts based on the number of individuals that selected each language. Note that a single user could have selected multiple languages.', bars(['Floor', ...langs.slice(0, 2).map((l) => l.replace(/ \(.*\)$/, ''))]))),
      h('h4', { class: 'k-subh' }, 'Audience Details'), h('small', { class: 'k-mini' }, 'This section provides insights into the users who passively followed the meeting such as Viewers.'),
      h('div', { class: 'k-grid2' }, panel('Browser Details', 'Web browser used by viewers.', none()), panel('Operating Systems', 'Operating systems used by viewers.', none()), panel('Regional Statistics', 'Geographical distribution of the people connected to the meeting.', none()), panel('Language Statistics', 'Languages used by viewers based on the number of individuals that selected each language. Note that a single user could have selected multiple languages.', none()))));
  }

  // ---------------------------------------------------------------- hints, scoring, report
  function nextStep() {
    const m = S.mine, host = m?.participants.find((p) => p.email === HOST && p.role === 'Host');
    if (S.screen === 'login') return 'Log in: the account is filled in for you.';
    if (!m) return 'Create the meeting: New meeting, then AI speech translation.';
    if (m.kind !== 'ai') return 'This meeting is not an AI speech translation meeting: the client wants AI Translation.';
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
    const m = S.mine || { participants: [], translations: [], speakers: [] }, F = S.flags;
    const host = m.participants.find((p) => p.email === HOST && p.role === 'Host');
    const extra = m.translations.filter((l) => !['English (US)', 'English (UK)'].includes(l) && !fr(l) && !de(l) && !es(l));
    const checks = [
      ['AI speech & captions meeting created', !!S.mine && m.kind === 'ai' && m.type === 'speech', 8],
      [`Named "${NAME}"`, !!S.mine && m.name.toLowerCase().includes('quarterly partner update'), 4],
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
    if (F['locked_Speaker language']) traps.push(['Tried to change the speaker language while live (locked)', 3]);
    if ((F.removed || []).length) traps.push([`Removed a language (${F.removed.join(', ')})`, 4]);
    if (F.restartNoChange) traps.push(['Restarted the translation service with nothing to apply', 2]);
    if (S.events.some((e) => e.type === 'trap' && /Deleted/.test(e.what))) traps.push(['Deleted a user from the meeting', 3]);
    const detours = S.events.filter((e) => e.type === 'detour').length;
    const path = Math.max(0, 100 - detours * 6 - traps.reduce((t, x) => t + x[1], 0) * 3 - S.hints * 8);
    const secs = Math.round((Date.now() - S.t0) / 1000);
    const time = secs <= 300 ? 100 : secs >= 720 ? 0 : Math.round(100 - ((secs - 300) / 420) * 100);
    const total = Math.round(outcome * 0.7 + path * 0.2 + time * 0.1);
    return { total, outcome, path, time, secs, checks: checks.map(([label, ok, w]) => ({ label, ok, w })), traps: traps.map(([label]) => label), detours, hints: S.hints, actions: S.events.filter((e) => ['click', 'pick', 'input', 'toggle', 'choose', 'save', 'remove', 'change'].includes(e.type)).length };
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

  const SCREENS = { interpreters: interpretersScreen, broadcast: broadcastScreen, login: loginScreen, home: homeScreen, meetings: meetingsScreen, glossaries: glossariesScreen, usage: usageScreen, 'new-ai': () => formScreen('new'), 'new-hi': () => formScreen('new'), edit: () => formScreen('edit'), meeting: meetingScreen,
    users: () => usersScreen('all'), participants: () => usersScreen('participants'), operators: () => usersScreen('operators'), viewers: () => usersScreen('viewers'), polls: pollsScreen, 'poll-new': pollNewScreen, poll: pollScreen, files: filesScreen, messages: messagesScreen, recordings: recordingsScreen, av: avScreen, features: featuresScreen, mglossaries: mGlossariesScreen, stats: statsScreen };
  function draw() {
    root.querySelector('.sbx-url-t').textContent = url();
    app.replaceChildren(SCREENS[S.screen]());
  }
  app.addEventListener('click', (e) => {
    if (S.picker && !e.target.closest('.k-pick-wrap')) { S.picker = null; draw(); }
    if (S.menu && !e.target.closest('.k-tabw, .k-newwrap, .k-rel')) { S.menu = null; draw(); }
  });
  log('start', 'Sandbox opened');
  draw();
  return root;
}


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
