// The virtual coach: a chat panel on every trainee page. Answers come from the trainee's own data (server/coach.js).
// The conversation lives in this page only: it is not stored anywhere.
import { h, api } from './ui.js';
import { kudogPuppet, kudogFace } from './kudog.js';

const SUGGEST = ['What\'s next in my programme?', 'When is my next 1:1 with my KUDO Trainer?', 'When is the next group session, and what is the topic?', 'How is my score evaluated?', 'How have I progressed this month?', 'Where are my biggest gaps?'];

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

export function coachWidget() {
  const history = [];
  // KUDOG reacts: listening while you type, thinking while he looks it up, then happy, excited, concerned or a head tilt.
  let pets = [];
  const dog = kudogPuppet({ size: 84, label: 'Pet KUDOG', onPet: () => { const now = Date.now(); pets = [...pets.filter((x) => now - x < 4000), now]; if (pets.length >= 5) { pets = []; setTimeout(() => dog.mood('excited'), 300); } } });
  let napTimer = 0;
  const awake = () => { clearTimeout(napTimer); if (dog.state() === 'sleepy') dog.mood('idle'); napTimer = setTimeout(() => { if (open && !busy) dog.mood('sleepy'); }, 75000); };
  let open = false, busy = false, ai = false;
  api('GET', '/api/me/coach').then((r) => { ai = !!r.ai; }).catch(() => {});
  const log = h('div', { class: 'co-log', 'aria-live': 'polite' });
  const input = h('textarea', { rows: 1, placeholder: 'Ask about your programme, results or the Academy', maxlength: 500, 'aria-label': 'Your question',
    on: { keydown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input.value); } }, input: () => { awake(); if (!busy) dog.mood(input.value.trim() ? 'listening' : 'idle'); }, focus: () => awake(), blur: () => { if (!busy && dog.state() === 'listening' && !input.value.trim()) dog.mood('idle'); } } });
  const chips = h('div', { class: 'co-chips' }, SUGGEST.map((s) => h('button', { type: 'button', on: { click: () => send(s) } }, s)));
  const bubble = (role, text, links = []) => {
    const b = h('div', { class: `co-msg ${role}` }, ...(role === 'coach' ? rich(text) : [h('p', null, text)]),
      links.length ? h('div', { class: 'co-links' }, links.map((l) => h('a', { href: l.href, ...(l.href.startsWith('https') ? { target: '_blank', rel: 'noopener' } : {}), on: { click: (e) => { if (l.href === '#ask-trainer') { e.preventDefault(); toTrainer(l.prefill || ''); return; } if (l.href.startsWith('#') && window.innerWidth < 760) toggle(false); } } }, `${l.label}`))) : null);
    log.append(b); log.scrollTop = log.scrollHeight; return b;
  };
  async function send(q) {
    q = String(q || '').trim(); if (!q || busy) return;
    busy = true; input.value = ''; chips.hidden = true; awake(); dog.mood('thinking');
    bubble('me', q);
    const wait = h('div', { class: 'co-msg coach wait' }, h('i'), h('i'), h('i')); log.append(wait); log.scrollTop = log.scrollHeight;
    try {
      const r = await api('POST', '/api/me/coach', { message: q, history });
      wait.remove(); dog.mood(r.mood || 'happy'); bubble('coach', r.text, [...(r.links || []), ...(r.intent === 'help' || r.intent === 'trainer' ? [{ label: 'Ask your KUDO Trainer', href: '#ask-trainer', prefill: r.intent === 'help' ? q : '' }] : [])]);
      history.push({ role: 'me', text: q }, { role: 'coach', text: r.text });
    } catch (e) { wait.remove(); dog.mood(e.status === 429 ? 'sleepy' : 'concerned'); bubble('coach', e.message || 'Something went wrong. Try again in a moment.'); }
    busy = false; input.focus();
  }
  // ---- Your KUDO Trainer: send a question, remark or observation; see replies.
  let unread = 0;
  const kind = h('select', { 'aria-label': 'Type of message' }, h('option', { value: 'question' }, 'Question'), h('option', { value: 'remark' }, 'Remark'), h('option', { value: 'observation' }, 'Observation'));
  const msg = h('textarea', { rows: 4, maxlength: 2000, placeholder: 'Write to your KUDO Trainer. They see it on their board and reply here.', 'aria-label': 'Your message' });
  const mlist = h('div', { class: 'co-mlist' });
  const KLABEL = { question: 'Question', remark: 'Remark', observation: 'Observation' };
  const loadMsgs = async () => {
    const r = await api('GET', '/api/me/trainer-messages'); unread = r.unread; badge();
    mlist.replaceChildren(...(r.messages.length ? r.messages.map((m) => h('div', { class: `co-m ${m.status}` },
      h('div', { class: 'co-m-h' }, h('span', { class: 'chip grey' }, KLABEL[m.kind]), h('small', null, new Date(m.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })), h('span', { class: `chip ${m.status === 'open' ? 'amber' : 'green'}` }, m.status === 'open' ? 'Waiting' : m.status === 'answered' ? 'Answered' : 'Noted')),
      h('p', null, m.text), m.reply ? h('div', { class: 'co-reply' }, h('b', null, 'Your KUDO Trainer: '), m.reply) : null)) : [h('p', { class: 'muted small' }, 'No messages yet.')]));
  };
  const sendMsg = async () => {
    try { await api('POST', '/api/me/trainer-messages', { kind: kind.value, text: msg.value, page: location.hash.slice(1) }); msg.value = ''; toastIn('Sent. Your KUDO Trainer will reply here.'); loadMsgs(); } catch (e) { toastIn(e.message || 'Could not send'); }
  };
  const note = h('div', { class: 'co-note', hidden: true });
  const toastIn = (t) => { note.textContent = t; note.hidden = false; setTimeout(() => { note.hidden = true; }, 4000); };
  const trainerView = h('div', { class: 'co-trainer', hidden: true },
    h('div', { class: 'co-form' }, h('div', { class: 'row', style: 'gap:8px;align-items:center' }, h('small', null, 'Type'), kind), msg, note, h('button', { class: 'btn primary sm', type: 'button', on: { click: sendMsg } }, 'Send to your KUDO Trainer')),
    h('div', { class: 'co-mh' }, 'Your messages'), mlist);
  const coachView = h('div', { class: 'co-coach' }, log, chips,
    h('form', { class: 'co-in', on: { submit: (e) => { e.preventDefault(); send(input.value); } } }, input, h('button', { class: 'btn primary sm', type: 'submit' }, 'Ask')));
  const tabC = h('button', { type: 'button', class: 'on', on: { click: () => view('coach') } }, 'Coach');
  const tabT = h('button', { type: 'button', on: { click: () => view('trainer') } }, 'Your KUDO Trainer');
  function view(v) {
    tabC.classList.toggle('on', v === 'coach'); tabT.classList.toggle('on', v === 'trainer'); coachView.hidden = v !== 'coach'; trainerView.hidden = v !== 'trainer';
    if (v === 'trainer') { loadMsgs().then(() => { if (unread) api('POST', '/api/me/trainer-messages/seen').then(() => { unread = 0; badge(); }).catch(() => {}); }).catch(() => {}); setTimeout(() => msg.focus(), 50); }
  }
  function toTrainer(prefill) { view('trainer'); if (prefill) { msg.value = prefill; kind.value = 'question'; } }
  const panel = h('section', { class: 'co-panel', hidden: true, role: 'dialog', 'aria-label': 'KUDOG, your virtual coach', on: { pointermove: () => awake() } },
    h('header', null, h('div', { class: 'co-who' }, dog.el, h('div', null, h('b', null, 'KUDOG'), h('small', null, 'Your virtual coach. Answers from your own programme and results'))),
      h('button', { type: 'button', class: 'co-x', 'aria-label': 'Close', on: { click: () => toggle(false) } }, '×')),
    h('div', { class: 'co-tabs' }, tabC, tabT), coachView, trainerView);
  const badge = () => { fab.classList.toggle('has-new', unread > 0); tabT.textContent = unread ? `Your KUDO Trainer (${unread} new)` : 'Your KUDO Trainer'; };
  api('GET', '/api/me/trainer-messages').then((r) => { unread = r.unread; badge(); }).catch(() => {});
  const fab = h('button', { class: 'co-fab', type: 'button', 'aria-label': 'Ask KUDOG, your virtual coach', on: { click: () => { toggle(); if (unread) view('trainer'); } } }, h('span', { class: 'co-dot' }), kudogFace(), 'Ask KUDOG');
  fab.addEventListener('animationend', () => fab.classList.remove('kd-hop'));
  // Other pages cheer KUDOG on (a new card, a brag): he reacts in the panel, or hops on the button when it is closed.
  window.addEventListener('kudog', (e) => { if (open) dog.mood(e.detail); else { fab.classList.remove('kd-hop'); void fab.offsetWidth; fab.classList.add('kd-hop'); } });
  function toggle(v = !open) {
    open = v; panel.hidden = !open; fab.hidden = open;
    if (open) { dog.start(); awake(); dog.mood('happy'); } else { dog.stop(); clearTimeout(napTimer); }
    if (open && !log.children.length) bubble('coach', `Woof! I am KUDOG, your virtual coach. I can tell you what is next, when your sessions are, how you are progressing and how the Academy works.${ai ? ' Ask me anything about your programme.' : ' Pick a question or type your own.'} For anything else, write to your KUDO Trainer in the second tab.`);
    if (open) setTimeout(() => input.focus(), 50);
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && open) toggle(false); });
  return h('div', { class: 'co' }, panel, fab);
}
