/* global document, window, ResizeObserver, requestAnimationFrame, cancelAnimationFrame */
// KUDOG in 3D: a procedural dog (no external file). A tan puppy with a brown saddle and ears, cream muzzle, blaze,
// chest and paws, long floppy ears, a lime headset with a microphone, and a gold necklace with a medal bearing his name.
// Bundled with esbuild into public/kudog3d.bundle.js (npm run build:kudog).
//
// He is rigged like a dog: hips, a body that pitches (stand, sit, lie down, play bow), four legs, a head on a neck that
// stays level, a jaw, ears and a tail on their own pivots. A behaviour engine plays real dog routines when he is left
// alone (sit and look around, scratch behind the ear, bark, sniff, stretch, walk in a circle and lie down) and answers
// the moods the app asks for (listening, thinking, happy, excited, concerned, sleepy). Every value is damped towards its
// target, so poses blend into each other; the loop pauses when he is hidden and stops for good when removed.
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, SphereGeometry, CapsuleGeometry, TorusGeometry, CylinderGeometry,
  CircleGeometry, MeshStandardMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight, AmbientLight,
  CanvasTexture, SRGBColorSpace, Raycaster, Vector2, Vector3, Quaternion, Sprite, SpriteMaterial, ACESFilmicToneMapping,
} from 'three';

const C = {
  fur: 0xd8944c, saddle: 0x8c5530, cream: 0xf6e8d2, earIn: 0xc98a80, nose: 0x1d1a19, mouth: 0x5d2024, tongue: 0xec7f93,
  lime: 0xa8d82c, limeDark: 0x6f9e14, cushion: 0x3c4a1a, eye: 0xffffff, iris: 0x6b4423, pupil: 0x111111, gold: 0xe7b42c, goldDark: 0xc98b10,
};
const std = (color, o = {}) => new MeshStandardMaterial({ color, roughness: 0.66, metalness: 0, ...o });

function canvasTex(w, hgt, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt; draw(cv.getContext('2d')); const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t; }
const medalTexture = () => canvasTex(256, 256, (x) => {
  const g = x.createRadialGradient(100, 90, 20, 128, 128, 128); g.addColorStop(0, '#FFE58A'); g.addColorStop(0.65, '#F2BE2E'); g.addColorStop(1, '#C98B10');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#B57A0C'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#7A4A05'; x.font = 'bold 58px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('KUDOG', 128, 132);
});
const wordTexture = (word, color) => canvasTex(256, 128, (x) => {
  x.fillStyle = '#ffffff'; x.strokeStyle = '#1B5C84'; x.lineWidth = 6; x.beginPath(); x.roundRect(8, 8, 240, 96, 40); x.fill(); x.stroke();
  x.fillStyle = color; x.font = 'bold 60px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(word, 128, 58);
});

