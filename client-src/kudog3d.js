/* global document, window, ResizeObserver, requestAnimationFrame, cancelAnimationFrame */
// KUDOG in 3D: a real, rigged dog model (Quaternius "Ultimate Animated Animals", CC0, public/kudog/LICENSE-model.txt)
// recoloured as KUDOG (tan and cream coat, soft floppy ears), wearing his lime headset with a microphone and his lime
// collar with KUDOG written on it and a gold KUDOG medal, attached to his head and neck bones so they follow every move.
// Bundled with esbuild into public/kudog3d.bundle.js (npm run build:kudog); the model is public/kudog/kudog.glb.
//
// Motion: the model's own animation clips (idle, look around, sniff, eat, walk, gallop, jump, shake) are blended with
// cross-fades, and poses the clips do not have are layered on the skeleton: sit, lie down and scratch (found by a search
// over the leg angles so the paws rest on the ground), plus tail wags, ear expressions, blinks, barks and the head
// following the pointer. A behaviour engine plays dog routines when he is left alone and answers the app's moods.
import {
  Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, SphereGeometry, CapsuleGeometry, TorusGeometry, CylinderGeometry,
  CircleGeometry, MeshStandardMaterial, MeshBasicMaterial, HemisphereLight, DirectionalLight, AmbientLight, AnimationMixer, LoopOnce, LoopRepeat,
  CanvasTexture, SRGBColorSpace, Matrix4, DoubleSide, Raycaster, Vector2, Vector3, Quaternion, Sprite, SpriteMaterial, ACESFilmicToneMapping, Color,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const MODEL_URL = '/kudog/kudog.glb';
const COAT = { Main: 0xc98340, Main_Light: 0xf2e4cc, Black: 0x2b1d16, Eyes_White: 0xffffff, Eyes_Black: 0x140d09, Eyes_Pupil: 0x4a2a12 };
const NAVY = 0x163a5c, LIME = 0xa8d82c, LIME_DARK = 0x6f9e14, CUSHION = 0x34401a, GOLD = 0xe7b42c, GOLD_DARK = 0xc98b10;

// ---- one load and clean-up of the model, shared by every KUDOG on the page
let modelP = null;
function loadModel() {
  return modelP || (modelP = new GLTFLoader().loadAsync(MODEL_URL).then((g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      // Soft, rounded shading instead of flat facets: weld the vertices and recompute smooth normals.
      const geo = o.geometry; geo.deleteAttribute('normal');
      const welded = mergeVertices(geo, 1e-3); welded.computeVertexNormals(); o.geometry = welded;
    });
    return g;
  }));
}

