// Tiny DOM helpers. Everything is built with textContent / attributes (never innerHTML) so data can never become markup.
export const metaRow = (parts) => h('span', { class: 'meta-row' }, parts.filter(Boolean).map((p) => h('span', null, p)));
export function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'on') for (const [ev, fn] of Object.entries(v)) el.addEventListener(ev, fn);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = !!v;
    else if (k === 'disabled') el.disabled = !!v;
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  // Empty table values read "None": shown quietly so the real figures stand out.
  if (tag === 'td' && el.childNodes.length === 1 && el.textContent === 'None') el.classList.add('none');
  // A labelled icon (a tick, a status mark) is announced as an image with that label.
  if (tag === 'span' && el.hasAttribute('aria-label') && !el.hasAttribute('role') && !el.textContent.trim()) el.setAttribute('role', 'img');
  return el;
}
export const svg = (markup) => { const t = document.createElement('template'); t.innerHTML = markup; const el = t.content.firstElementChild; if (el && el.tagName.toLowerCase() === 'svg' && !el.hasAttribute('aria-label') && !el.hasAttribute('role') && !el.querySelector('title')) el.setAttribute('aria-hidden', 'true'); return el; };

export async function api(method, url, body) {
  const res = await fetch(url, {
    method, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'academy' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  if (!res.ok) { const e = new Error(data?.error || 'Request failed'); e.status = res.status; e.code = data?.code; throw e; }
  return data;
}

// Confirmations fade after a few seconds; errors stay until dismissed so they can be read.
export function toast(msg, bad = false) {
  document.querySelectorAll('.toast.bad').forEach((x) => x.remove());
  const t = bad
    ? h('div', { class: 'toast bad', role: 'alert' }, h('span', null, msg), h('button', { type: 'button', class: 'toast-x', 'aria-label': 'Dismiss', on: { click: () => t.remove() } }, '×'))
    : h('div', { class: 'toast', role: 'status' }, msg);
  // On trainee pages KUDOG says it: his face leads every message.
  if (document.body.dataset.admin !== '1' || document.body.dataset.me === '1') t.prepend(h('i', { class: 'kd-face toast-face', 'aria-hidden': 'true', style: 'background-image:url(/kudog.webp)' }));
  document.body.append(t);
  if (!bad) setTimeout(() => t.remove(), 3200);
}

// Dialog: focus moves in, Tab stays inside, Escape or a click outside closes it, focus returns to the opener.
export function modal(title, bodyEl, { actions, cls = '', onClose } = {}) {
  const opener = document.activeElement;
  const close = () => { if (!ov.isConnected) return; ov.remove(); onClose?.(); document.removeEventListener('keydown', onKey, true); if (opener?.isConnected && opener.offsetParent !== null) opener.focus(); else document.querySelector('.acct-btn, #main')?.focus(); };
  const focusables = () => [...ov.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null);
  const onKey = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
    if (e.key !== 'Tab') return;
    const f = focusables(); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  };
  const ov = h('div', { class: 'overlay', on: { mousedown: (e) => { if (e.target === ov) close(); } } },
    h('div', { class: `modal ${cls}`, role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
      h('h2', null, title), bodyEl, actions ? h('div', { class: 'actions' }, actions(close)) : null));
  document.body.append(ov);
  document.addEventListener('keydown', onKey, true);
  ov.querySelector('input,select,textarea,button')?.focus();
  return close;
}

export const pct = (v, d = 0) => (v == null ? 'None' : `${Number(v).toFixed(d)}%`);
export const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0].toUpperCase()).join('');
export const fmtDate = (d) => {
  if (!d) return '';
  const x = new Date(String(d).length === 10 ? d + 'T00:00:00' : d);
  return Number.isNaN(x) ? '' : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};
export const dateOnly = (d) => (d ? String(d).slice(0, 10) : '');
export const KIND = { session: 'Team session', resource: 'Resource', one_to_one: '1:1 coaching', practice: 'Practice', checkpoint: 'Checkpoint' };
export const DELIVERY = { both: 'HI + AI', hi: 'Human Interpretation', ai: 'AI Translation' };

// Reading of live score vs self rating (same thresholds as the Q4 2026 update).
export function reading(self, live) {
  if (self == null || live == null) return null;
  const gap = live - self;
  if (gap >= 8) return { label: 'Under-rated', cls: 'green', gap };
  if (gap <= -5) return { label: 'Over-confident', cls: 'coral', gap };
  return { label: 'Accurate', cls: 'blue', gap };
}

