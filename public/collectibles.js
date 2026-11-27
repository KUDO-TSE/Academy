// Collectibles: the trainee's card collection, the card art (original, drawn in code) and the reveal when a new
// card is earned. Cards reward real milestones; locked cards show exactly how to earn them.
import { h, api, svg, modal } from './ui.js';

const SET = { Journey: ['var(--primary-600)', 'var(--primary)'], Scenarios: ['var(--primary)', 'var(--teal)'], Topics: ['var(--c-24566b)', 'var(--c-3e8fa8)'], 'Hands-on': ['var(--c-1f6b4e)', 'var(--c-38a06f)'], Craft: ['var(--c-b8492a)', 'var(--coral)'], Habit: ['var(--c-b8860b)', 'var(--amber)'] };
const TIER = { bronze: ['var(--c-c07a45)', 'Bronze'], silver: ['var(--c-b9c4cb)', 'Silver'], gold: ['var(--c-f2c94c)', 'Gold'] };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Simple line glyphs on a 24 by 24 grid (white strokes). Generic symbols only: no product or company logos.
const G = {
  flag: '<path d="M6 21V4M6 4h11l-2.5 4L17 12H6"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6"/>',
  build: '<rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/><rect x="8.5" y="5" width="7" height="7" rx="1"/>',
  broaden: '<circle cx="12" cy="12" r="2.5"/><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.5 5.5l3 3M15.5 15.5l3 3M5.5 18.5l3-3M15.5 8.5l3-3"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 01-8 0V4zM8 6H5a3 3 0 003 4M16 6h3a3 3 0 01-3 4M12 13v4M8.5 20h7M10 17h4"/>',
  handshake: '<path d="M3 11l4-4 4 3 3-2 7 4M7 7l-3 6 5 5 2-1 2 2 3-1 3-4M11 14l2 2M13 12l2 2"/>',
  cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5zM6.5 11.5V16c1.5 1.5 3.5 2 5.5 2s4-.5 5.5-2v-4.5M21 9.5v5"/>',
  step: '<path d="M8 14c-2 0-3-2-3-5s1-5 3-5 3 2 3 5-1 5-3 5zM6.5 17h3M16 20c-2 0-3-2-3-5s1-5 3-5 3 2 3 5-1 5-3 5z"/>',
  compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21M8.5 21h7"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.6"/>',
  loop: '<path d="M4 12a8 8 0 0113.7-5.6M20 12a8 8 0 01-13.7 5.6M17.7 3v3.4h-3.4M6.3 21v-3.4h3.4"/>',
  people: '<circle cx="8.5" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.5"/><path d="M3 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5M14 14.5c3 0 6 1.5 6 4.5"/>',
  bulb: '<path d="M9 17h6M10 20h4M12 3a6 6 0 00-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0012 3z"/>',
  cal3: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><text x="12" y="18" font-size="7" font-weight="800" fill="var(--white)" stroke="none" text-anchor="middle">3</text>',
  cal6: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><text x="12" y="18" font-size="7" font-weight="800" fill="var(--white)" stroke="none" text-anchor="middle">6</text>',
  cal10: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><text x="12" y="18" font-size="6.5" font-weight="800" fill="var(--white)" stroke="none" text-anchor="middle">10</text>',
  cursor: '<path d="M5 3l12 6-5 1.6L10 16z"/><path d="M12 11l5 5"/><rect x="13" y="15" width="7" height="6" rx="1"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8 12.5l2.8 2.8L16.5 9"/>',
  stopwatch: '<circle cx="12" cy="13.5" r="7.5"/><path d="M12 13.5V9.5M10 3h4M12 3v3M18 7l1.5-1.5"/>',
  diamond: '<path d="M6 4h12l3 5-9 11L3 9zM3 9h18M9 4l-2 5 5 11 5-11-2-5"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M14 16.5l2 2 4-4"/>',
  pencil: '<path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3"/>',
  trend: '<path d="M3 17l6-6 4 4 7-8M15 7h5v5"/>',
  'tp-foundations': '<path d="M3 20h18M5 20V10M10 20V10M14 20V10M19 20V10M2.5 10L12 4l9.5 6z"/>',
  'tp-glossary': '<path d="M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3zM5 17a3 3 0 013-3h11M9 8h6"/>',
  'tp-network': '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
  'tp-marketplace': '<path d="M4 9l1.5-5h13L20 9M4 9h16v11H4zM4 9c0 1.7 1.3 3 3 3s3-1.3 3-3c0 1.7 1.3 3 2 3s3-1.3 3-3c0 1.7 1.3 3 2.5 3S20 10.7 20 9M10 20v-5h4v5"/>',
  'tp-ringcentral': '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5V8M12 16v4.5"/>',
  'sc-teams': '<path d="M4 5h11v8H9l-3 3v-3H4zM15 9h5v7h-1.5v2.5L16 16h-4v-3"/>',
  'sc-onsite': '<rect x="4" y="4" width="6" height="6"/><rect x="14" y="4" width="6" height="6"/><rect x="4" y="14" width="6" height="6"/><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2"/>',
  'sc-zoom': '<rect x="3" y="7" width="12" height="10" rx="2"/><path d="M15 11l6-3.5v9L15 13"/>',
  'sc-hybrid': '<path d="M6 4v16M12 4v16M18 4v16"/><rect x="4" y="13" width="4" height="3" rx="1"/><rect x="10" y="7" width="4" height="3" rx="1"/><rect x="16" y="11" width="4" height="3" rx="1"/>',
  'sc-platform': '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4M7 9h5M7 12h8"/>',
  'sc-widget': '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18"/><rect x="13" y="11" width="5" height="6" rx="1"/><path d="M6 12h4M6 15h4"/>',
  'sc-external': '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 3.5 5.5 3.5 8.5s-1 6-3.5 8.5M12 3.5C9.5 6 8.5 9 8.5 12s1 6 3.5 8.5"/>',
  'sc-meetnow': '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3M10 7.5h4M10 10.5h4"/>',
  'sc-rtmp': '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9l5 3-5 3z"/>',
  'sc-hls': '<circle cx="12" cy="13" r="1.8"/><path d="M8.5 9.5a5 5 0 000 7M15.5 9.5a5 5 0 010 7M5.5 6.5a9 9 0 000 13M18.5 6.5a9 9 0 010 13"/>',
  'sc-hi': '<path d="M4 15v-3a8 8 0 0116 0v3"/><rect x="3" y="14" width="4.5" height="6" rx="1.5"/><rect x="16.5" y="14" width="4.5" height="6" rx="1.5"/>',
  'sc-ai': '<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6zM17.5 13l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/>',
};

