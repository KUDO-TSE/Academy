// KUDOG, the virtual coach. The real dog is the 3D model (client-src/kudog3d.js). This file holds the light 2D
// stand-in shown while the model loads, or for good when WebGL is missing: one still of the 3D dog
// (public/kudog-sit.webp, 500 x 500) that breathes, hops, tilts and wiggles on the same moods. Motion follows the
// 12 animation principles at 50% intensity: each beat is a pure function of time (anticipation, fast action,
// squash on landing, follow-through), nothing linear.
import { h, modal } from './ui.js';

const SRC = '/kudog-sit.webp';
const FACE = '/kudog-face.webp';

// ---- timing helpers
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const easeOut = (x) => 1 - Math.pow(1 - clamp01(x), 3);
const bump = (t, a, b) => (t < a || t > b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));
const damp = (u, amp, period, decay) => (u < 0 ? 0 : amp * Math.exp(-u / decay) * Math.cos(2 * Math.PI * u / period));
const spring = (u, period = 420, decay = 70) => (u <= 0 ? 0 : 1 - Math.exp(-u / decay) * Math.cos(2 * Math.PI * u / period)); // ~5% overshoot

// A hop: anticipation dip, arc up with a little roll, accelerate into landing, squash and rock to rest.
function hop(u, height, dur = 300) {
  const o = { y: 0, rot: 0, sx: 1, sy: 1 };
  if (u < 0) return o;
  if (u < 140) { const k = easeOut(u / 140); o.y = 1.6 * k; o.sy = 1 - 0.04 * k; o.sx = 1 + 0.02 * k; return o; } // dip
  const a = u - 140;
  if (a < dur) {
    const k = a / dur; o.y = 1.6 * (1 - easeOut(k * 3)) - height * Math.sin(Math.PI * k);
    o.rot = 2.6 * Math.sin(Math.PI * k) * (k < 0.5 ? 1 : -0.6); o.sy = 1 + 0.04 * bump(a, 0, dur * 0.45); o.sx = 1 - 0.02 * bump(a, 0, dur * 0.45);
    return o;
  }
  const l = a - dur; // landed
  o.sy = 1 - damp(l, 0.05, 140, 55); o.sx = 1 + damp(l, 0.025, 140, 55); o.rot = damp(l, -1.6, 160, 90);
  return o;
}

// ---- moods: each returns contributions for time u (ms) since the mood started
const MOODS = {
  idle: () => ({}),
  listening: (u) => ({ head: 7 * spring(u), earL: -10 * spring(u - 60), earR: -6 * spring(u - 110), hold: true }),
  thinking: (u) => {
    const w = easeOut(u / 380);
    return { head: w * (-1 + 5 * Math.sin(2 * Math.PI * u / 1700)), earL: w * (-6 + 4 * Math.sin(2 * Math.PI * u / 850 + 1)), earR: w * 4, lid: 0.3 * w, tongue: 1 - 0.05 * w, hold: true };
  },
  happy: (u) => {
    const p = hop(u, 5); const land = u - 440;
    return { ...p, earL: damp(land, 14, 240, 130) - 4 * bump(u, 140, 440), earR: damp(land - 60, 10, 260, 130), tongue: 1 + 0.07 * Math.abs(Math.sin(2 * Math.PI * u / 450)) * Math.exp(-u / 1200), done: u > 1500 };
  },
  excited: (u) => {
    const a = hop(u, 7), b = hop(u - 620, 5, 260); const p = u < 620 ? a : b;
    return { ...p, earL: damp(u - 440, 16, 230, 160) + damp(u - 1020, 12, 230, 130), earR: damp(u - 500, 12, 250, 160) + damp(u - 1080, 9, 250, 130), head: 3 * bump(u, 900, 1600), tongue: 1 + 0.08 * Math.abs(Math.sin(2 * Math.PI * u / 380)) * Math.exp(-u / 1800), done: u > 2300 };
  },
  concerned: (u) => {
    const w = easeOut(u / 450) * (u > 2600 ? 1 - easeOut((u - 2600) / 500) : 1);
    return { headY: 2 * w, head: -4 * w, earL: 16 * w + damp(u - 450, 2, 300, 120), earR: 12 * w, lid: 0.35 * w, tongue: 1 - 0.1 * w, done: u > 3100 };
  },
  tilt: (u) => {
    const w = u < 1500 ? spring(u, 460, 75) : 1 - easeOut((u - 1500) / 350);
    return { head: 12 * w, earL: -14 * w, earR: 6 * w, done: u > 1850 };
  },
  pet: (u) => {
    const e = Math.exp(-u / 700);
    return { rot: 3 * e * Math.sin(2 * Math.PI * u / 220), head: -3 * e * Math.sin(2 * Math.PI * u / 220 + 0.8), earL: 10 * easeOut(u / 200) * (1 - easeOut((u - 1100) / 400)), earR: 8 * easeOut(u / 240) * (1 - easeOut((u - 1150) / 400)), lid: 0.55 * bump(u, 0, 1500) ** 0.4, tongue: 1 + 0.07 * Math.abs(Math.sin(2 * Math.PI * u / 420)) * e, done: u > 1600 };
  },
  sleepy: (u) => {
    const w = easeOut(u / 1200); const nod = (u % 4200) / 4200;
    return { lid: w * (0.72 + 0.08 * Math.sin(2 * Math.PI * u / 3000)), head: w * (-3 - 2 * bump(nod, 0.55, 0.8)) + w * damp((nod - 0.8) * 4200, 1.2, 200, 80), headY: w * 1.2, earL: 8 * w, earR: 6 * w, breath: 1.6, hold: true };
  },
  wake: (u) => ({ ...hop(u, 2.5, 220), earL: damp(u - 150, -12, 220, 120), earR: damp(u - 200, -8, 240, 120), done: u > 900 }),
};

