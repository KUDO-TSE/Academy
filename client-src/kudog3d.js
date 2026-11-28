/* global document, window, ResizeObserver, requestAnimationFrame, cancelAnimationFrame */
// KUDOG in 3D: a procedural model (no external file) built from the KUDOG picture: a tan puppy with big eyes behind
// grey goggles, a lime headset with a microphone, floppy ears and a gold necklace with a medal bearing his name.
// Bundled with esbuild into public/kudog3d.bundle.js (npm run build:kudog). Loaded only when the chat opens.
//
// Motion is procedural and frame-rate independent (exponential damping towards per-mood targets, as in the
// three.js animation skill): breathing, blinking, tail wag, ear follow-through, the head following the pointer,
// and one pose per mood. Rendering pauses when the panel is hidden or the tab is in the background.
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, SphereGeometry, CapsuleGeometry, TorusGeometry, CylinderGeometry,
  CircleGeometry, MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight, AmbientLight,
  CanvasTexture, SRGBColorSpace, Raycaster, Vector2, Vector3, Quaternion, MathUtils, Sprite, SpriteMaterial, ACESFilmicToneMapping,
} from 'three';

const C = {
  fur: 0xd98a3a, furDark: 0xb86a27, cream: 0xf6e6cc, earIn: 0xc47f73, nose: 0x1c1a1a, mouth: 0x5a1f22, tongue: 0xec7f93,
  lime: 0xa7d82a, limeDark: 0x7fae17, grey: 0x9aa4ad, greyDark: 0x5f6870, eye: 0xffffff, iris: 0x6b4423, pupil: 0x111111,
};
const std = (color, o = {}) => new MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o });

// What each mood aims for. Every value is reached by damping, so moods blend into each other.
const MOODS = {
  idle: { headTilt: 0, headNod: 0, earUp: 0, wag: 2.2, wagAmp: 0.35, eyeOpen: 1, tongue: 0.6, lookUp: 0, bounce: 0, lean: 0 },
  listening: { headTilt: -0.12, headNod: 0.12, earUp: 0.35, wag: 3, wagAmp: 0.4, eyeOpen: 1.08, tongue: 0.3, lookUp: 0, bounce: 0, lean: 0.12 },
  thinking: { headTilt: 0.32, headNod: -0.08, earUp: 0.15, wag: 1.2, wagAmp: 0.2, eyeOpen: 0.9, tongue: 0, lookUp: 0.55, bounce: 0, lean: 0 },
  happy: { headTilt: -0.08, headNod: 0, earUp: 0.25, wag: 7, wagAmp: 0.6, eyeOpen: 1, tongue: 1, lookUp: 0, bounce: 1, lean: 0 },
  excited: { headTilt: 0.1, headNod: 0.05, earUp: 0.5, wag: 10, wagAmp: 0.7, eyeOpen: 1.12, tongue: 1, lookUp: 0.1, bounce: 2, lean: 0 },
  concerned: { headTilt: 0.18, headNod: 0.22, earUp: -0.45, wag: 0.8, wagAmp: 0.12, eyeOpen: 0.85, tongue: 0, lookUp: 0.35, bounce: 0, lean: -0.05 },
  sleepy: { headTilt: 0.15, headNod: 0.35, earUp: -0.35, wag: 0.3, wagAmp: 0.05, eyeOpen: 0.04, tongue: 0, lookUp: 0, bounce: 0, lean: 0 },
};

function medalTexture() {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
  const x = cv.getContext('2d');
  const g = x.createRadialGradient(100, 90, 20, 128, 128, 128); g.addColorStop(0, '#FFE58A'); g.addColorStop(0.65, '#F2BE2E'); g.addColorStop(1, '#C98B10');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#B57A0C'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#7A4A05'; x.font = 'bold 58px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('KUDOG', 128, 132);
  x.fillStyle = '#7A4A05'; for (const dx of [-30, 0, 30]) { x.beginPath(); x.arc(128 + dx, 78, 6, 0, Math.PI * 2); x.fill(); }
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
}
function zTexture() {
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 64;
  const x = cv.getContext('2d'); x.fillStyle = '#5b6b7a'; x.font = 'bold 48px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 32, 34);
  const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
}

