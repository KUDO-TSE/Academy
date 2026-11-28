// KUDOG, the virtual coach: a cut-out puppet made from one picture (public/kudog.webp, 500 x 500).
// Parts (ears, head, tongue, eyelids) are layers of the same image clipped to their outline and moved around
// their own pivot. Motion follows the 12 animation principles at 50% intensity (image-to-3d-rebuild skill):
// every beat is a pure function of time (anticipation, fast action, squash on landing, follow-through),
// nothing linear, angles on more than one part so it never moves "in one piece".
import { h, modal } from './ui.js';

const SRC = '/kudog.webp';
const pct = (pts) => `polygon(${pts.map(([x, y]) => `${x / 5}% ${y / 5}%`).join(',')})`;
// Outlines on the 500 px picture.
const CLIP = {
  body: [[120, 298], [275, 298], [300, 340], [450, 405], [450, 478], [110, 478]],
  head: [[78, 95], [100, 68], [150, 52], [200, 58], [240, 78], [262, 112], [290, 120], [316, 118], [320, 190], [305, 245], [290, 290], [268, 302], [268, 335], [140, 335], [132, 305], [95, 300], [54, 384], [42, 378], [84, 296], [58, 250], [50, 168], [78, 160]],
  earL: [[0, 78], [62, 66], [98, 92], [98, 172], [62, 186], [0, 180]],
  earR: [[228, 8], [300, 0], [388, 38], [388, 302], [328, 302], [342, 152], [318, 122], [288, 126], [258, 110], [236, 82]],
  tongue: [[166, 268], [216, 268], [218, 312], [196, 320], [166, 312]],
};
const PIVOT = { whole: '50% 95%', head: '40% 64%', earL: '17.6% 27%', earR: '54% 22.4%', tongue: '38% 54%' };
const EYES = [{ cx: 126, cy: 195, rx: 24, ry: 30 }, { cx: 210, cy: 175, rx: 25, ry: 26 }];

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
  const layer = (cls) => h('i', { class: `kd-l kd-${cls}`, style: `background-image:url(${SRC});clip-path:${pct(CLIP[cls])};transform-origin:${PIVOT[cls] || '50% 50%'}` });
  const lid = (e) => h('i', { class: 'kd-lid', style: `left:${(e.cx - e.rx) / 5}%;top:${(e.cy - e.ry) / 5}%;width:${2 * e.rx / 5}%;height:${2 * e.ry / 5}%` }, h('i'));
  const earL = layer('earL'), earR = layer('earR'), tongue = layer('tongue'), lids = EYES.map(lid);
  const head = h('i', { class: 'kd-head', style: `transform-origin:${PIVOT.head}` }, earL, earR, layer('head'), tongue, ...lids);
  const whole = h('i', { class: 'kd-whole', style: `transform-origin:${PIVOT.whole}` }, layer('body'), head);
  const el = h('button', { type: 'button', class: 'kd', style: `width:${size}px;height:${size}px`, 'aria-label': label, title: label, on: { click: () => { mood('pet'); onPet?.(); } } }, whole);

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cur = 'idle', since = 0, prev = null, raf = 0, last = {};
  let nextBlink = 2500, nextTwitch = 6000, twitchAt = -1e9, twitchEar = 'earL', blinkAt = -1e9;
  function pose(t) {
    const u = t - since; const m = MOODS[cur](u);
    if (m.done) { cur = 'idle'; since = t; prev = last; return pose(t); }
    const br = Math.sin(2 * Math.PI * t / (3400 * (m.breath || 1)));
    if (t > nextBlink) { blinkAt = t; nextBlink = t + 2800 + Math.random() * 3600 + (Math.random() < 0.15 ? -2600 : 0); }
    if (t > nextTwitch && cur === 'idle') { twitchAt = t; twitchEar = Math.random() < 0.6 ? 'earL' : 'earR'; nextTwitch = t + 5000 + Math.random() * 6000; }
    const tw = t - twitchAt; const twitch = tw < 0 || tw > 700 ? 0 : (tw < 80 ? 3 * easeOut(tw / 80) : 3 - 15 * easeOut((tw - 80) / 80) * (tw < 160 ? 1 : 0)) + (tw >= 160 ? damp(tw - 160, -12, 200, 90) : 0);
    const blink = bump(t - blinkAt, 0, 170);
    const p = {
      y: m.y || 0, rot: m.rot || 0, sx: (m.sx || 1) * (1 - 0.005 * br), sy: (m.sy || 1) * (1 + 0.01 * br),
      head: (m.head || 0) + 0.8 * Math.sin(2 * Math.PI * t / 5300), headY: m.headY || 0,
      earL: (m.earL || 0) + (twitchEar === 'earL' ? twitch : 0), earR: (m.earR || 0) + (twitchEar === 'earR' ? twitch * 0.7 : 0),
      tongue: (m.tongue || 1) * (1 + 0.012 * Math.sin(2 * Math.PI * t / 900)), lid: Math.max(m.lid || 0, blink),
    };
    if (prev) { const k = easeOut((t - since) / 260); if (k >= 1) prev = null; else for (const key of Object.keys(p)) if (key !== 'lid') p[key] = prev[key] + (p[key] - prev[key]) * k; }
    return p;
  }
  function apply(p) {
    whole.style.transform = `translateY(${p.y}%) rotate(${p.rot}deg) scale(${p.sx},${p.sy})`;
    head.style.transform = `translateY(${p.headY}%) rotate(${p.head}deg)`;
    earL.style.transform = `rotate(${p.earL}deg)`; earR.style.transform = `rotate(${-p.earR}deg)`;
    tongue.style.transform = `scaleY(${p.tongue})`;
    for (const l of lids) l.firstChild.style.transform = `scaleY(${p.lid})`;
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
// kudogPuppet() returns at once with the 2D puppet, loads the 3D dog (public/kudog3d.bundle.js) and swaps it in with
// the same interface, carrying over the current mood. Without WebGL (or if the file cannot load) the 2D puppet stays.
let load3d = null;
const get3d = () => load3d || (load3d = import('/kudog3d.bundle.js'));
export function kudogPuppet({ size = 96, label = 'Pet KUDOG', onPet, scale = 1.6 } = {}) {
  const flat = kudog2D({ size, label, onPet });
  const box = h('div', { class: 'kd-live', style: `width:${Math.round(size * scale)}px;height:${Math.round(size * scale)}px` }, flat.el);
  let impl = flat, mood = 'idle', running = false;
  get3d().then((mod) => {
    const d3 = mod.createKudog3D({ label: `${label}. KUDOG, your virtual coach`, onPet });
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
export const kudogFace = () => h('i', { class: 'kd-face', 'aria-hidden': 'true', style: `background-image:url(${SRC})` });

/** A pop-up told by KUDOG: he sits beside a speech bubble and reacts with a mood. Keyboard-safe (built on modal()).
 *  body: extra content under the bubble. actions(close): buttons. Returns close(). */
export function kudogSays({ title, say, mood = 'happy', body = null, actions = null, wide = false, onClose } = {}) {
  const dog = kudogPuppet({ size: 96 });
  const bubble = h('div', { class: 'kd-bubble' }, h('b', { class: 'kd-name' }, 'KUDOG'), ...(Array.isArray(say) ? say : [say]).map((p) => (typeof p === 'string' ? h('p', null, p) : p)));
  const close = modal(title, h('div', null, h('div', { class: 'kd-says' }, dog.el, bubble), body), { actions, cls: `kd-modal ${wide ? 'wide' : ''}`, onClose: () => { dog.stop(); onClose?.(); } });
  dog.start(); setTimeout(() => dog.mood(mood), 250);
  return Object.assign(close, { dog });
}
