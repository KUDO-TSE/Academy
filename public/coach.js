// KUDOG, the virtual coach: a chat panel on every trainee page. Answers come from the trainee's own data (server/coach.js).
// The conversation lives in this page only: it is not stored anywhere.
//
// Design (Nov 2026): a modern assistant panel. A welcome screen with KUDOG in 3D and suggestion cards; once the chat
// starts, KUDOG moves to the header as a live avatar. Messages stream in, each answer has its links as buttons and
// follow-up suggestions; a composer that grows with the text; a second tab to write to the KUDO Trainer.
// KUDOG is a three.js model (public/kudog3d.bundle.js, built from client-src/kudog3d.js), loaded when the panel first
// opens; without WebGL he falls back to the 2D puppet (kudog.js).
import { h, api, icon } from './ui.js';
import { kudog2D, kudogFace, kudogQuips } from './kudog.js';

const SUGGEST = [
  ['plan', 'What\'s next in my programme?'], ['user', 'When is my next 1:1 with my KUDO Trainer?'], ['team', 'When is the next group session, and what is the topic?'],
  ['chart', 'How is my score evaluated?'], ['trend', 'How have I progressed this month?'], ['target', 'Where are my biggest gaps?'],
];
const reduceMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const timeOf = (d = new Date()) => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const SVG = {
  send: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  expand: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
  shrink: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7"/></svg>',
  fresh: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>',
  down: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',
};
const ic = (k) => { const t = document.createElement('template'); t.innerHTML = SVG[k]; const s = t.content.firstElementChild; s.setAttribute('aria-hidden', 'true'); return s; };