export function kudog2D({ size = 96, label = 'Pet KUDOG', onPet } = {}) {
  const pic = h('i', { class: 'kd-l', style: `background-image:url(${SRC})` });
  const whole = h('i', { class: 'kd-whole', style: 'transform-origin:50% 88%' }, pic);
  const el = h('button', { type: 'button', class: 'kd', style: `width:${size}px;height:${size}px`, 'aria-label': label, title: label, on: { click: () => { mood('pet'); onPet?.(); } } }, whole);

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 'idle', since = 0, prev = null, raf = 0, last = {};
  function pose(t) {
    const u = t - since; const m = MOODS[cur](u);
    if (m.done) { cur = 'idle'; since = t; prev = last; return pose(t); }
    const br = Math.sin(2 * Math.PI * t / (3400 * (m.breath || 1)));
    const p = {
      y: m.y || 0, rot: m.rot || 0, sx: (m.sx || 1) * (1 - 0.005 * br), sy: (m.sy || 1) * (1 + 0.01 * br),
      head: (m.head || 0) + 0.8 * Math.sin(2 * Math.PI * t / 5300), headY: m.headY || 0,
    };
    if (prev) { const k = easeOut((t - since) / 260); if (k >= 1) prev = null; else for (const key of Object.keys(p)) p[key] = prev[key] + (p[key] - prev[key]) * k; }
    return p;
  }
  function apply(p) {
    // One picture, so the head's tilt and drop move the whole dog a little, around his paws.
    whole.style.transform = `translateY(${p.y + p.headY * 0.6}%) rotate(${p.rot + p.head * 0.35}deg) scale(${p.sx},${p.sy})`;
  }
  const frame = (t) => { last = pose(t); apply(last); raf = requestAnimationFrame(frame); };
  function mood(name) {
    if (!MOODS[name]) return;
    if (name === cur && MOODS[name](0).hold) return;
    const t = performance.now();
    if (cur === 'sleepy' && name !== 'sleepy' && name !== 'wake') { prev = last; cur = 'wake'; since = t; return; }
    prev = last; cur = name; since = t;
  }
  return {
    el, mood, state: () => cur,
    start() { if (still || raf) return; since = performance.now(); raf = requestAnimationFrame(frame); },
    stop() { cancelAnimationFrame(raf); raf = 0; },
  };
}