/** One card as SVG. Earned cards are in colour; locked cards are grey, with a lock. */
export function cardArt(c, { earned = c.earned, size = 168 } = {}) {
  const [c1, c2] = earned ? SET[c.set] : ['var(--ink-400)', 'var(--c-c8d1d6)'];
  const [ring] = earned ? TIER[c.tier] : ['var(--border)'];
  const id = `g${c.key.replace(/[^a-z0-9]/gi, '')}${earned ? 'e' : 'l'}`;
  const title = c.title.length > 20 ? `${c.title.slice(0, 19)}…` : c.title;
  const sparkle = earned && c.tier === 'gold' ? '<path d="M128 26l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="var(--white)" opacity=".9"/><path d="M30 56l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4z" fill="var(--white)" opacity=".7"/>' : '';
  return svg(`<svg viewBox="0 0 160 214" width="${size}" height="${Math.round(size * 214 / 160)}" role="img" aria-label="${esc(c.title)}${earned ? '' : ' (locked)'}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
    <rect x="3" y="3" width="154" height="208" rx="16" fill="url(#${id})" stroke="${ring}" stroke-width="5"/>
    <rect x="12" y="12" width="136" height="190" rx="11" fill="none" stroke="var(--white)" stroke-opacity=".22"/>
    <text x="20" y="32" font-size="11" font-weight="700" fill="var(--white)" fill-opacity=".9">${esc(c.set)}</text>
    <circle cx="80" cy="92" r="40" fill="var(--white)" fill-opacity="${earned ? 0.16 : 0.25}" stroke="${ring}" stroke-width="3"/>
    <g transform="translate(56 68) scale(2)" fill="none" stroke="var(--white)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" opacity="${earned ? 1 : 0.55}">${G[c.glyph] || G.spark}</g>
    ${earned ? '' : '<g transform="translate(104 116)"><circle r="13" fill="var(--ink-500)"/><rect x="-6" y="-2" width="12" height="9" rx="2" fill="var(--white)"/><path d="M-3.5 -2v-3a3.5 3.5 0 017 0v3" fill="none" stroke="var(--white)" stroke-width="2"/></g>'}
    <text x="80" y="160" font-size="15" font-weight="800" fill="var(--white)" text-anchor="middle">${esc(title)}</text>
    <rect x="52" y="174" width="56" height="18" rx="9" fill="${ring}"/><text x="80" y="186.5" font-size="11" font-weight="700" fill="${earned && c.tier !== 'silver' ? 'var(--ink-900)' : 'var(--ink-900)'}" text-anchor="middle">${earned ? TIER[c.tier][1] : 'Locked'}</text>
    ${sparkle}
  </svg>`);
}