// A small, safe renderer: lines, "- " bullets, **bold**, and links to pages in the app ("#...") or https links.
function rich(text) {
  const inline = (s) => {
    const out = []; const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(((?:#|https:\/\/)[^)\s]+)\)/g; let last = 0, m;
    while ((m = re.exec(s))) { if (m.index > last) out.push(s.slice(last, m.index)); out.push(m[1] ? h('b', null, m[1]) : h('a', { href: m[3], ...(m[3].startsWith('https') ? { target: '_blank', rel: 'noopener' } : {}) }, m[2])); last = re.lastIndex; }
    if (last < s.length) out.push(s.slice(last)); return out;
  };
  const blocks = []; let list = null;
  for (const line of String(text).split('\n')) {
    if (/^\s*[-•]\s+/.test(line)) { if (!list) { list = h('ul'); blocks.push(list); } list.append(h('li', null, ...inline(line.replace(/^\s*[-•]\s+/, '')))); continue; }
    list = null; if (line.trim()) blocks.push(h('p', null, ...inline(line)));
  }
  return blocks;
}
const plain = (text) => String(text).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

export function coachWidget({ name = '' } = {}) {
  const first = String(name).split(/[\s(]/)[0] || '';
  const history = [];
  let open = false, busy = false, ai = false, started = false, wide = false;
  api('GET', '/api/me/coach').then((r) => { ai = !!r.ai; welcomeSub.textContent = welcomeText(); }).catch(() => {});

  // ---- KUDOG himself: the 3D model when it loads, the 2D puppet otherwise.
  let pets = [];
  const onPet = () => { if (!started && !quips.busy()) quips.next(); const now = Date.now(); pets = [...pets.filter((x) => now - x < 4000), now]; if (pets.length >= 5) { pets = []; setTimeout(() => dog.mood('excited'), 300); } };
  let dog = { el: h('div', { class: 'kg-dog-wait' }, kudogFace()), mood() {}, state: () => 'idle', start() {}, stop() {} };
  let dogReady = null;
  const loadDog = () => dogReady || (dogReady = (async () => {
    let d;
    try { const mod = await import('/kudog3d.bundle.js'); d = mod.createKudog3D({ label: 'KUDOG, your virtual coach. Click to pet him.', onPet }); await d.ready; }
    catch { d = kudog2D({ size: 160, label: 'Pet KUDOG', onPet }); d.el.classList.add('kg-2d'); }
    dog.el.replaceWith(d.el); dog = d; if (open) { dog.start(); dog.mood(busy ? 'thinking' : 'happy'); }
  })());
  let napTimer = 0;
  const awake = () => { clearTimeout(napTimer); if (dog.state() === 'sleepy') dog.mood('idle'); napTimer = setTimeout(() => { if (open && !busy) dog.mood('sleepy'); }, 75000); };

  // ---- Coach tab
  const welcomeText = () => `I know your programme, your results and your sessions. ${ai ? 'Ask me anything about the Academy and your training.' : 'Pick a question or type your own.'} For anything else, write to your KUDO Trainer.`;
  const welcomeSub = h('p', null, welcomeText());
  const stage = h('div', { class: 'kg-stage' }, dog.el);
  // Now and then, while the welcome screen shows, KUDOG cracks a joke in a bubble (petting him asks for the next one).
  const quips = kudogQuips(stage, { bark: () => dog.mood('bark') });
  let quipTimer = 0;
  const quipLoop = (ms) => { clearTimeout(quipTimer); quipTimer = setTimeout(() => { if (open && !started && !busy) quips.next(); quipLoop(30000); }, ms); };
  const welcome = h('div', { class: 'kg-welcome' }, stage,
    h('h2', null, first ? `Hi ${first}, I'm KUDOG` : 'Hi, I\'m KUDOG'), welcomeSub,
    h('div', { class: 'kg-sugg' }, SUGGEST.map(([k, q]) => h('button', { type: 'button', on: { click: () => send(q) } }, h('span', { class: 'kg-sugg-i' }, icon(k)), h('span', null, q)))));
  const log = h('div', { class: 'kg-log', role: 'log', 'aria-live': 'polite', 'aria-label': 'Conversation with KUDOG' });
  const scroller = h('div', { class: 'kg-scroll' }, welcome, log);
  const downBtn = h('button', { type: 'button', class: 'kg-down', hidden: true, 'aria-label': 'Scroll to the latest message', on: { click: () => toBottom(true) } }, ic('down'));
  const nearBottom = () => scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 80;
  const toBottom = (smooth) => { pinned = true; scroller.scrollTo({ top: scroller.scrollHeight, behavior: smooth && !reduceMotion() ? 'smooth' : 'auto' }); };
  // Follow the conversation unless the trainee scrolls up to read; the arrow brings them back.
  let pinned = true;
  scroller.addEventListener('scroll', () => { downBtn.hidden = nearBottom(); });
  ['wheel', 'touchmove', 'keydown'].forEach((ev) => scroller.addEventListener(ev, () => setTimeout(() => { pinned = nearBottom(); }, 60), { passive: true }));

  const input = h('textarea', { rows: 1, placeholder: 'Ask KUDOG anything about your programme', maxlength: 500, 'aria-label': 'Your question',
    on: { keydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } }, input: () => { grow(input); awake(); sendBtn.disabled = !input.value.trim() || busy; count.textContent = input.value.length > 400 ? `${input.value.length} / 500` : ''; if (!busy) dog.mood(input.value.trim() ? 'listening' : 'idle'); }, focus: () => awake(), blur: () => { if (!busy && dog.state() === 'listening' && !input.value.trim()) dog.mood('idle'); } } });
  const grow = (ta) => { ta.style.height = 'auto'; ta.style.height = `${Math.min(140, ta.scrollHeight)}px`; ta.style.overflowY = ta.scrollHeight > 140 ? 'auto' : 'hidden'; };
  const sendBtn = h('button', { type: 'submit', class: 'kg-send', disabled: true, 'aria-label': 'Send' }, ic('send'));
  const count = h('span', { class: 'kg-count' });
  const follow = h('div', { class: 'kg-follow', hidden: true });
  const composer = h('form', { class: 'kg-composer', on: { submit: (e) => { e.preventDefault(); send(input.value); } } },
    follow, h('div', { class: 'kg-box' }, input, sendBtn), h('div', { class: 'kg-hint' }, h('span', null, 'Enter to send, Shift and Enter for a new line'), count));

  const asked = new Set();
  const avatar = () => h('span', { class: 'kg-av', 'aria-hidden': 'true' }, kudogFace());
  function row(role, content, { links = [], text = '' } = {}) {
    const bubble = h('div', { class: 'kg-bubble' }, ...content);
    const tools = role === 'coach' ? h('div', { class: 'kg-tools' }, h('time', null, timeOf()), text ? h('button', { type: 'button', class: 'kg-copy', 'aria-label': 'Copy the answer', on: { click: async (e) => { try { await navigator.clipboard.writeText(plain(text)); e.currentTarget.classList.add('done'); e.currentTarget.lastChild.textContent = 'Copied'; } catch { /* clipboard off */ } } } }, ic('copy'), h('span', null, 'Copy')) : null) : h('div', { class: 'kg-tools' }, h('time', null, timeOf()));
    const linkRow = links.length ? h('div', { class: 'kg-links' }, links.map((l) => h('a', { href: l.href, class: 'kg-link', ...(l.href.startsWith('https') ? { target: '_blank', rel: 'noopener' } : {}), on: { click: (e) => { if (l.href === '#ask-trainer') { e.preventDefault(); toTrainer(l.prefill || ''); return; } if (l.href.startsWith('#') && window.innerWidth < 760) toggle(false); } } }, l.label))) : null;
    const r = h('div', { class: `kg-row ${role}` }, role === 'coach' ? avatar() : null, h('div', { class: 'kg-col' }, bubble, linkRow, tools));
    log.append(r); return { r, bubble, linkRow };
  }
  function startChat() {
    if (started) return; started = true; panel.classList.add('has-chat'); quips.clear();
    headAv.append(dog.el); // KUDOG moves from the welcome screen to the header
  }
  // Answers appear word by word (instantly when the device asks for reduced motion), then take their final format.
  function stream(bubble, text) {
    return new Promise((done) => {
      const words = plain(text).split(/(\s+)/); if (reduceMotion() || words.length < 6) { bubble.replaceChildren(...rich(text)); done(); return; }
      const p = h('p', { class: 'kg-typing' }); bubble.replaceChildren(p); let i = 0;
      const tick = () => { i = Math.min(words.length, i + 3); p.textContent = words.slice(0, i).join(''); if (pinned) scroller.scrollTop = scroller.scrollHeight; if (i < words.length) setTimeout(tick, 22); else { bubble.replaceChildren(...rich(text)); done(); } };
      tick();
    });
  }
  function showFollow() {
    const left = SUGGEST.filter(([, q]) => !asked.has(q)).slice(0, 3);
    follow.replaceChildren(...left.map(([, q]) => h('button', { type: 'button', on: { click: () => send(q) } }, q)));
    follow.hidden = !left.length;
  }
  async function send(q) {
    q = String(q || '').trim(); if (!q || busy) return;
    startChat(); busy = true; asked.add(q); input.value = ''; grow(input); sendBtn.disabled = true; count.textContent = ''; follow.hidden = true; awake(); dog.mood('thinking');
    row('me', [h('p', null, q)]); toBottom(false);
    const wait = row('coach', [h('span', { class: 'kg-dots', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', { class: 'kg-wait' }, 'KUDOG is looking it up')]);
    wait.r.classList.add('is-wait'); toBottom(false);
    try {
      const r = await api('POST', '/api/me/coach', { message: q, history });
      wait.r.remove();
      const links = [...(r.links || []), ...(r.intent === 'help' || r.intent === 'trainer' ? [{ label: 'Ask your KUDO Trainer', href: '#ask-trainer', prefill: r.intent === 'help' ? q : '' }] : [])];
      const m = row('coach', [], { links, text: r.text }); if (m.linkRow) m.linkRow.hidden = true;
      dog.mood(r.mood || 'happy');
      await stream(m.bubble, r.text); if (m.linkRow) m.linkRow.hidden = false;
      history.push({ role: 'me', text: q }, { role: 'coach', text: r.text });
    } catch (e) { wait.r.remove(); dog.mood(e.status === 429 ? 'sleepy' : 'concerned'); row('coach', rich(e.message || 'Something went wrong. Try again in a moment.')); }
    busy = false; sendBtn.disabled = !input.value.trim(); showFollow(); if (pinned) scroller.scrollTop = scroller.scrollHeight; input.focus();
  }
  function newChat() {
    history.length = 0; asked.clear(); log.replaceChildren(); follow.hidden = true; started = false; panel.classList.remove('has-chat');
    stage.append(dog.el); dog.mood('happy'); scroller.scrollTop = 0; input.focus();
  }

  // ---- KUDO Trainer tab: a thread of the trainee's messages and the trainer's replies, and a composer.
  let unread = 0, kindSel = 'question';
  const KLABEL = { question: 'Question', remark: 'Remark', observation: 'Observation' };
  const thread = h('div', { class: 'kg-thread' });
  const kinds = h('div', { class: 'kg-kinds', role: 'radiogroup', 'aria-label': 'Type of message' }, Object.entries(KLABEL).map(([k, l]) => h('button', { type: 'button', role: 'radio', 'aria-checked': String(k === kindSel), on: { click: (e) => { kindSel = k; kinds.querySelectorAll('button').forEach((b) => b.setAttribute('aria-checked', String(b === e.currentTarget))); } } }, l)));
  const msg = h('textarea', { rows: 2, maxlength: 2000, placeholder: 'Write to your KUDO Trainer. They see it on their board and reply here.', 'aria-label': 'Your message to your KUDO Trainer', on: { input: () => { grow(msg); msgBtn.disabled = !msg.value.trim(); } } });
  const msgBtn = h('button', { type: 'submit', class: 'kg-send', disabled: true, 'aria-label': 'Send to your KUDO Trainer' }, ic('send'));
  const note = h('div', { class: 'kg-note', role: 'status' });
  const loadMsgs = async () => {
    const r = await api('GET', '/api/me/trainer-messages'); unread = r.unread; badge();
    thread.replaceChildren(...(r.messages.length ? [...r.messages].reverse().flatMap((m) => [
      h('div', { class: 'kg-row me' }, h('div', { class: 'kg-col' }, h('div', { class: 'kg-bubble' }, h('span', { class: 'kg-kind' }, KLABEL[m.kind]), h('p', null, m.text)),
        h('div', { class: 'kg-tools' }, h('time', null, new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })), h('span', { class: `kg-st ${m.status}` }, m.status === 'open' ? 'Waiting for a reply' : m.status === 'answered' ? 'Answered' : 'Seen')))),
      m.reply ? h('div', { class: 'kg-row trainer' }, h('span', { class: 'kg-av t', 'aria-hidden': 'true' }, 'KT'), h('div', { class: 'kg-col' }, h('div', { class: 'kg-bubble' }, h('span', { class: 'kg-kind' }, 'Your KUDO Trainer'), h('p', null, m.reply)))) : null,
    ].filter(Boolean)) : [h('div', { class: 'kg-empty' }, h('b', null, 'No messages yet'), h('p', null, 'Ask a question, share a remark or something you noticed with a client. Your KUDO Trainer replies here.'))]));
    tScroll.scrollTop = tScroll.scrollHeight;
  };
  const sendMsg = async () => {
    if (!msg.value.trim()) return;
    try { await api('POST', '/api/me/trainer-messages', { kind: kindSel, text: msg.value, page: location.hash.slice(1) }); msg.value = ''; grow(msg); msgBtn.disabled = true; flash('Sent. Your KUDO Trainer will reply here.'); loadMsgs(); } catch (e) { flash(e.message || 'Could not send'); }
  };
  const flash = (t) => { note.textContent = t; note.classList.add('on'); setTimeout(() => note.classList.remove('on'), 4000); };
  const tScroll = h('div', { class: 'kg-scroll' }, h('div', { class: 'kg-t-intro' }, h('b', null, 'Your KUDO Trainer'), h('p', null, 'For anything KUDOG cannot answer: a question, a remark or an observation. Replies come back here.')), thread);
  const trainerView = h('div', { class: 'kg-view kg-trainer', hidden: true }, tScroll,
    h('form', { class: 'kg-composer', on: { submit: (e) => { e.preventDefault(); sendMsg(); } } }, note, kinds, h('div', { class: 'kg-box' }, msg, msgBtn)));
  const coachView = h('div', { class: 'kg-view kg-coach' }, scroller, downBtn, composer);

  // ---- Panel
  const tabC = h('button', { type: 'button', role: 'tab', 'aria-selected': 'true', on: { click: () => view('coach') } }, 'Ask KUDOG');
  const tabBadge = h('span', { class: 'kg-badge', hidden: true });
  const tabT = h('button', { type: 'button', role: 'tab', 'aria-selected': 'false', on: { click: () => view('trainer') } }, 'KUDO Trainer', tabBadge);
  function view(v) {
    tabC.setAttribute('aria-selected', String(v === 'coach')); tabT.setAttribute('aria-selected', String(v === 'trainer'));
    coachView.hidden = v !== 'coach'; trainerView.hidden = v !== 'trainer'; panel.dataset.view = v;
    if (v === 'trainer') { loadMsgs().then(() => { if (unread) api('POST', '/api/me/trainer-messages/seen').then(() => { unread = 0; badge(); }).catch(() => {}); }).catch(() => {}); setTimeout(() => msg.focus(), 50); }
    else setTimeout(() => input.focus(), 50);
  }
  function toTrainer(prefill) { view('trainer'); if (prefill) { msg.value = prefill; grow(msg); msgBtn.disabled = false; kindSel = 'question'; kinds.querySelectorAll('button').forEach((b, i) => b.setAttribute('aria-checked', String(i === 0))); } }
  const headAv = h('div', { class: 'kg-head-av' });
  const wideBtn = h('button', { type: 'button', class: 'kg-ibtn', 'aria-label': 'Larger window', title: 'Larger window', on: { click: () => { wide = !wide; panel.classList.toggle('is-wide', wide); wideBtn.replaceChildren(ic(wide ? 'shrink' : 'expand')); wideBtn.setAttribute('aria-label', wide ? 'Smaller window' : 'Larger window'); wideBtn.title = wideBtn.getAttribute('aria-label'); } } }, ic('expand'));
  const panel = h('section', { class: 'kg-panel', hidden: true, role: 'dialog', 'aria-label': 'KUDOG, your virtual coach', 'data-view': 'coach', on: { pointermove: () => awake() } },
    h('header', { class: 'kg-head' }, headAv,
      h('div', { class: 'kg-id' }, h('b', null, 'KUDOG'), h('span', { class: 'kg-status' }, h('i', { 'aria-hidden': 'true' }), 'Online, knows your programme')),
      h('div', { class: 'kg-actions' },
        h('button', { type: 'button', class: 'kg-ibtn', 'aria-label': 'New conversation', title: 'New conversation', on: { click: () => { view('coach'); newChat(); } } }, ic('fresh')),
        wideBtn,
        h('button', { type: 'button', class: 'kg-ibtn', 'aria-label': 'Close', title: 'Close', on: { click: () => toggle(false) } }, ic('close')))),
    h('div', { class: 'kg-tabs', role: 'tablist' }, tabC, tabT),
    coachView, trainerView);
  const badge = () => { fab.classList.toggle('has-new', unread > 0); tabBadge.hidden = !unread; tabBadge.textContent = String(unread); };
  api('GET', '/api/me/trainer-messages').then((r) => { unread = r.unread; badge(); }).catch(() => {});
  const fab = h('button', { class: 'kg-fab co-fab', type: 'button', 'aria-label': 'Ask KUDOG, your virtual coach', on: { click: () => { toggle(); if (unread) view('trainer'); } } }, h('span', { class: 'co-dot' }), kudogFace(), h('span', null, 'Ask KUDOG'));
  fab.addEventListener('animationend', () => fab.classList.remove('kd-hop'));
  // Other pages cheer KUDOG on (a new card, a brag): he reacts in the panel, or hops on the button when it is closed.
  window.addEventListener('kudog', (e) => { if (open) dog.mood(e.detail); else { fab.classList.remove('kd-hop'); void fab.offsetWidth; fab.classList.add('kd-hop'); } });
  function toggle(v = !open) {
    open = v; panel.hidden = !open; fab.hidden = open;
    if (open) { loadDog(); dog.start(); awake(); dog.mood('happy'); quipLoop(3200); setTimeout(() => (panel.dataset.view === 'trainer' ? msg : input).focus(), 60); }
    else { dog.stop(); clearTimeout(napTimer); clearTimeout(quipTimer); quips.clear(); }
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) toggle(false); });
  return h('div', { class: 'kg co' }, panel, fab);
}