function canvasTex(w, hgt, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = hgt; draw(cv.getContext('2d')); const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t; }
const medalTexture = () => canvasTex(256, 256, (x) => {
  const g = x.createRadialGradient(100, 90, 20, 128, 128, 128); g.addColorStop(0, '#FFE58A'); g.addColorStop(0.65, '#F2BE2E'); g.addColorStop(1, '#C98B10');
  x.fillStyle = g; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#B57A0C'; x.lineWidth = 10; x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke();
  x.fillStyle = '#7A4A05'; x.font = 'bold 58px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('KUDOG', 128, 132);
});
const collarTexture = () => { const t = canvasTex(1024, 96, (x) => {
  x.fillStyle = '#A6D22E'; x.fillRect(0, 0, 1024, 96);
  x.strokeStyle = '#6E9418'; x.lineWidth = 3; x.setLineDash([10, 8]); for (const y of [14, 82]) { x.beginPath(); x.moveTo(0, y); x.lineTo(1024, y); x.stroke(); }
  x.fillStyle = '#163A5C'; x.font = 'bold 58px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const cx of [140, 512, 884]) x.fillText('KUDOG', cx, 50); // either side of the medal, and at the back
}); return t; };
const wordTexture = (word) => canvasTex(256, 128, (x) => {
  x.fillStyle = '#ffffff'; x.strokeStyle = '#1B5C84'; x.lineWidth = 6; x.beginPath(); x.roundRect(8, 8, 240, 96, 40); x.fill(); x.stroke();
  x.fillStyle = '#1B5C84'; x.font = 'bold 60px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(word, 128, 58);
});
const zTexture = () => canvasTex(64, 64, (x) => { x.fillStyle = '#5b6b7a'; x.font = 'bold 48px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('z', 32, 34); });

// ---- poses layered on top of the clips: bone rotation offsets (radians) and a body drop (dy).
// Sit, lie down and scratch were solved so the paws rest on the ground (rump down, hocks and paws flat, front paws planted).
const both = (b, ax, v) => ({ [`${b}L.${ax}`]: v, [`${b}R.${ax}`]: v });
const AXES = { x: new Vector3(1, 0, 0), y: new Vector3(0, 1, 0), z: new Vector3(0, 0, 1) };
const _q = new Quaternion();
const POSES = {
  stand: { dy: 0 },
  sit: { dy: -1.176, 'Back.x': -0.85, 'Neck1.x': -0.3, 'Head.x': -0.45, ...both('FrontUpperLeg', 'x', 0.98), ...both('BackLeg', 'x', -0.4), ...both('BackUpperLeg', 'x', -0.7), ...both('BackLowerLeg', 'x', -1.1) },
  lay: { dy: -1.145, 'Back.x': -0.1, 'Neck1.x': 0.2, ...both('FrontUpperLeg', 'x', -0.9), ...both('FrontLowerLeg', 'x', 0.2), ...both('BackLeg', 'x', -0.3), ...both('BackUpperLeg', 'x', 0.9), ...both('BackLowerLeg', 'x', 1.4) },
};
POSES.scratch = { ...POSES.sit, 'BackShoulderL.z': -0.2, 'BackLegL.x': -1.9, 'BackUpperLegL.x': -0.4, 'Neck2.y': 0.35, 'Neck1.x': -0.2, 'Head.x': -0.3 };
POSES.listen = { ...POSES.sit, 'Head.y': -0.32, 'Head.x': -0.3 };
POSES.think = { ...POSES.sit, 'Head.y': 0.3, 'Head.x': -0.15 };
POSES.sad = { ...POSES.lay, 'Neck1.x': -0.1, 'Head.x': -0.2 };
POSES.sleep = { ...POSES.lay, 'Neck1.x': -0.45, 'Neck2.x': -0.2, 'Head.x': -0.25, 'Head.z': 0.25, 'Head.y': 0.15, ...both('Ear1', 'x', 0.6) };

// ---- routines: steps of { clip, pose, dur, move, fx, speed }
const R = {
  look: [{ clip: 'Idle_2', pose: 'stand', dur: 3.33 }],
  sniff: [{ clip: 'Idle_2_HeadLow', pose: 'stand', dur: 4 }],
  dig: [{ clip: 'Eating', pose: 'stand', dur: 5.3 }],
  sit: [{ clip: 'Idle', pose: 'sit', dur: 7 }],
  sitLook: [{ clip: 'Idle_2', pose: 'sit', dur: 6.6 }],
  scratch: [{ clip: 'Idle', pose: 'sit', dur: 1.2 }, { clip: 'Idle', pose: 'scratch', dur: 2.4, fx: 'scratch' }, { clip: 'Idle', pose: 'sit', dur: 2.5 }],
  bark: [{ clip: 'Idle', pose: 'stand', dur: 0.6 }, { clip: 'Idle', pose: 'stand', dur: 1.7, fx: 'bark' }, { clip: 'Idle', pose: 'stand', dur: 1.5 }],
  shake: [{ clip: 'Idle_HitReact1', pose: 'stand', dur: 0.67 }, { clip: 'Idle_HitReact2', pose: 'stand', dur: 0.67 }, { clip: 'Idle', pose: 'stand', dur: 1 }],
  circleLay: [{ clip: 'Walk', pose: 'stand', dur: 6.4, move: 'circle' }, { clip: 'Idle', pose: 'stand', dur: 0.6 }, { clip: 'Idle', pose: 'lay', dur: 8 }, { clip: 'Idle', pose: 'sit', dur: 3 }],
};
const IDLE = ['sitLook', 'scratch', 'bark', 'sniff', 'dig', 'circleLay', 'look', 'shake', 'sit'];
const MOODS = {
  idle: null,
  listening: [{ clip: 'Idle', pose: 'listen', dur: 99, fx: 'wagSoft' }],
  thinking: [{ clip: 'Idle', pose: 'think', dur: 2.5 }, { clip: 'Idle', pose: 'scratch', dur: 1.8, fx: 'scratch' }, { clip: 'Idle', pose: 'think', dur: 99 }],
  bark: [...R.bark, { clip: 'Idle', pose: 'sit', dur: 2, fx: 'wagSoft' }],
  happy: [{ clip: 'Jump_ToIdle', pose: 'stand', dur: 1.33, fx: 'wagFast' }, { clip: 'Idle', pose: 'stand', dur: 2, fx: 'wagFast' }, { clip: 'Idle', pose: 'sit', dur: 2 }],
  excited: [{ clip: 'Gallop', pose: 'stand', dur: 2.6, move: 'circleFast', fx: 'wagFast' }, { clip: 'Gallop_Jump', pose: 'stand', dur: 0.93 }, { clip: 'Idle', pose: 'stand', dur: 1.7, fx: 'bark' }, { clip: 'Idle', pose: 'sit', dur: 2 }],
  concerned: [{ clip: 'Idle', pose: 'sad', dur: 7, fx: 'earsDown' }, { clip: 'Idle', pose: 'sit', dur: 2 }],
  sleepy: [{ clip: 'Idle', pose: 'lay', dur: 1.5 }, { clip: 'Idle', pose: 'sleep', dur: 99, fx: 'sleep', speed: 0.35 }],
};

/**
 * Create KUDOG. Returns at once { el, ready, mood, state, start, stop, dispose, hold }; `ready` resolves when the model
 * is on screen. Throws when WebGL is not available (the caller keeps the 2D puppet).
 */
export function createKudog3D({ label = 'KUDOG', onPet = null, closeUp = null, face = -0.35 } = {}) {
  const el = document.createElement('div'); el.className = 'kd3';
  el.setAttribute('role', 'img'); el.setAttribute('aria-label', label);
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace; renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  el.append(renderer.domElement);
  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 80);
  scene.add(new HemisphereLight(0xfff4e6, 0xaec4d6, 1.35)); scene.add(new AmbientLight(0xffffff, 0.2));
  const key = new DirectionalLight(0xffffff, 2.1); key.position.set(4, 7, 6); scene.add(key);
  const rim = new DirectionalLight(0xcfe8ff, 1.2); rim.position.set(-5, 4, -4); scene.add(rim);
  // A soft contact shadow under him.
  const shadow = new Mesh(new CircleGeometry(1.6, 40), new MeshBasicMaterial({ color: 0x1b3a52, transparent: true, opacity: 0.1, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.01; shadow.scale.set(1, 1.7, 1); scene.add(shadow);
  // An invisible floor: it writes depth only, so anything below ground level is hidden as a real floor would hide it.
  const floor = new Mesh(new CircleGeometry(30, 32), new MeshBasicMaterial({ colorWrite: false }));
  floor.rotation.x = -Math.PI / 2; floor.renderOrder = -1; scene.add(floor);
  const root = new Group(); scene.add(root);
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  let model = null, mixer = null, curAction = null, fur = null, medal = null;
  const bones = {}, actions = {}, eyeMats = [];
  const woof = new Sprite(new SpriteMaterial({ map: wordTexture('Woof!'), transparent: true, opacity: 0, depthWrite: false })); woof.scale.set(1.3, 0.65, 1); scene.add(woof);
  const zz = new Sprite(new SpriteMaterial({ map: zTexture(), transparent: true, opacity: 0, depthWrite: false })); zz.scale.set(0.45, 0.45, 1); scene.add(zz);

  let mood = 'idle', queue = [], step = null, stepT = 0, t = 0, close = false, running = false, raf = 0, last = 0, gone = 0, disposed = false;
  let idleNext = 4, blinkAt = 2, blinkT = -1, petAt = -10, curDy = 0, applied = [];
  const cur = {};
  const look = { x: 0, y: 0, tx: 0, ty: 0 };
  const pos = { x: 0, z: 0, yaw: face };
  const FACE = face; // he stands at three-quarters to the camera

  const ONCE = new Set(['Jump_ToIdle', 'Gallop_Jump', 'Idle_HitReact1', 'Idle_HitReact2']);
  function fade(name, speed = 1) {
    const a = actions[name] || actions.Idle; if (!a) return;
    a.timeScale = speed;
    if (a === curAction) return;
    a.reset(); a.enabled = true; a.setEffectiveWeight(1);
    if (ONCE.has(name)) { a.setLoop(LoopOnce, 1); a.clampWhenFinished = true; } else a.setLoop(LoopRepeat, Infinity);
    a.play(); if (curAction) curAction.crossFadeTo(a, reduce ? 0 : 0.35, false); curAction = a;
  }
  const play = (steps) => { queue = steps.map((s) => ({ ...s })); next(); };
  function next() {
    step = queue.shift() || null; stepT = 0;
    if (!step) {
      if (mood !== 'idle') { const r = MOODS[mood]; if (r && r.at(-1).dur >= 99) { play(r.slice(-1)); return; } mood = 'idle'; }
      step = { clip: 'Idle', pose: 'sit', dur: 1e9 }; idleNext = 3 + Math.random() * 4;
    }
    if (close && step.move) step = { clip: 'Idle', pose: 'sit', dur: 3 };
    fade(step.clip, step.speed || 1);
  }

  const resize = () => {
    const w = Math.max(1, el.clientWidth), hh = Math.max(1, el.clientHeight);
    renderer.setSize(w, hh, false); camera.aspect = w / hh;
    close = closeUp ?? Math.min(w, hh) < 90; const mid = !close && Math.min(w, hh) < 200;
    if (close) { camera.position.set(2.6, 2.75, 5.6); camera.lookAt(0.05, 2.25, 1.5); }
    else if (mid) { camera.position.set(6.8, 3.4, 9.6); camera.lookAt(0, 1.45, 0.2); }
    else { camera.position.set(8.2, 4.2, 11.8); camera.lookAt(-0.4, 1.35, 0.3); }
    camera.updateProjectionMatrix(); if (!running && model) frame(0);
  };
  const ro = new ResizeObserver(resize); ro.observe(el);
  const onMove = (e) => { const r = el.getBoundingClientRect(); look.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / 600)); look.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height * 0.3)) / 500)); };
  window.addEventListener('pointermove', onMove, { passive: true });
  const ray = new Raycaster(), p2 = new Vector2();
  el.addEventListener('pointerdown', (e) => {
    if (!model) return;
    const r = renderer.domElement.getBoundingClientRect(); p2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(p2, camera);
    if (ray.intersectObject(root, true).length) { petAt = t; onPet?.(); if (mood === 'idle' && !step?.move) play(R.shake); }
  });

  // ---- build: the model, his coat and eyes, the headset and the medal
  function setup(g) {
    model = cloneSkinned(g.scene); root.add(model);
    model.traverse((o) => {
      if (o.isBone) bones[o.name.replace(/\./g, '')] = o;
      if (o.isMesh) {
        o.frustumCulled = false;
        const name = o.material.name, col = COAT[name] ?? 0xcccccc;
        const mat = new MeshStandardMaterial({ color: col, roughness: name.startsWith('Eyes') ? 0.25 : 0.82, metalness: 0 });
        mat.name = name; o.material = mat;
        if (name === 'Main') fur = mat;
        if (name.startsWith('Eyes')) eyeMats.push({ mat, col: new Color(col) });
      }
    });
    model.updateMatrixWorld(true);
    const W = (b) => bones[b].getWorldPosition(new Vector3());
    const std = (c, o = {}) => new MeshStandardMaterial({ color: c, roughness: 0.45, ...o });
    const lime = std(LIME), limeDark = std(LIME_DARK), cush = std(CUSHION, { roughness: 0.85 }), gold = std(GOLD, { roughness: 0.3, metalness: 0.55 }), goldDark = std(GOLD_DARK, { roughness: 0.3, metalness: 0.6 });
    const put = (parentBone, obj) => { scene.add(obj); obj.updateMatrixWorld(true); bones[parentBone].attach(obj); return obj; };
    const stick = (a, b, r, mat) => { const A = new Vector3(...a), B = new Vector3(...b), dir = B.clone().sub(A), len = dir.length();
      const o = new Mesh(new CapsuleGeometry(r, len, 4, 10), mat); o.position.copy(A).add(B).multiplyScalar(0.5); o.quaternion.copy(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize())); return o; };
    // Conferencing headset (the interpreter's tool, the heart of KUDO): padded navy headband with a lime stripe, large
    // over-ear cups with cushions and a lime accent ring, a boom microphone with a foam windscreen at his mouth and a
    // small lime "live" light. Built at the rest pose around the head, then attached to the Head bone.
    const navy = std(NAVY, { roughness: 0.5 }), foam = std(0x1d2126, { roughness: 1 }), live = new MeshBasicMaterial({ color: LIME });
    const hd = W('Head');
    const set = new Group(); set.position.set(hd.x, hd.y + 0.02, hd.z - 0.08);
    const band = new Mesh(new TorusGeometry(0.37, 0.05, 12, 44, Math.PI), navy); band.scale.set(1, 1.1, 1.25); set.add(band);
    const stripe = new Mesh(new TorusGeometry(0.42, 0.018, 8, 44, Math.PI), lime); stripe.scale.set(0.98, 1.06, 1.3); set.add(stripe);
    const under = new Mesh(new TorusGeometry(0.33, 0.035, 10, 44, Math.PI * 0.7), cush); under.rotation.z = Math.PI * 0.15; under.scale.set(1, 1.1, 1.6); set.add(under);
    for (const s of [-1, 1]) {
      const cup = new Mesh(new CylinderGeometry(0.17, 0.16, 0.12, 32), navy); cup.rotation.z = Math.PI / 2; cup.position.set(0.39 * s, -0.02, 0); set.add(cup);
      const ringA = new Mesh(new TorusGeometry(0.15, 0.02, 8, 32), lime); ringA.rotation.y = Math.PI / 2; ringA.position.set(0.455 * s, -0.02, 0); set.add(ringA);
      const cap = new Mesh(new CylinderGeometry(0.09, 0.09, 0.02, 24), limeDark); cap.rotation.z = Math.PI / 2; cap.position.set(0.46 * s, -0.02, 0); set.add(cap);
      const pad = new Mesh(new TorusGeometry(0.135, 0.045, 10, 28), cush); pad.rotation.y = Math.PI / 2; pad.position.set(0.32 * s, -0.02, 0); set.add(pad);
      set.add(stick([0.4 * s, 0.13, 0], [0.37 * s, 0.25, 0], 0.03, lime)); // yoke
    }
    // Boom microphone from the right cup to the corner of his mouth.
    set.add(stick([0.46, -0.06, 0.06], [0.38, -0.24, 0.4], 0.024, navy)); set.add(stick([0.38, -0.24, 0.4], [0.17, -0.3, 0.64], 0.022, navy));
    const pivot = new Mesh(new SphereGeometry(0.045, 14, 10), navy); pivot.position.set(0.46, -0.06, 0.06); set.add(pivot);
    const led = new Mesh(new SphereGeometry(0.02, 10, 8), live); led.position.set(0.5, -0.03, 0.09); set.add(led);
    const mic = new Mesh(new CapsuleGeometry(0.055, 0.06, 6, 14), foam); mic.position.set(0.13, -0.31, 0.67); mic.rotation.z = Math.PI / 2.4; set.add(mic);
    put('Head', set);
    // Collar: a lime band around the base of his neck with KUDOG written along it, a gold ring at the front and the
    // KUDOG medal hanging from it. Fitted to his neck: the band follows the coat's own cross-section there.
    const n1 = W('Neck1'), n2 = W('Neck2'), axis = n2.clone().sub(n1).normalize();
    const C = n1.clone().addScaledVector(axis, n2.distanceTo(n1) * 0.65);
    const side = new Vector3(1, 0, 0), fwd = new Vector3().crossVectors(side, axis); if (fwd.z < 0) fwd.negate();
    const ring = [], v = new Vector3();
    model.traverse((o) => { if (!o.isMesh || o.material.name !== 'Main' && o.material.name !== 'Main_Light') return; const pa = o.geometry.attributes.position;
      for (let i = 0; i < pa.count; i++) { v.fromBufferAttribute(pa, i); if (o.isSkinnedMesh) o.applyBoneTransform(i, v); v.applyMatrix4(o.matrixWorld).sub(C); if (Math.abs(v.dot(axis)) < 0.09) ring.push(v.clone()); } });
    const ext = (dir) => { const d = ring.map((p) => p.dot(dir)).sort((x, y) => x - y); return d.length ? [d[0], d[d.length - 1]] : [-0.3, 0.3]; };
    const [s0, s1] = ext(side), [f0, f1] = ext(fwd);
    const centre = C.clone().addScaledVector(side, (s0 + s1) / 2).addScaledVector(fwd, (f0 + f1) / 2);
    const rx = (s1 - s0) / 2 + 0.015, rz = (f1 - f0) / 2 + 0.015;
    const collar = new Group(); collar.position.copy(centre);
    collar.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(side, axis, fwd));
    const strap = new Mesh(new CylinderGeometry(1, 1, 0.19, 64, 1, true), new MeshStandardMaterial({ map: collarTexture(), roughness: 0.6, side: DoubleSide }));
    strap.scale.set(rx, 1, rz); strap.rotation.y = -Math.PI / 2; collar.add(strap);
    for (const e of [-1, 1]) { const rim = new Mesh(new TorusGeometry(1, 0.012, 6, 64), limeDark); rim.rotation.x = Math.PI / 2; rim.scale.set(rx, rz, 1); rim.position.y = e * 0.095; collar.add(rim); }
    const dring = new Mesh(new TorusGeometry(0.045, 0.013, 8, 18), gold); dring.position.set(0, -0.04, rz + 0.01); collar.add(dring);
    // The medal hangs from the ring, pivoting at the top so it swings like a tag.
    medal = new Group(); medal.position.set(0, -0.08, rz + 0.03); collar.add(medal);
    const tag = new Group(); tag.position.y = -0.2; tag.scale.setScalar(1.25); medal.add(tag);
    const disc = new Mesh(new CylinderGeometry(0.15, 0.15, 0.035, 36), gold); disc.rotation.x = Math.PI / 2; tag.add(disc);
    tag.add(new Mesh(new TorusGeometry(0.15, 0.018, 8, 36), goldDark));
    const face = new Mesh(new CircleGeometry(0.14, 36), new MeshBasicMaterial({ map: medalTexture() })); face.position.z = 0.019; tag.add(face);
    const loop = new Mesh(new TorusGeometry(0.03, 0.012, 8, 14), gold); loop.position.y = 0.16; tag.add(loop);
    scene.add(collar); collar.updateMatrixWorld(true); medal.quaternion.premultiply(collar.quaternion.clone().invert()); // keep the medal upright, facing forward
    put('Neck1', collar);
    mixer = new AnimationMixer(model);
    for (const c of g.animations) actions[c.name] = mixer.clipAction(c);
    if (mood === 'held' && step) fade(step.clip, step.speed || 1); else next();
    resize();
  }

  function applyLayer(dt) {
    const target = POSES[step?.pose] || POSES.stand;
    const k = dt ? 1 - Math.exp(-5 * dt) : 1;
    const keys = new Set([...Object.keys(cur), ...Object.keys(target)]); keys.delete('dy');
    for (const key2 of keys) cur[key2] = (cur[key2] || 0) + ((target[key2] || 0) - (cur[key2] || 0)) * k;
    curDy += ((target.dy || 0) - curDy) * k;
    const add = (key2, v) => { const [bn, ax] = key2.split('.'); const b = bones[bn]; if (!b || !v) return; b.quaternion.multiply(_q.setFromAxisAngle(AXES[ax], v)); applied.push([b, ax, v]); };
    for (const key2 of keys) add(key2, cur[key2]);
    const fx = step?.fx || '';
    // Scratching: fast kicks of the lifted hind leg, the head leaning into it.
    if (fx === 'scratch' && !reduce) { add('BackLegL.x', Math.sin(t * 22) * 0.22); add('BackUpperLegL.x', Math.sin(t * 22 + 0.5) * 0.3); add('Neck2.y', Math.sin(t * 22) * 0.03); }
    // Barking: three sharp head snaps up.
    if (fx === 'bark' && !reduce) { const bp = (stepT % 0.55) / 0.55; const snap = bp < 0.28 ? Math.sin((bp / 0.28) * Math.PI) : 0; add('Neck2.x', snap * 0.35); add('Head.x', snap * 0.25); }
    // Tail: a wag, faster when happy, low when sad, still when asleep.
    const wag = fx === 'wagFast' ? [13, 0.55] : fx === 'wagSoft' ? [5, 0.25] : fx === 'sleep' || fx === 'earsDown' ? [1.2, 0.05] : step?.move ? [7, 0.3] : [3.4, 0.2];
    add('Tail1.z', Math.sin(t * wag[0]) * wag[1]); add('Tail2.z', Math.sin(t * wag[0] - 0.8) * wag[1] * 0.7);
    // Asleep: slow, deep breathing through the chest.
    if (fx === 'sleep' && !reduce) { const br = Math.sin(t * 1.5); add('Back.x', br * 0.025); add('Neck1.x', br * 0.02); }
    if (fx === 'earsDown') { add('Ear1L.x', 0.8); add('Ear1R.x', 0.8); }
    // Ears: soft and floppy, with a twitch now and then.
    const tw = Math.max(0, Math.sin(t * 0.9)) ** 30;
    add('Ear1L.z', 0.55 + tw * 0.25); add('Ear1R.z', -0.55); add('Ear2L.z', 0.45); add('Ear2R.z', -0.45);
    // Head follows the pointer when he is not busy.
    if (!step?.move && fx !== 'sleep' && fx !== 'scratch') { add('Head.z', -look.x * 0.45); add('Head.x', -look.y * 0.25); }
    // Petted: a happy head wiggle.
    const pet = Math.max(0, 1 - (t - petAt) / 0.9); if (pet) add('Head.y', Math.sin(t * 18) * 0.12 * pet);
  }

  function frame(dt) {
    if (!model) return;
    t += dt; stepT += dt;
    if (!reduce && step && stepT > step.dur) next();
    if (mood === 'idle' && !reduce && !queue.length && step?.dur >= 1e9) { idleNext -= dt; if (idleNext < 0) play(R[IDLE[Math.floor(Math.random() * IDLE.length)]]); }
    const kl = dt ? 1 - Math.exp(-4 * dt) : 1; look.x += (look.tx - look.x) * kl; look.y += (look.ty - look.y) * kl;
    // Walking routes: a circle that brings him back where he started, at walking or galloping pace.
    const mv = step?.move && !close ? step.move : null;
    if (mv) {
      const u = Math.min(1, stepT / step.dur), rad = mv === 'circleFast' ? 2.0 : 1.7, a = u * Math.PI * 2;
      pos.x = -rad + rad * Math.cos(a); pos.z = rad * Math.sin(a); pos.yaw = Math.atan2(-Math.sin(a), Math.cos(a));
    } else { const k = dt ? 1 - Math.exp(-3 * dt) : 1; pos.x += (0 - pos.x) * k; pos.z += (0 - pos.z) * k; pos.yaw += (FACE - pos.yaw) * k; }
    root.position.set(pos.x, curDy, pos.z); root.rotation.y = pos.yaw;
    shadow.position.set(pos.x, 0.01, pos.z); shadow.rotation.z = -pos.yaw;
    // Undo last frame's offsets before the clips pose the skeleton (bones the clips do not animate would otherwise drift).
    for (let i = applied.length - 1; i >= 0; i--) { const [b, ax, v] = applied[i]; b.quaternion.multiply(_q.setFromAxisAngle(AXES[ax], -v)); }
    applied = [];
    if (mixer) mixer.update(reduce ? 0 : dt);
    applyLayer(dt);
    // Blink by giving the eyes the coat colour for a moment; closed while asleep.
    if (blinkT < 0 && t > blinkAt) blinkT = 0;
    let shut = step?.fx === 'sleep' && stepT > 2.4;
    if (blinkT >= 0) { blinkT += dt; shut = true; if (blinkT > 0.13) { blinkT = -1; blinkAt = t + 2.5 + Math.random() * 3.5; } }
    for (const e of eyeMats) e.mat.color.copy(shut ? fur.color : e.col);
    if (medal) medal.rotation.z = Math.sin(t * 2.1) * 0.06 + (mv ? Math.sin(t * 11) * 0.15 : 0);
    // "Woof!" while barking and "z" while asleep, above his head.
    const head = bones.Head?.getWorldPosition(new Vector3());
    if (head) {
      const barking = step?.fx === 'bark' && stepT < 1.6;
      woof.material.opacity += ((barking ? 1 : 0) - woof.material.opacity) * (dt ? 1 - Math.exp(-12 * dt) : 1);
      woof.position.set(head.x + 0.9, head.y + 1.0 + (barking ? Math.sin(stepT * 7) * 0.05 : 0), head.z);
      const zp = (t % 2.6) / 2.6; zz.material.opacity = (step?.fx === 'sleep' && stepT > 2.4 ? 1 : 0) * Math.sin(zp * Math.PI) * 0.9;
      zz.position.set(head.x + 0.4 + zp * 0.4, head.y + 0.5 + zp * 0.7, head.z);
    }
    renderer.render(scene, camera);
  }
  const loopFn = (now) => {
    if (!running) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now;
    if (el.isConnected) { gone = 0; if (!document.hidden && el.offsetParent !== null) frame(reduce ? 0 : dt); }
    else if (++gone > 180) { api.dispose(); return; } // removed from the page for good: free the GPU
    raf = requestAnimationFrame(loopFn);
  };
  const api = {
    el,
    mood(m2) {
      if (!(m2 in MOODS)) m2 = m2 === 'wake' ? 'idle' : 'happy';
      mood = m2; if (!model) return;
      const r = MOODS[m2];
      if (!r) { queue = []; next(); } else play(r);
      if (reduce || !running) frame(0);
    },
    state: () => mood,
    /** Holds one routine step (for checks and screenshots). */
    hold(s) { mood = 'held'; queue = []; step = { dur: 1e9, clip: 'Idle', pose: 'stand', ...s }; stepT = 0; if (model) fade(step.clip, step.speed || 1); },
    start() { if (running || disposed) return; running = true; last = 0; raf = requestAnimationFrame(loopFn); },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      if (disposed) return; disposed = true; api.stop(); ro.disconnect(); window.removeEventListener('pointermove', onMove);
      scene.traverse((o) => { if (o.isSkinnedMesh) return; o.geometry?.dispose?.(); const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; mats.forEach((mm) => { mm.map?.dispose?.(); mm.dispose(); }); });
      renderer.dispose(); renderer.forceContextLoss?.();
    },
  };
  api.ready = loadModel().then((g) => { if (disposed) return; setup(g); if (mood !== 'idle' && mood !== 'held') api.mood(mood); });
  return api;
}