const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** The "My collection" page. */
export async function collectionView() {
  const d = await api('GET', '/api/me/collectibles');
  const sets = ['Journey', 'Scenarios', 'Topics', 'Hands-on', 'Craft', 'Habit'];
  const intro = { Journey: 'Milestones of your 12 weeks. "First step" is yours from your first connection; every other card is earned by working in the Academy.', Scenarios: 'One card per client scenario: reach your target level (October assessment and Academy tests combined) with at least one lesson, test or sandbox exercise on it in the Academy.', Topics: 'One card per cross-cutting module: reach your target on its module test, first attempt.', 'Hands-on': 'Sandbox exercises on the replica of the KUDO screens: finish them, pass them, then do them fast and flawless.', Craft: 'Work done well: tests, decisions, explanations, honest judgement, progress.', Habit: 'Steady practice over the 12 weeks.' };
  const pct = Math.round((d.earned / d.total) * 100);
  const page = h('div', { class: 'page' },
    h('div', { class: 'page-head' }, h('div', null, h('h1', null, 'My collection'), h('p', null, 'Cards you earn at real milestones of your programme. They are yours to keep: none can be lost, and nobody else sees your collection unless you brag about a card.'))),
    h('div', { class: 'card coll-head' }, h('div', { class: 'coll-count' }, h('b', null, d.earned), h('span', null, ` of ${d.total} collected`)), h('div', { class: 'ph-bar', style: 'flex:1' }, h('i', { style: `width:${pct}%` })),
      h('div', { class: 'muted small' }, `${d.cards.filter((c) => c.set === 'Scenarios' && c.earned).length} of 12 scenario cards`)),
    sets.map((s) => h('section', { class: 'coll-set' }, h('h2', null, s), h('p', { class: 'sub' }, intro[s]),
      h('div', { class: 'coll-grid' }, d.cards.filter((c) => c.set === s).map((c) => h('div', { class: `coll-card ${c.earned ? 'earned' : 'locked'}`, tabindex: 0 },
        cardArt(c), h('div', { class: 'coll-meta' }, c.earned ? [h('span', { class: 'muted small' }, `Earned ${fmt(c.earned_at)}`, c.live ? ', kept while every new exercise is passed' : ''), rarityLine(c), d.brag?.on && !c.bragged ? h('button', { type: 'button', class: 'link-btn brag-link', on: { click: (e) => bragModal(c, d.brag, e.currentTarget) } }, 'Brag to the team') : c.bragged ? h('span', { class: 'muted small' }, ' Bragged.') : null] : [h('span', { class: 'small' }, h('b', null, 'How to earn: '), c.earn, c.progress ? h('div', { class: 'muted small' }, c.progress) : null), rarityLine(c)])))))));
  if (d.cards.some((c) => c.isNew)) api('POST', '/api/me/collectibles/seen').catch(() => {});
  return page;
}