function build() {
  const root = new Group(); // whole dog: hops and leans
  const body = new Group(); root.add(body);
  const m = { fur: std(C.fur), furDark: std(C.furDark), cream: std(C.cream), earIn: std(C.earIn), nose: std(C.nose, { roughness: 0.25 }),
    mouth: std(C.mouth), tongue: std(C.tongue, { roughness: 0.4 }), lime: std(C.lime, { roughness: 0.4 }), limeDark: std(C.limeDark, { roughness: 0.45 }),
    grey: std(C.grey, { roughness: 0.3, metalness: 0.35 }), greyDark: std(C.greyDark, { roughness: 0.4, metalness: 0.2 }), eye: std(C.eye, { roughness: 0.15 }),
    iris: std(C.iris, { roughness: 0.3 }), pupil: std(C.pupil, { roughness: 0.1 }), shine: new MeshBasicMaterial({ color: 0xffffff }),
    lens: new MeshPhysicalMaterial({ color: 0xdfeaf2, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.22, metalness: 0 }) };
  const add = (parent, geo, mat, [x, y, z], s = [1, 1, 1], r = [0, 0, 0]) => { const o = new Mesh(geo, mat); o.position.set(x, y, z); o.scale.set(...s); o.rotation.set(...r); parent.add(o); return o; };
  const sph = (r, w = 32, hgt = 24) => new SphereGeometry(r, w, hgt);

  // Body: sitting puppy, cream chest, front legs, haunches, paws.
  add(body, sph(0.78), m.fur, [0, 0.95, -0.05], [1, 1.08, 0.9]);
  add(body, sph(0.5), m.cream, [0, 1.0, 0.42], [0.9, 1.05, 0.6]);
  for (const s of [-1, 1]) {
    add(body, new CapsuleGeometry(0.17, 0.55, 8, 16), m.fur, [0.3 * s, 0.5, 0.42], [1, 1, 1], [0.08, 0, 0]);
    add(body, sph(0.2), m.cream, [0.3 * s, 0.12, 0.55], [1.05, 0.6, 1.25]);
    add(body, sph(0.42), m.fur, [0.55 * s, 0.42, -0.18], [0.75, 0.8, 1.05]);
    add(body, sph(0.2), m.cream, [0.66 * s, 0.1, 0.18], [1, 0.55, 1.35]);
  }
  // Tail: three segments that wag from its base.
  const tail = new Group(); tail.position.set(0, 0.45, -0.75); body.add(tail);
  const tailMid = new Group(); tailMid.position.set(0, 0.18, -0.16); tail.add(tailMid);
  add(tail, new CapsuleGeometry(0.09, 0.28, 6, 12), m.fur, [0, 0.08, -0.08], [1, 1, 1], [-0.9, 0, 0]);
  add(tailMid, new CapsuleGeometry(0.08, 0.26, 6, 12), m.fur, [0, 0.12, -0.05], [1, 1, 1], [-0.35, 0, 0]);
  add(tailMid, sph(0.1), m.cream, [0, 0.27, -0.1]);

  // A gold necklace with a medal bearing his name.
  const gold = std(0xe7b42c, { roughness: 0.28, metalness: 0.55 });
  // The chain: a V from behind the cheeks down to the medal's loop.
  const link = (a2, b2) => { const A = new Vector3(...a2), B = new Vector3(...b2), dir = B.clone().sub(A), len = dir.length();
    const o = new Mesh(new CapsuleGeometry(0.028, len, 4, 10), gold); o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())); body.add(o); };
  for (const s2 of [-1, 1]) { link([0.42 * s2, 1.42, 0.45], [0.2 * s2, 1.27, 0.74]); link([0.2 * s2, 1.27, 0.74], [0, 1.2, 0.86]); }
  const medal = new Group(); medal.position.set(0, 0.95, 0.9); medal.rotation.x = -0.12; body.add(medal);
  add(medal, new CylinderGeometry(0.24, 0.24, 0.05, 40), gold, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  add(medal, new TorusGeometry(0.24, 0.025, 10, 40), std(0xc98b10, { roughness: 0.3, metalness: 0.6 }), [0, 0, 0]);
  const face = new Mesh(new CircleGeometry(0.225, 40), new MeshBasicMaterial({ map: medalTexture() })); face.position.z = 0.027; medal.add(face);
  add(medal, new TorusGeometry(0.05, 0.018, 8, 16), gold, [0, 0.27, 0]); // loop

  // Head, on a neck pivot so it can tilt, nod and follow the pointer.
  const head = new Group(); head.position.set(0, 1.72, 0.05); body.add(head);
  add(head, sph(0.78, 40, 32), m.fur, [0, 0.42, 0], [1.08, 0.98, 0.95]);
  add(head, sph(0.5), m.cream, [0, 0.12, 0.42], [1.05, 0.72, 0.7]); // cheeks and muzzle
  add(head, sph(0.3), m.cream, [0, 0.2, 0.68], [1.05, 0.68, 0.75]);
  add(head, sph(0.12), m.nose, [0, 0.33, 0.9], [1.25, 0.85, 0.85]);
  add(head, sph(0.03), m.shine, [-0.04, 0.37, 0.98]);
  add(head, sph(0.2), m.mouth, [0, 0.03, 0.72], [1.35, 0.55, 0.6]); // open smile
  const tongue = new Group(); tongue.position.set(0, 0.0, 0.8); head.add(tongue);
  add(tongue, sph(0.12), m.tongue, [0, -0.06, 0.02], [0.95, 1.15, 0.45]);
  // Eyes: big and round, each in a group that blinks (scale) and looks around (rotation).
  const eyes = [];
  for (const s of [-1, 1]) {
    const g = new Group(); g.position.set(0.27 * s, 0.6, 0.6); head.add(g);
    add(g, sph(0.215), m.eye, [0, 0, 0], [1, 1.1, 0.7]);
    const iris = new Group(); g.add(iris);
    add(iris, new CircleGeometry(0.125, 32), m.iris, [0.0, -0.01, 0.152]);
    add(iris, new CircleGeometry(0.075, 28), m.pupil, [0, -0.01, 0.154]);
    add(iris, new CircleGeometry(0.03, 16), m.shine, [0.04 * -s, 0.04, 0.156]);
    // Closed eye: a curved line shown when the eye shuts (naps, blinks).
    const shut = add(head, new TorusGeometry(0.11, 0.02, 8, 24, Math.PI), m.mouth, [0.27 * s, 0.57, 0.76], [1, 0.7, 1], [0, 0, Math.PI]); shut.visible = false;
    eyes.push({ g, iris, shut });
    // Goggles: a grey ring and a light lens over each eye.
    add(head, new TorusGeometry(0.235, 0.055, 14, 40), m.grey, [0.27 * s, 0.6, 0.66], [1, 1.1, 1]);
    add(head, sph(0.235, 32, 16), m.lens, [0.27 * s, 0.6, 0.62], [1, 1.1, 0.4]);
    add(head, new CapsuleGeometry(0.035, 0.5, 4, 8), m.greyDark, [0.62 * s, 0.62, 0.22], [1, 1, 1], [Math.PI / 2, 0.5 * s, Math.PI / 2]); // strap
  }
  add(head, new CylinderGeometry(0.035, 0.035, 0.1, 12), m.grey, [0, 0.62, 0.7], [1, 1, 1], [0, 0, Math.PI / 2]); // bridge
  // Headset: lime band over the head, ear cups and a microphone boom.
  add(head, new TorusGeometry(0.8, 0.07, 14, 48, Math.PI), m.lime, [0, 0.5, -0.02], [1.02, 1.08, 1], [0, 0, 0]);
  for (const s of [-1, 1]) add(head, new CylinderGeometry(0.17, 0.17, 0.12, 28), m.lime, [0.82 * s, 0.38, 0], [1, 1, 1.15], [0, 0, Math.PI / 2]);
  const boom = new Group(); boom.position.set(-0.88, 0.32, 0.05); head.add(boom);
  add(boom, new CylinderGeometry(0.02, 0.02, 0.75, 10), m.greyDark, [0.12, -0.22, 0.3], [1, 1, 1], [1.05, 0, 0.35]);
  add(boom, sph(0.055), m.greyDark, [0.25, -0.38, 0.6]);
  // Ears: big floppy ears pinned under the headset band, with a pink inside; they swing on their own pivot.
  const ears = [];
  for (const s of [-1, 1]) {
    const pivot = new Group(); pivot.position.set(0.66 * s, 0.86, -0.08); head.add(pivot);
    const ear = new Group(); ear.rotation.set(0, 0.25 * s, -1.2 * s); pivot.add(ear);
    add(ear, sph(0.42), m.furDark, [0.0, 0.4, 0], [0.78, 1, 0.22]);
    add(ear, sph(0.33), m.earIn, [0.0, 0.38, 0.06], [0.62, 0.82, 0.12]);
    ears.push({ pivot, ear, s });
  }
  // A "z" for naps.
  const zz = new Sprite(new SpriteMaterial({ map: zTexture(), transparent: true, opacity: 0, depthWrite: false })); zz.scale.set(0.35, 0.35, 1); zz.position.set(0.7, 2.9, 0.4); root.add(zz);
  return { root, body, head, tail, tailMid, tongue, eyes, ears, zz, medal };
}