// ---- KUDOG in 3D everywhere he talks to the trainee (tour, cards, recaps, brags).
// kudogPuppet() returns at once with the 2D puppet, loads the 3D dog (public/kudog3d.bundle.js) and, once its model is ready, swaps it in with
// the same interface, carrying over the current mood. Without WebGL (or if the file cannot load) the 2D puppet stays.
let load3d = null;
const get3d = () => load3d || (load3d = import('/kudog3d.bundle.js'));
export function kudogPuppet({ size = 96, label = 'Pet KUDOG', onPet, scale = 1.6 } = {}) {
  const flat = kudog2D({ size, label, onPet });
  const box = h('div', { class: 'kd-live', style: `width:${Math.round(size * scale)}px;height:${Math.round(size * scale)}px` }, flat.el);
  let impl = flat, mood = 'idle', running = false;
  get3d().then(async (mod) => {
    const d3 = mod.createKudog3D({ label: `${label}. KUDOG, your virtual coach`, onPet });
    // Swap only once the model has loaded, so the 2D puppet never gives way to an empty frame.
    try { await d3.ready; } catch { d3.dispose?.(); return; }
    if (!running && !box.isConnected) { d3.dispose?.(); return; }
    d3.el.classList.add('kd-3d'); flat.stop(); flat.el.replaceWith(d3.el); impl = d3;
    if (running) { d3.start(); d3.mood(mood); }
  }).catch(() => {});
  return {
    el: box,
    mood(m) { mood = m; impl.mood(m); },
    state: () => impl.state(),
    start() { running = true; impl.start(); },
    stop() { running = false; impl.stop(); },
  };
}

/** The round face used on the coach button. */
export const kudogFace = () => h('i', { class: 'kd-face', 'aria-hidden': 'true', style: `background-image:url(${FACE})` });

/** A pop-up told by KUDOG: he sits beside a speech bubble and reacts with a mood. Keyboard-safe (built on modal()).
 *  body: extra content under the bubble. actions(close): buttons. Returns close(). */
export function kudogSays({ title, say, mood = 'happy', body = null, actions = null, wide = false, onClose } = {}) {
  const dog = kudogPuppet({ size: 96 });
  const bubble = h('div', { class: 'kd-bubble' }, h('b', { class: 'kd-name' }, 'KUDOG'), ...(Array.isArray(say) ? say : [say]).map((p) => (typeof p === 'string' ? h('p', null, p) : p)));
  const close = modal(title, h('div', null, h('div', { class: 'kd-says' }, dog.el, bubble), body), { actions, cls: `kd-modal ${wide ? 'wide' : ''}`, onClose: () => { dog.stop(); onClose?.(); } });
  dog.start(); setTimeout(() => dog.mood(mood), 250);
  return Object.assign(close, { dog });
}

// ---- KUDOG's quips: short jokes about dogs and multilingual meetings, in speech bubbles beside him.
// The first one is a party trick: he offers to say Woof in five languages, barks, and the translations pop up one by
// one around him. Decorative (hidden from screen readers, who already get his real answers in the chat).
const QUIPS = [
  { say: 'Want me to say Woof in 5 languages?', woof: true },
  { say: 'I speak fluent Woof. The interpreters handle every other language.' },
  { say: 'Mic on, mic off… paws off the mute button!' },
  { say: 'I never drop a relay. I fetch it.' },
  { say: 'My favourite language channel? The one with the treats.' },
  { say: 'Headset on, tail on: ready for my next meeting.' },
  { say: 'Interpreters work in pairs. So do my ears.' },
  { say: 'Zero language barriers. Plenty of belly rubs.' },
  { say: 'Sit. Stay. Select your language.' },
];
const WOOF = [['Japanese', 'ワンワン (wan wan)'], ['French', 'Wouf wouf'], ['German', 'Wau wau'], ['Spanish', 'Guau guau'], ['Italian', 'Bau bau']];

/** Speech bubbles on top of `host` (KUDOG's stage). `bark()` makes him bark. Returns { next, clear, busy }. */
export function kudogQuips(host, { bark } = {}) {
  const layer = h('div', { class: 'kq-layer', 'aria-hidden': 'true' });
  host.append(layer);
  let i = 0, timers = [], showing = false;
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clear = () => { timers.forEach(clearTimeout); timers = []; layer.replaceChildren(); showing = false; };
  const bubble = (text) => { const b = h('div', { class: 'kq kq-main' }, text); layer.replaceChildren(b); return b; };
  function next() {
    if (showing) return;
    const q = QUIPS[i]; i = (i + 1) % QUIPS.length; showing = true;
    bubble(q.say);
    if (!q.woof) { later(5200, clear); return; }
    later(1900, () => { bark?.(); bubble('Woof!'); });
    WOOF.forEach(([lang, w], k) => later(2500 + k * 520, () => layer.append(h('div', { class: `kq kq-lang kq-l${k}` }, h('b', null, lang), w))));
    later(2500 + WOOF.length * 520 + 700, () => { layer.querySelector('.kq-main')?.replaceChildren('Live interpretation, dog edition.'); });
    later(10500, clear);
  }
  return { next, clear, busy: () => showing };
}