// ------------------------------------------------------------------ the model
function build() {
  const m = { fur: std(C.fur), saddle: std(C.saddle), cream: std(C.cream), earIn: std(C.earIn), nose: std(C.nose, { roughness: 0.25 }),
    mouth: std(C.mouth), tongue: std(C.tongue, { roughness: 0.4 }), lime: std(C.lime, { roughness: 0.42 }), limeDark: std(C.limeDark, { roughness: 0.45 }),
    cushion: std(C.cushion, { roughness: 0.8 }), eye: std(C.eye, { roughness: 0.15 }), iris: std(C.iris, { roughness: 0.3 }), pupil: std(C.pupil, { roughness: 0.1 }),
    shine: new MeshBasicMaterial({ color: 0xffffff }), gold: std(C.gold, { roughness: 0.28, metalness: 0.55 }), goldDark: std(C.goldDark, { roughness: 0.3, metalness: 0.6 }) };
  const add = (parent, geo, mat, [x, y, z], s = [1, 1, 1], r = [0, 0, 0]) => { const o = new Mesh(geo, mat); o.position.set(x, y, z); o.scale.set(...s); o.rotation.set(...r); parent.add(o); return o; };
  const sph = (r, w = 28, hh = 20) => new SphereGeometry(r, w, hh);
  const stick = (parent, a, b, r, mat) => { const A = new Vector3(...a), B = new Vector3(...b), dir = B.clone().sub(A), len = dir.length();
    const o = new Mesh(new CapsuleGeometry(r, len, 4, 10), mat); o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())); parent.add(o); return o; };

  const root = new Group(); // walks on the ground, turns, jumps
  const hips = new Group(); root.add(hips); // the body pitches around the hips
  // Body: tan barrel, brown saddle on the back, cream chest and belly.
  add(hips, new CapsuleGeometry(0.37, 0.62, 8, 20), m.fur, [0, 0, 0.42], [1, 1, 1], [Math.PI / 2, 0, 0]);
  add(hips, sph(0.4), m.saddle, [0, 0.17, 0.36], [0.86, 0.55, 1.35]);
  add(hips, sph(0.36), m.cream, [0, -0.05, 0.98], [0.82, 0.95, 0.62]);
  add(hips, sph(0.36), m.cream, [0, -0.2, 0.45], [0.7, 0.42, 1.15]);
  add(hips, sph(0.3), m.fur, [0, 0.02, -0.18], [1.05, 0.95, 0.9]); // rump
  // Tail: two segments with a cream tip, wagging from its base.
  const tail = new Group(); tail.position.set(0, 0.2, -0.38); hips.add(tail);
  const tailMid = new Group(); tailMid.position.set(0, 0.22, -0.14); tail.add(tailMid);
  stick(tail, [0, 0, 0], [0, 0.22, -0.14], 0.075, m.saddle);
  stick(tailMid, [0, 0, 0], [0, 0.2, -0.04], 0.065, m.saddle);
  add(tailMid, sph(0.08), m.cream, [0, 0.25, -0.05]);
  // Legs: a hip (thigh) or shoulder, a leg whose length and angle the pose sets, and a cream paw.
  const legs = {};
  const makeLeg = (key, at, thigh) => {
    const g = new Group(); g.position.set(...at); hips.add(g);
    if (thigh) add(hips, sph(0.24), m.fur, [at[0] * 1.02, at[1] + 0.08, at[2] + 0.02], [0.62, 0.95, 1.05]);
    else add(g, sph(0.13), m.fur, [0, 0, 0]);
    const shin = add(g, new CylinderGeometry(0.105, 0.095, 1, 16), m.fur, [0, -0.5, 0]);
    const paw = add(g, sph(0.12), m.cream, [0, -1, 0.04], [1.05, 0.62, 1.3]);
    legs[key] = { g, shin, paw, len: 0.7, ang: 0 };
  };
  makeLeg('fl', [0.2, -0.12, 0.92]); makeLeg('fr', [-0.2, -0.12, 0.92]);
  makeLeg('hl', [0.27, -0.14, -0.02], true); makeLeg('hr', [-0.27, -0.14, -0.02], true);
  // Necklace and medal on the chest.
  stick(hips, [0.3, 0.22, 0.98], [0.14, -0.02, 1.2], 0.022, m.gold); stick(hips, [-0.3, 0.22, 0.98], [-0.14, -0.02, 1.2], 0.022, m.gold);
  stick(hips, [0.14, -0.02, 1.2], [0, -0.08, 1.24], 0.022, m.gold); stick(hips, [-0.14, -0.02, 1.2], [0, -0.08, 1.24], 0.022, m.gold);
  const medal = new Group(); medal.position.set(0, -0.2, 1.27); medal.scale.setScalar(0.72); hips.add(medal);
  add(medal, new CylinderGeometry(0.17, 0.17, 0.04, 36), m.gold, [0, 0, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
  add(medal, new TorusGeometry(0.17, 0.02, 8, 36), m.goldDark, [0, 0, 0]);
  const face = new Mesh(new CircleGeometry(0.16, 36), new MeshBasicMaterial({ map: medalTexture() })); face.position.z = 0.022; medal.add(face);
  add(medal, new TorusGeometry(0.035, 0.014, 8, 14), m.gold, [0, 0.19, 0]);

  // Head on the neck: it keeps itself level whatever the body does.
  const head = new Group(); head.position.set(0, 0.3, 1.05); hips.add(head);
  add(head, new CapsuleGeometry(0.13, 0.2, 6, 12), m.fur, [0, -0.02, -0.05], [1.4, 1, 1.2], [0.5, 0, 0]); // neck
  const skull = new Group(); skull.position.set(0, 0.3, 0.08); head.add(skull);
  add(skull, sph(0.42, 36, 28), m.fur, [0, 0, 0], [1, 0.92, 1]);
  add(skull, sph(0.3), m.saddle, [0, 0.16, -0.12], [1.2, 0.7, 1.05]); // darker crown
  add(skull, sph(0.1), m.cream, [0, 0.12, 0.37], [0.55, 1.6, 0.4]); // white blaze down the forehead
  for (const s of [-1, 1]) add(skull, sph(0.07), m.saddle, [0.16 * s, 0.2, 0.33], [1.1, 0.42, 0.5]); // brows
  // Muzzle: a real dog snout, longer than a bear's, with the nose at its tip.
  add(skull, new CapsuleGeometry(0.16, 0.22, 8, 16), m.cream, [0, -0.1, 0.4], [1.12, 0.95, 1], [Math.PI / 2, 0, 0]);
  add(skull, sph(0.15), m.cream, [0, -0.06, 0.3], [1.35, 0.95, 1]); // cheeks
  add(skull, sph(0.075), m.nose, [0, -0.02, 0.72], [1.35, 0.95, 1]);
  add(skull, sph(0.022), m.shine, [-0.03, 0.02, 0.78]);
  // Jaw: opens to bark and to pant.
  const jaw = new Group(); jaw.position.set(0, -0.2, 0.28); skull.add(jaw);
  add(jaw, sph(0.13), m.mouth, [0, 0.03, 0.22], [1, 0.4, 1.35]);
  add(jaw, sph(0.13), m.cream, [0, -0.02, 0.22], [1.02, 0.45, 1.38]);
  const tongue = new Group(); tongue.position.set(0, 0.03, 0.36); jaw.add(tongue);
  add(tongue, sph(0.08), m.tongue, [0, -0.04, 0.03], [1, 0.4, 1.4]);
  // Eyes: big and friendly; each blinks (scale) and looks around (iris).
  const eyes = [];
  for (const s of [-1, 1]) {
    const g = new Group(); g.position.set(0.17 * s, 0.08, 0.33); skull.add(g);
    add(g, sph(0.105), m.eye, [0, 0, 0], [1, 1.1, 0.7]);
    const iris = new Group(); g.add(iris);
    add(iris, new CircleGeometry(0.068, 28), m.iris, [0, -0.005, 0.075]);
    add(iris, new CircleGeometry(0.042, 24), m.pupil, [0, -0.005, 0.077]);
    add(iris, new CircleGeometry(0.018, 14), m.shine, [0.022 * -s, 0.022, 0.079]);
    const shut = add(skull, new TorusGeometry(0.06, 0.012, 8, 20, Math.PI), m.mouth, [0.17 * s, 0.06, 0.41], [1, 0.7, 1], [0, 0, Math.PI]); shut.visible = false;
    eyes.push({ g, iris, shut });
  }
  // Ears: long, soft, hanging down the side of the head (a dog's drop ears), brown with a pink inside.
  const ears = [];
  for (const s of [-1, 1]) {
    const pivot = new Group(); pivot.position.set(0.33 * s, 0.17, -0.02); skull.add(pivot);
    const ear = new Group(); ear.rotation.set(0, 0.2 * s, 0.25 * s); pivot.add(ear);
    add(ear, sph(0.2), m.saddle, [0.03 * s, -0.24, 0], [0.55, 1.45, 0.2]);
    add(ear, sph(0.16), m.earIn, [0.02 * s, -0.22, 0.025], [0.45, 1.3, 0.12]);
    ears.push({ pivot, s });
  }
  // Headset: a full lime band from one ear cup to the other, cushions, and a microphone boom to the mouth.
  add(skull, new TorusGeometry(0.44, 0.04, 12, 40, Math.PI), m.lime, [0, 0.06, -0.02], [1, 1.02, 1]);
  for (const s of [-1, 1]) {
    add(skull, new CylinderGeometry(0.13, 0.13, 0.09, 28), m.lime, [0.45 * s, 0.04, -0.02], [1, 1, 1], [0, 0, Math.PI / 2]);
    add(skull, new TorusGeometry(0.11, 0.035, 10, 24), m.cushion, [0.4 * s, 0.04, -0.02], [1, 1, 1], [0, Math.PI / 2, 0]);
    add(skull, new CylinderGeometry(0.06, 0.06, 0.02, 20), m.limeDark, [0.5 * s, 0.04, -0.02], [1, 1, 1], [0, 0, Math.PI / 2]);
  }
  stick(skull, [0.5, 0.0, 0.02], [0.42, -0.14, 0.32], 0.018, m.limeDark);
  stick(skull, [0.42, -0.14, 0.32], [0.24, -0.17, 0.52], 0.018, m.limeDark);
  add(skull, sph(0.045), m.cushion, [0.22, -0.17, 0.55]);

  // Speech and sleep: "Woof!" and "z" sprites.
  const woof = new Sprite(new SpriteMaterial({ map: wordTexture('Woof!', '#1B5C84'), transparent: true, opacity: 0, depthWrite: false })); woof.scale.set(0.8, 0.4, 1); root.add(woof);
  const zz = new Sprite(new SpriteMaterial({ map: canvasTex(64, 64, (x) => { x.fillStyle = '#5b6b7a'; x.font = 'bold 48px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 32, 34); }), transparent: true, opacity: 0, depthWrite: false })); zz.scale.set(0.3, 0.3, 1); root.add(zz);
  return { root, hips, head, skull, jaw, tongue, eyes, ears, tail, tailMid, legs, medal, woof, zz };
}

// ------------------------------------------------------------------ poses
// hipY and pitch place the body; legs: angle from vertical (forward is positive) and an optional fixed length
// (otherwise the leg reaches the ground); head: pitch (down is positive), tilt; ears: lift; eyes, jaw, tongue.
const POSES = {
  stand: { hipY: 0.88, pitch: 0, fA: 0, hA: 0, head: 0.05, tilt: 0, ear: 0, eye: 1, jaw: 0.25, tongue: 0.8, wag: 4, wagAmp: 0.45, tail: 0.2 },
  sit: { hipY: 0.36, pitch: -0.85, fA: 0.02, hA: 1.38, hLen: 0.42, head: 0.25, tilt: 0, ear: 0, eye: 1, jaw: 0.3, tongue: 1, wag: 2.2, wagAmp: 0.35, tail: -0.6 },
  lay: { hipY: 0.3, pitch: 0.06, fA: 1.5, fLen: 0.55, hA: 1.35, hLen: 0.42, head: -0.08, tilt: 0.05, ear: -0.1, eye: 0.85, jaw: 0, tongue: 0, wag: 1, wagAmp: 0.15, tail: -0.9 },
  bow: { hipY: 0.88, pitch: 0.42, fA: 1.15, fLen: 0.55, hA: 0, head: -0.45, tilt: 0, ear: 0.2, eye: 1.05, jaw: 0.6, tongue: 1, wag: 11, wagAmp: 0.6, tail: 0.6 },
};
POSES.walk = { ...POSES.stand, gait: 1 };
POSES.sniff = { ...POSES.stand, head: 0.75, jaw: 0, tongue: 0, sniff: 1 };
POSES.bark = { ...POSES.stand, head: -0.3, tilt: 0, ear: 0.3, bark: 1 };
POSES.scratch = { ...POSES.sit, head: 0.15, tilt: 0.35, eye: 0.35, scratch: 1, wagAmp: 0.1 };
POSES.listen = { ...POSES.sit, tilt: -0.28, ear: 0.35, head: 0.1, jaw: 0.15, tongue: 0.3 };
POSES.think = { ...POSES.scratch, eye: 0.85, tilt: 0.3, lookUp: 1 };
POSES.happy = { ...POSES.stand, wag: 11, wagAmp: 0.65, jaw: 0.7, tongue: 1, hop: 1, ear: 0.25 };
POSES.sad = { ...POSES.lay, ear: -0.45, eye: 0.8, lookUp: 1, head: 0.05 };
POSES.sleep = { ...POSES.lay, eye: 0.02, ear: -0.3, head: 0.12, sleep: 1 };

// What he does when left alone, and the routine for each mood.
const ROUTINES = {
  look: [['sit', 5]],
  scratch: [['sit', 0.6], ['scratch', 2.4], ['sit', 1.2]],
  bark: [['stand', 0.7], ['bark', 1.6], ['sit', 1]],
  sniff: [['stand', 0.7], ['sniff', 2.4], ['sit', 1]],
  stretch: [['bow', 1.8], ['sit', 1]],
  circle: [['stand', 0.6], ['walk', 4.2, 'circle'], ['lay', 5.5], ['sit', 1.2]],
};
const IDLE = ['look', 'scratch', 'bark', 'sniff', 'stretch', 'circle', 'look'];
const MOOD_ROUTINE = {
  idle: null,
  listening: [['listen', 99]],
  thinking: [['think', 99]],
  happy: [['bow', 1.1], ['happy', 2.2], ['sit', 1]],
  excited: [['stand', 0.3], ['happy', 1.6, 'spin'], ['bark', 1.4], ['sit', 1]],
  concerned: [['sad', 6], ['sit', 1]],
  sleepy: [['sleep', 99]],
};

/**
 * Create KUDOG in a container. Returns { el, mood, state, start, stop, dispose }, the same interface as the 2D puppet.
 * Throws when WebGL is not available, so the caller can fall back to the 2D puppet.
 */
export function createKudog3D({ label = 'KUDOG', onPet = null, closeUp = null } = {}) {
  const el = document.createElement('div'); el.className = 'kd3';
  el.setAttribute('role', 'img'); el.setAttribute('aria-label', label);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.08;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.append(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 60);
  scene.add(new HemisphereLight(0xfff6e8, 0xb9cfe0, 1.25)); scene.add(new AmbientLight(0xffffff, 0.25));
  const key = new DirectionalLight(0xffffff, 1.9); key.position.set(2.5, 4, 5); scene.add(key);
  const rim = new DirectionalLight(0xbfe3ff, 1.1); rim.position.set(-3, 3, -3); scene.add(rim);
  const d = build(); scene.add(d.root);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // State: the current pose values (damped towards the target pose), the routine being played, the clock.
  const cur = { ...POSES.sit, fLen: 0.7, hLen: 0.7, gait: 0, sniff: 0, bark: 0, scratch: 0, hop: 0, sleep: 0, lookUp: 0 };
  let target = POSES.sit, mood = 'idle', queue = [], step = null, stepT = 0, t = 0, close = false;
  const FACE = 0.12; // he turns a little towards the camera, which sits at three-quarters
  const pos = { x: 0, z: 0, yaw: FACE, spin: 0 };
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  let blinkAt = 1.5, blinkT = -1, petAt = -10, running = false, raf = 0, last = 0, gone = 0, disposed = false, idleAt = 2;

  const play = (routine) => { queue = routine.map(([p, dur, fx]) => ({ p, dur, fx })); next(); };
  function next() {
    step = queue.shift() || null; stepT = 0;
    if (!step) { // back to idle life: sit a while, then something else
      if (mood !== 'idle') { const r = MOOD_ROUTINE[mood]; if (r && r[0][1] >= 99) { play(r); return; } mood = 'idle'; }
      step = { p: 'sit', dur: 2 + Math.random() * 3 }; idleAt = 0;
    }
    if (close && (step.fx === 'circle')) step = { p: 'sit', dur: step.dur }; // too small a stage to walk around
    target = POSES[step.p] || POSES.sit;
  }
  next();

  const resize = () => {
    const w = Math.max(1, el.clientWidth), hh = Math.max(1, el.clientHeight);
    renderer.setSize(w, hh, false); camera.aspect = w / hh;
    close = closeUp ?? Math.min(w, hh) < 90; // small: frame the head, large: the whole dog
    const mid = !close && Math.min(w, hh) < 200; // tour bubbles and pop-ups: a little closer
    if (close) { camera.position.set(0.9, 1.4, 3.0); camera.lookAt(0, 1.2, 0.6); } else if (mid) { camera.position.set(2.7, 1.7, 5.3); camera.lookAt(0.05, 0.78, 0.35); } else { camera.position.set(3.4, 1.9, 6.6); camera.lookAt(0.05, 0.7, 0.35); }
    camera.updateProjectionMatrix(); if (!running) frame(0);
  };
  const ro = new ResizeObserver(resize); ro.observe(el);
  const onMove = (e) => { const r = el.getBoundingClientRect(); look.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 600)); look.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.3)) / 500)); };
  window.addEventListener('pointermove', onMove, { passive: true });
  const ray = new Raycaster(), p2 = new Vector2();
  el.addEventListener('pointerdown', (e) => {
    const r = renderer.domElement.getBoundingClientRect(); p2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p2, camera); if (ray.intersectObject(d.root, true).length) { petAt = t; onPet?.(); if (mood === 'idle' && step?.p !== 'walk') play(ROUTINES.bark.slice(0, 2).concat([['sit', 1]])); }
  });

  const legPose = (leg, angle, fixedLen, attachY, splay = 0) => {
    // World angle from vertical, minus the body pitch, gives the local rotation; free legs reach the ground.
    const cos = Math.cos(angle);
    const len = fixedLen ?? Math.max(0.3, Math.min(1.25, (attachY - 0.07) / Math.max(0.35, cos)));
    leg.len += (len - leg.len) * 0.25;
    leg.g.rotation.x = -angle - d.hips.rotation.x; leg.g.rotation.z += (splay - leg.g.rotation.z) * 0.2;
    leg.shin.scale.y = leg.len; leg.shin.position.y = -leg.len / 2; leg.paw.position.y = -leg.len;
    leg.paw.rotation.x = angle + d.hips.rotation.x; // paws stay flat
  };

  function frame(dt) {
    t += dt; stepT += dt;
    if (!reduce && step && stepT > step.dur) next();
    if (mood === 'idle' && !reduce) { idleAt += dt; if (step?.p === 'sit' && !queue.length && idleAt > 3) { idleAt = -999; play(ROUTINES[IDLE[Math.floor(Math.random() * IDLE.length)]]); } }
    const k = (l) => (dt ? 1 - Math.exp(-l * dt) : 1);
    for (const key2 of Object.keys(cur)) { const tv = target[key2] ?? (['fLen', 'hLen'].includes(key2) ? null : 0); if (tv == null) continue; cur[key2] += (tv - cur[key2]) * k(key2 === 'eye' ? 10 : 4.5); }
    look.x += (look.tx - look.x) * k(4); look.y += (look.ty - look.y) * k(4);
    const pet = Math.max(0, 1 - (t - petAt) / 0.9);

    // Walking in a circle: around the stage, then back to face the trainee.
    if (step?.fx === 'circle' && !close) {
      const u = Math.min(1, stepT / step.dur), a = u * Math.PI * 2, R = 0.75;
      pos.x = Math.sin(a) * R; pos.z = R - Math.cos(a) * R; pos.yaw = a + Math.PI / 2;
      if (u > 0.92) pos.yaw += (FACE + Math.PI * 2 - pos.yaw) * ((u - 0.92) / 0.08);
    } else { pos.x += (0 - pos.x) * k(3); pos.z += (0 - pos.z) * k(3); pos.yaw += (FACE - pos.yaw) * k(4); }
    // Spin jump (excited) and hops (happy).
    let hopY = 0;
    if (step?.fx === 'spin' && !reduce) { const u = Math.min(1, stepT / 1.1); pos.spin = u * Math.PI * 2; hopY = Math.sin(u * Math.PI) * 0.45; } else pos.spin = 0;
    if (cur.hop > 0.3 && !reduce && step?.fx !== 'spin') hopY = Math.abs(Math.sin(stepT * 5.2)) * 0.18 * cur.hop;
    const gaitOn = step?.p === 'walk' || cur.gait > 0.5;
    const ph = t * 9;
    d.root.position.set(pos.x, hopY + (gaitOn ? Math.abs(Math.sin(ph)) * 0.03 : 0), pos.z);
    d.root.rotation.y = pos.yaw + pos.spin + (gaitOn ? 0 : look.x * 0.22);

    // Body: height and pitch, breathing.
    const breathe = Math.sin(t * (cur.sleep > 0.5 ? 1.3 : 2.4)) * (cur.sleep > 0.5 ? 0.02 : 0.012);
    d.hips.position.y = cur.hipY; d.hips.rotation.x = cur.pitch; d.hips.scale.set(1 + breathe, 1 + breathe, 1);
    // Legs (with a walking gait and the scratching hind leg).
    const sw = gaitOn ? 0.42 : 0;
    const hipWorldY = (z, y) => cur.hipY + (y * Math.cos(cur.pitch) - z * Math.sin(cur.pitch));
    legPose(d.legs.fl, cur.fA + Math.sin(ph) * sw, target.fLen, hipWorldY(0.92, -0.12));
    legPose(d.legs.fr, cur.fA - Math.sin(ph) * sw, target.fLen, hipWorldY(0.92, -0.12));
    const scr = cur.scratch > 0.5 && !reduce; // he scratches with the hind leg on the camera's side
    legPose(d.legs.hl, scr ? 2.55 + Math.sin(t * 26) * 0.25 : cur.hA - Math.sin(ph) * sw, scr ? 0.7 : target.hLen, hipWorldY(-0.02, -0.14), scr ? 0.55 : 0);
    legPose(d.legs.hr, cur.hA + Math.sin(ph) * sw, target.hLen, hipWorldY(-0.02, -0.14));
    // Head: keeps level, nods with the pose, follows the pointer, wiggles when petted, sniffs, barks.
    const sniffBob = cur.sniff > 0.5 ? Math.sin(t * 14) * 0.05 : 0;
    d.head.rotation.x = cur.head - cur.pitch + look.y * 0.18 + sniffBob + Math.sin(t * 1.6) * 0.015;
    d.head.rotation.y = gaitOn ? 0 : look.x * 0.5;
    d.head.rotation.z = (scr ? -cur.tilt : cur.tilt) + (scr ? Math.sin(t * 26) * 0.03 : 0) + Math.sin(t * 18) * 0.1 * pet;
    // Jaw and tongue: panting, barking (three snaps), sniffing (closed).
    let jaw = cur.jaw * (0.75 + Math.sin(t * 9) * 0.25);
    let woofOn = 0;
    if (cur.bark > 0.5 && step?.p === 'bark') { const bp = (stepT % 0.5) / 0.5; jaw = bp < 0.3 ? Math.sin((bp / 0.3) * Math.PI) * 1.3 : 0.1; woofOn = stepT < 1.5 ? 1 : 0; }
    d.jaw.rotation.x = jaw * 0.32;
    d.tongue.visible = cur.tongue > 0.1; d.tongue.scale.set(1, 1, Math.max(0.2, cur.tongue));
    // Ears: lifted by the mood, flopping with the motion.
    for (const e of d.ears) {
      e.pivot.rotation.z = e.s * (cur.ear * 0.9 + Math.sin(t * 3 + e.s) * 0.04 + hopY * 1.2 + (gaitOn ? Math.sin(ph * 2) * 0.08 : 0) + (scr && e.s > 0 ? Math.sin(t * 26) * 0.2 : 0)) + Math.sin(t * 16) * 0.12 * pet;
      e.pivot.rotation.x = -0.05 + Math.sin(t * 2.2 + e.s) * 0.05 - cur.ear * 0.4;
    }
    // Tail.
    d.tail.rotation.x = cur.tail; d.tail.rotation.y = Math.sin(t * cur.wag) * cur.wagAmp; d.tailMid.rotation.y = Math.sin(t * cur.wag - 0.7) * cur.wagAmp * 0.8;
    // Eyes: blink, squint while scratching, look up when thinking or worried, follow the pointer.
    if (blinkT < 0 && t > blinkAt && cur.eye > 0.3) blinkT = 0;
    let lid = 1; if (blinkT >= 0) { blinkT += dt; lid = 1 - Math.sin(Math.min(1, blinkT / 0.15) * Math.PI); if (blinkT > 0.15) { blinkT = -1; blinkAt = t + 2.5 + Math.random() * 3.5; } }
    for (const e of d.eyes) {
      const open = Math.min(1.1, cur.eye) * lid; e.g.scale.y = Math.max(0.05, open); e.g.visible = open > 0.22; e.shut.visible = open <= 0.22;
      e.iris.position.set(look.x * 0.025, cur.lookUp * 0.03 - look.y * 0.02, 0);
    }
    d.medal.rotation.z = Math.sin(t * 2.2) * 0.05 + (hopY || gaitOn ? Math.sin(t * 12) * 0.12 : 0); d.medal.rotation.x = -cur.pitch * 0.9;
    // "Woof!" over his head while barking; "z" while asleep.
    const headWorld = d.skull.getWorldPosition(new Vector3());
    d.woof.material.opacity += ((woofOn ? 1 : 0) - d.woof.material.opacity) * k(12);
    d.woof.position.set(headWorld.x - pos.x + 0.55, headWorld.y + 0.55 + (woofOn ? Math.sin(stepT * 6) * 0.03 : 0), headWorld.z - pos.z);
    const zp = (t % 2.6) / 2.6; d.zz.material.opacity = (cur.sleep > 0.5 ? 1 : 0) * Math.sin(zp * Math.PI) * 0.9;
    d.zz.position.set(headWorld.x - pos.x + 0.35 + zp * 0.25, headWorld.y + 0.35 + zp * 0.5, headWorld.z - pos.z);
    renderer.render(scene, camera);
  }
  const loop = (now) => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (el.isConnected) { gone = 0; if (!document.hidden && el.offsetParent !== null) frame(reduce ? 0 : dt); }
    else if (++gone > 180) { api.dispose(); return; } // removed from the page for good: free the GPU
    raf = requestAnimationFrame(loop);
  };
  const api = {
    el,
    mood(m2) {
      if (!(m2 in MOOD_ROUTINE)) m2 = m2 === 'wake' ? 'idle' : 'happy';
      mood = m2; const r = MOOD_ROUTINE[m2];
      if (!r) { queue = []; next(); } else play(r);
      if (reduce || !running) { Object.assign(cur, target); frame(0); }
    },
    state: () => mood,
    /** Holds one pose (for checks and screenshots). */
    hold(p, fx) { mood = 'held'; queue = []; step = { p, dur: 1e9, fx }; stepT = 0; target = POSES[p] || POSES.sit; },
    start() { if (running || disposed) return; running = true; last = 0; raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      if (disposed) return; disposed = true; api.stop(); ro.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { o.geometry?.dispose?.(); const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; mats.forEach((mm) => { mm.map?.dispose?.(); mm.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
  return api;
}