/** A small strip for the bottom of Home: progress and the latest cards. */
export function collectionStrip() {
  const box = h('div');
  (async () => {
    const d = await api('GET', '/api/me/collectibles');
    const latest = d.cards.filter((c) => c.earned).sort((a, b) => new Date(b.earned_at) - new Date(a.earned_at)).slice(0, 4);
    const next = d.cards.filter((c) => !c.earned && c.set !== 'Habit').slice(0, 1)[0];
    box.replaceChildren(h('div', { class: 'card coll-strip' },
      h('div', null, h('h2', null, 'Your collection'), h('p', { class: 'sub', style: 'margin:2px 0 8px' }, `${d.earned} of ${d.total} cards collected.${next ? ` Next up: ${next.title} (${next.earn.replace(/\.$/, '').toLowerCase()}).` : ''}`),
        h('a', { class: 'btn sm', href: '#collection' }, 'See all cards')),
      h('div', { class: 'coll-mini' }, latest.map((c) => cardArt(c, { size: 84 })))));
  })().catch(() => {});
  return box;
}

/** After each page: if a new card was earned, reveal it. */
let revealing = false;
export async function revealNew() {
  if (revealing) return; revealing = true;
  try {
    const d = await api('GET', '/api/me/collectibles');
    const fresh = d.cards.filter((c) => c.isNew);
    if (!fresh.length) return;
    await api('POST', '/api/me/collectibles/seen');
    let i = 0;
    const stage = h('div', { class: 'reveal-stage' });
    const ov = h('div', { class: 'overlay reveal', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'New card collected' }, h('div', { class: 'modal reveal-box' }, stage));
    const close = () => { ov.remove(); window.removeEventListener('hashchange', close); };
    window.addEventListener('hashchange', close);
    const show = () => {
      const c = fresh[i];
      const flip = h('div', { class: 'flip' }, h('div', { class: 'flip-in' }, h('div', { class: 'flip-back' }, cardArt({ ...c, title: '?', glyph: 'spark' }, { earned: false, size: 200 })), h('div', { class: 'flip-front' }, cardArt(c, { earned: true, size: 200 }))));
      stage.replaceChildren(
        h('div', { class: 'reveal-k' }, fresh.length > 1 ? `New card ${i + 1} of ${fresh.length}` : 'New card collected'),
        flip, confetti(),
        h('h2', null, c.title), h('p', { class: 'muted' }, h('b', null, 'Earned for: '), c.earn), rarityLine(c),
        h('div', { class: 'row', style: 'justify-content:center;gap:8px;margin-top:8px' },
          i < fresh.length - 1 ? h('button', { class: 'btn primary', on: { click: () => { i++; show(); } } }, 'Next card') : h('button', { class: 'btn primary', on: { click: close } }, 'Keep going'),
          h('a', { class: 'btn', href: '#collection', on: { click: close } }, 'My collection')),
        d.brag?.on && !c.bragged ? bragPanel(c, d.brag) : null);
      requestAnimationFrame(() => setTimeout(() => flip.classList.add('on'), 120));
    };
    document.body.append(ov); show(); window.dispatchEvent(new CustomEvent('kudog', { detail: 'excited' }));
  } catch { /* never block the page */ } finally { revealing = false; }
}
function confetti() {
  const cols = ['var(--coral)', 'var(--amber)', 'var(--teal)', 'var(--c-2f7a45)', 'var(--primary)'];
  return h('div', { class: 'confetti', 'aria-hidden': 'true' }, Array.from({ length: 26 }, (_, k) => h('i', { style: `left:${(k * 37) % 100}%;background:${cols[k % cols.length]};animation-delay:${(k % 7) * 0.06}s;transform:rotate(${k * 29}deg)` })));
}