export const ICON = {
  board: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="7" height="16" rx="1.5"/><rect x="14" y="4" width="7" height="10" rx="1.5"/></svg>',
  target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r=".8"/></svg>',
  inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13l2.5-7h11L20 13v5a1 1 0 01-1 1H5a1 1 0 01-1-1z"/><path d="M4 13h4.5l1.5 2.5h4l1.5-2.5H20"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5A1.5 1.5 0 016.5 3H19v15H6.5A1.5 1.5 0 005 19.5z"/><path d="M5 19.5A1.5 1.5 0 006.5 21H19"/></svg>',
  msg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 5h14v10H9l-4 4z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20V4M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/></svg>',
  trend: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-9"/><path d="M15 6h6v6"/></svg>',
  plan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14h4"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 5a3.5 3.5 0 010 7M18 14c2 .6 3.5 2.4 3.5 6"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 21V4M5 4h11l-2 4 2 4H5"/></svg>',
  upload: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/></svg>',
  key: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3M14 9l2 2"/></svg>',
  news: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h10A1.5 1.5 0 0 1 17 5.5V18a2 2 0 0 0 2 2H6a2 2 0 0 1-2-2z"/><path d="M17 8h2.5A1.5 1.5 0 0 1 21 9.5V18a2 2 0 0 1-2 2"/><path d="M8 8h5M8 12h5M8 16h3"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M12 8l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/></svg>',
  log: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h7"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  cross: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/></svg>',
};
export const icon = (name) => svg(ICON[name]);
export const mark = (ok) => h('span', { class: `mk ${ok ? 'ok' : 'no'}`, role: 'img', 'aria-label': ok ? 'Yes' : 'No' }, icon(ok ? 'check' : 'cross'));

// The Imports section: results and rosters, sessions and release notes share one menu entry and these tabs.
export function importsHead(active, desc, action = null) {
  const T = [['imports', 'Results & rosters'], ['sessions', 'Sessions'], ['releases', 'Release notes']];
  return [h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'Imports'), h('p', null, desc)), action),
    h('nav', { class: 'tabs', 'aria-label': 'What to import' }, T.map(([k, l]) => h('a', { href: `#${k}`, class: k === active ? 'on' : null, 'aria-current': k === active ? 'page' : null }, l)))];
}

/** An (i) that holds an explanation: shown on hover, focus or tap. Keeps sentences off the screen. */
export function tipI(text) { return h('span', { class: 'tip-i', tabindex: 0, role: 'note', 'aria-label': text, 'data-tip': text }, 'i'); }
/** Wordless pass: a card's descriptive sentence under its title moves into the (i) next to the title.
 *  Lines that carry numbers or status stay on screen; add class "keep" to keep any other line. */
export function quiet(root) {
  const run = () => root.querySelectorAll(':is(h2, h3) + p.sub:not([data-q])').forEach((p) => {
    p.dataset.q = '1'; const t = p.textContent.trim();
    if (!t || /\d/.test(t) || p.classList.contains('keep')) return;
    p.previousElementSibling.append(' ', tipI(t)); p.remove();
  });
  // Figure tiles: a note that is a baseline (has a number) or a status (no figure yet) stays; a note that only explains goes into the (i).
  const tiles = () => root.querySelectorAll('.kpi > .note:not([data-q]), .jm-fact > .jm-fs:not([data-q])').forEach((n) => {
    n.dataset.q = '1'; const t = n.textContent.trim(); const tile = n.parentElement;
    const v = tile.querySelector('.value, b')?.textContent.trim();
    if (!t || /\d/.test(t) || n.classList.contains('keep') || !v || v === 'None') return;
    tile.querySelector('.label, .jm-fk')?.append(' ', tipI(t)); n.remove();
  });
  const all = () => { run(); tiles(); };
  all(); new MutationObserver(all).observe(root, { childList: true, subtree: true });
}

// Phone layout for tables: each cell carries its column header as data-label, so CSS can stack a row as a card.
const labelTables = () => document.querySelectorAll('table.tbl').forEach((t) => {
  const heads = [...t.querySelectorAll('thead th')].map((th) => th.textContent.trim());
  if (!heads.length) return;
  t.querySelectorAll('tbody tr').forEach((tr) => [...tr.children].forEach((td, i) => { if (!td.hasAttribute('data-label')) td.setAttribute('data-label', heads[i] || ''); }));
});
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  let queued = false;
  new MutationObserver(() => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; labelTables(); }); }).observe(document.documentElement, { childList: true, subtree: true });
}