/**
 * Create KUDOG in a container. Returns the same interface as the 2D puppet: { el, mood, state, start, stop }, plus dispose.
 * Throws when WebGL is not available, so the caller can fall back to the 2D puppet.
 */
export function createKudog3D({ label = 'KUDOG', onPet = null } = {}) {
  const el = document.createElement('div');
  el.className = 'kd3';
  el.setAttribute('role', 'img'); el.setAttribute('aria-label', label);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.append(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 50); camera.position.set(0, 1.95, 8.2); camera.lookAt(0, 1.55, 0);
  scene.add(new HemisphereLight(0xfff6e8, 0xb9cfe0, 1.25));
  scene.add(new AmbientLight(0xffffff, 0.25));
  const key = new DirectionalLight(0xffffff, 1.9); key.position.set(2.5, 4, 5); scene.add(key);
  const rim = new DirectionalLight(0xbfe3ff, 1.1); rim.position.set(-3, 3, -3); scene.add(rim);
  const d = build(); scene.add(d.root);

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let mood = 'idle', target = MOODS.idle, running = false, raf = 0, last = 0, t = 0, moodAt = 0;
  const cur = { ...MOODS.idle };
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let blinkAt = 1.5, blinkT = -1, petAt = -10;

  const resize = () => {
    const w = Math.max(1, el.clientWidth), hh = Math.max(1, el.clientHeight);
    renderer.setSize(w, hh, false); camera.aspect = w / hh;
    // Small sizes frame the head, large ones the whole dog.
    const close = Math.min(w, hh) < 120;
    camera.position.set(0, close ? 2.3 : 1.95, close ? 4.1 : 8.2); camera.lookAt(0, close ? 2.08 : 1.55, 0);
    camera.updateProjectionMatrix(); if (!running) frame(0);
  };
  const ro = new ResizeObserver(resize); ro.observe(el);

  // The head follows the pointer anywhere on the page, a little.
  const onMove = (e) => { const r = el.getBoundingClientRect(); look.tx = MathUtils.clamp((e.clientX - (r.left + r.width / 2)) / 600, -1, 1); look.ty = MathUtils.clamp((e.clientY - (r.top + r.height * 0.35)) / 500, -1, 1); };
  window.addEventListener('pointermove', onMove, { passive: true });
  // Pet him: a click on the dog makes him wiggle; onPet counts the pets.
  const ray = new Raycaster(), p = new Vector2();
  el.addEventListener('pointerdown', (e) => {
    const r = renderer.domElement.getBoundingClientRect(); p.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p, camera); if (ray.intersectObject(d.root, true).length) { petAt = t; onPet?.(); }
  });

  function frame(dt) {
    t += dt;
    const k = (l) => 1 - Math.exp(-l * dt); // damping factor
    for (const key2 of Object.keys(cur)) cur[key2] += (target[key2] - cur[key2]) * (dt ? k(key2 === 'eyeOpen' ? 10 : 5) : 1);
    look.x += (look.tx - look.x) * (dt ? k(4) : 1); look.y += (look.ty - look.y) * (dt ? k(4) : 1);
    const since = t - moodAt, pet = Math.max(0, 1 - (t - petAt) / 0.9);
    // Breathing and the hop of happy/excited moods (anticipation dip, arc, squash on landing).
    const breathe = Math.sin(t * (mood === 'sleepy' ? 1.3 : 2.4)) * (mood === 'sleepy' ? 0.025 : 0.014);
    let hopY = 0, squash = 0, spin = 0;
    if (cur.bounce > 0.05 && !reduce) {
      const period = mood === 'excited' ? 0.62 : 0.9, ph = (since % period) / period;
      const n = Math.floor(since / period), hops = mood === 'excited' ? 3 : 2;
      if (n < hops) { hopY = Math.max(0, Math.sin(ph * Math.PI)) * 0.28 * cur.bounce; squash = ph < 0.12 ? (0.12 - ph) * 0.6 : ph > 0.9 ? (ph - 0.9) * 0.8 : 0; }
      if (mood === 'excited' && since < period * hops) spin = MathUtils.smootherstep(since, 0, period * hops) * Math.PI * 2;
    }
    d.root.position.y = hopY;
    d.root.rotation.y = spin + look.x * 0.18;
    d.body.scale.set(1 + squash * 0.6, 1 + breathe - squash, 1 + squash * 0.6);
    d.body.rotation.x = cur.lean;
    // Head: tilt, nod, follow the pointer, a wiggle when petted.
    d.head.rotation.z = cur.headTilt + Math.sin(t * 1.1) * 0.03 + Math.sin(t * 18) * 0.12 * pet;
    d.head.rotation.x = cur.headNod + look.y * 0.22 + Math.sin(t * 1.7) * 0.015;
    d.head.rotation.y = look.x * 0.42;
    // Ears: lifted by the mood, then follow-through from the head motion.
    for (const e of d.ears) {
      e.pivot.rotation.z = e.s * (cur.earUp * 0.6 + Math.sin(t * 3.1 + e.s) * 0.04 + hopY * 0.9 * -1) + Math.sin(t * 16) * 0.15 * pet;
      e.pivot.rotation.x = -0.1 + Math.sin(t * 2.3 + e.s * 0.7) * 0.05;
    }
    // Tail wag.
    d.tail.rotation.y = Math.sin(t * cur.wag) * cur.wagAmp; d.tailMid.rotation.y = Math.sin(t * cur.wag - 0.7) * cur.wagAmp * 0.8;
    d.tail.rotation.x = mood === 'concerned' ? 0.5 : mood === 'sleepy' ? 0.6 : 0;
    d.medal.rotation.z = Math.sin(t * 2.2) * 0.06 + (hopY ? Math.sin(t * 14) * 0.12 : 0); d.medal.rotation.y = Math.sin(t * 1.3) * 0.12;
    // Eyes: blink every few seconds, look up when thinking, follow the pointer a little.
    if (blinkT < 0 && t > blinkAt && mood !== 'sleepy') { blinkT = 0; }
    let lid = 1; if (blinkT >= 0) { blinkT += dt; lid = 1 - Math.sin(Math.min(1, blinkT / 0.16) * Math.PI); if (blinkT > 0.16) { blinkT = -1; blinkAt = t + 2.5 + Math.random() * 3.5; } }
    for (const e of d.eyes) {
      const open = Math.min(1.12, cur.eyeOpen) * lid; e.g.scale.y = Math.max(0.05, open); e.g.visible = open > 0.22; e.shut.visible = open <= 0.22;
      e.iris.position.set(look.x * 0.04, cur.lookUp * 0.06 - look.y * 0.03, 0);
    }
    d.tongue.scale.y = Math.max(0.01, cur.tongue); d.tongue.visible = cur.tongue > 0.05;
    d.tongue.rotation.x = Math.sin(t * 6) * 0.08 * cur.tongue;
    // Naps: a floating "z".
    const zOn = mood === 'sleepy' ? 1 : 0; const zp = (t % 2.6) / 2.6;
    d.zz.material.opacity = zOn * Math.sin(zp * Math.PI) * 0.9; d.zz.position.set(0.75 + zp * 0.3, 2.85 + zp * 0.6, 0.4);
    renderer.render(scene, camera);
  }
  const loop = (now) => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (!document.hidden && el.isConnected && el.offsetParent !== null) frame(reduce ? 0 : dt);
    raf = requestAnimationFrame(loop);
  };
  const api = {
    el,
    mood(m) { if (!MOODS[m]) m = 'idle'; mood = m; target = MOODS[m]; moodAt = t; if (reduce || !running) { Object.assign(cur, target); frame(0); } },
    state: () => mood,
    start() { if (running) return; running = true; last = 0; raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      api.stop(); ro.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { o.geometry?.dispose?.(); const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; mats.forEach((mm) => { mm.map?.dispose?.(); mm.dispose(); }); });
      renderer.dispose(); el.remove();
    },
  };
  return api;
}