/** Brag to the team: a playful Slack post about one card. The trainee sees the exact message before it goes out. */
export function bragPanel(c, brag, { onDone } = {}) {
  const where = brag.channel ? `#${brag.channel.replace(/^#/, '')}` : 'the team channel';
  let line = Math.floor(Math.random() * (brag.lines || 1));
  const box = h('div', { class: 'brag' });
  const note = h('input', { type: 'text', maxlength: 140, 'aria-label': 'Your own line (optional)', placeholder: 'Add your own line (optional)' });
  const preview = h('div', { class: 'brag-preview', 'aria-live': 'polite' });
  const err = h('div', { class: 'err-line', role: 'alert' });
  const load = async () => {
    try { const r = await api('GET', `/api/me/collectibles/${encodeURIComponent(c.key)}/brag?line=${line}&note=${encodeURIComponent(note.value)}`); preview.textContent = r.preview; }
    catch (e) { err.textContent = e.message; }
  };
  let t; note.addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 300); });
  const post = h('button', { type: 'button', class: 'btn primary', on: { click: async () => {
    post.disabled = true; err.textContent = '';
    try {
      await api('POST', `/api/me/collectibles/${encodeURIComponent(c.key)}/brag`, { line, note: note.value });
      c.bragged = true;
      box.replaceChildren(h('p', { class: 'brag-done', role: 'status' }, `Posted in ${where}. The team has been informed of your greatness.`));
      onDone?.(); window.dispatchEvent(new CustomEvent('kudog', { detail: 'excited' }));
    } catch (e) { err.textContent = e.message; post.disabled = false; }
  } } }, `Post it in ${where}`);
  const open = () => {
    box.replaceChildren(
      h('div', { class: 'brag-head' }, h('b', null, 'Your brag'), h('button', { type: 'button', class: 'link-btn', on: { click: () => { line = (line + 1) % (brag.lines || 1); load(); } } }, 'Try another line')),
      preview, note, err,
      h('div', { class: 'row', style: 'gap:8px;justify-content:center' }, post, h('button', { type: 'button', class: 'btn', on: { click: closed } }, 'Not this time')));
    load(); setTimeout(() => post.focus(), 50);
  };
  const closed = () => box.replaceChildren(h('button', { type: 'button', class: 'btn brag-btn', on: { click: open } }, 'Brag to the team'), h('div', { class: 'muted small' }, `Posts this card in ${where}. You see the message first.`));
  closed();
  return box;
}
function bragModal(c, brag, from) {
  let close;
  const panel = bragPanel(c, brag, { onDone: () => { from.replaceWith(h('span', { class: 'muted small' }, ' Bragged.')); setTimeout(() => close?.(), 1800); } });
  close = modal(`Brag about ${c.title}`, h('div', null, h('div', { class: 'brag-card' }, cardArt(c, { size: 120 })), panel));
  panel.querySelector('.brag-btn')?.click();
}

/** How rare a card is across the team: anonymous share of real trainees who hold it. */
export function rarityLine(c) {
  const r = c.rarity; if (!r) return null;
  const tag = h('span', { class: `rar-tag rar-${r.label.toLowerCase()}` }, r.label);
  let text;
  if (c.earned) {
    if (r.n === 0) text = 'No trainee has this one yet.';
    else if (r.n === 1) text = 'You are the first trainee to earn it. Good job!';
    else if (r.pct <= 35) text = `Only ${r.pct}% of trainees have this one. Good job!`;
    else text = `${r.pct}% of trainees have this one. Welcome to the club.`;
  } else text = r.n === 0 ? 'Nobody has it yet. Be the first.' : `${r.pct}% of trainees have earned it so far.`;
  return h('div', { class: 'rarity' }, tag, h('span', null, text));
}
