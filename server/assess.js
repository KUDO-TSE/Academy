// Assessment engine: item pools, random draws, grading and decision walkthroughs.
// Guessing is handled three ways:
//  - single-answer questions ask for certainty (certainty-based marking, Gardner-Medwin):
//    right at low/mid/high certainty = 1/2/3, wrong = 0/-2/-6; a lucky low-certainty answer only counts half towards the level;
//  - "pick all that fit" questions: every wrong pick cancels a right one;
//  - matching gives credit per pair; ordering gives credit per step correctly followed by the next one, so a random
//    order scores close to nothing and one misplaced step does not wipe out a sequence that is otherwise right;
//  - options and walkthrough choices are shuffled every time they are shown. The order is sealed in an encrypted token
//    that the browser sends back, so neither the screen nor the network traffic shows where the answer sits.
import crypto from 'node:crypto';
import { MODULES, MODULE_BY_KEY } from './curriculum.js';
import { EXTRA_ITEMS, WALKTHROUGHS } from './curriculum-extra.js';
import { BANK } from './curriculum-bank.js';

export const DRAW = 6;
const CBM = { 1: [1, 0], 2: [2, -2], 3: [3, -6] };

export const POOLS = Object.fromEntries(MODULES.map((m) => [m.key, [...m.quiz, ...(EXTRA_ITEMS[m.key] || []), ...(BANK[m.key] || [])].map((x, i) => ({ t: 'mcq', ...x, id: `${m.key}.${i}`, module: m.key, scenario: m.scenario }))]));
const BY_ID = new Map(Object.values(POOLS).flat().map((x) => [x.id, x]));
export const itemById = (id) => BY_ID.get(id) || null;
// Questions written by an admin from a session recording ("field" questions) join the pool of their module.
export function registerItem(x) {
  const m = MODULE_BY_KEY[x.module]; if (!m || !POOLS[x.module]) return null;
  unregisterItem(x.id);
  const it = { t: 'mcq', ...x, scenario: m.scenario, field: true };
  POOLS[x.module].push(it); BY_ID.set(it.id, it); return it;
}
export function unregisterItem(id) {
  const it = BY_ID.get(id); if (!it || !it.field) return;
  const p = POOLS[it.module]; const i = p.indexOf(it); if (i >= 0) p.splice(i, 1); BY_ID.delete(id);
}

// ------------------------------------------------------------------ sealed option order
const SEAL_KEY = crypto.createHash('sha256').update(`${process.env.SESSION_SECRET || 'dev-only-secret-not-for-production'}|option-order`).digest();
export function seal(obj) {
  const iv = crypto.randomBytes(12), c = crypto.createCipheriv('aes-256-gcm', SEAL_KEY, iv);
  const body = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), body]).toString('base64url');
}
export function unseal(tok) {
  try {
    const b = Buffer.from(String(tok || ''), 'base64url'); if (b.length < 29 || b.length > 2048) return null;
    const d = crypto.createDecipheriv('aes-256-gcm', SEAL_KEY, b.subarray(0, 12)); d.setAuthTag(b.subarray(12, 28));
    return JSON.parse(Buffer.concat([d.update(b.subarray(28)), d.final()]).toString('utf8'));
  } catch { return null; }
}
const permOf = (n) => shuffle([...Array(n).keys()]);
const validPerm = (p, n) => Array.isArray(p) && p.length === n && new Set(p).size === n && p.every((i) => Number.isInteger(i) && i >= 0 && i < n);

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** A fresh draw for each attempt: at least one of each format the module has, the rest at random. */
// Reserve items (parallel forms) are kept back until the second assessment cycle opens.
const usable = (x, reserve) => !x.retired && (reserve || !x.reserve);
export function draw(moduleKey, n = DRAW, { reserve = false } = {}) {
  const pool = (POOLS[moduleKey] || []).filter((x) => usable(x, reserve));
  if (pool.length <= n) return shuffle(pool);
  const picked = [];
  for (const t of ['multi', 'match', 'order']) { const c = shuffle(pool.filter((x) => x.t === t))[0]; if (c) picked.push(c); }
  for (const x of shuffle(pool)) { if (picked.length >= n) break; if (!picked.includes(x)) picked.push(x); }
  return shuffle(picked);
}
export function drawMixed(moduleKeys, n = 4, { reserve = false } = {}) {
  const pool = shuffle(moduleKeys.flatMap((k) => POOLS[k] || []).filter((x) => usable(x, reserve)));
  const out = []; const seen = new Set();
  for (const x of pool) { if (out.length >= n) break; if (seen.has(x.module) && pool.length > n * 2) continue; seen.add(x.module); out.push(x); }
  return out;
}

export function publicItem(x) {
  const base = { id: x.id, t: x.t, q: x.q, module: x.module, scenario: x.scenario || null };
  if (x.t === 'mcq' || x.t === 'multi') {
    const p = permOf(x.o.length);
    return { ...base, o: p.map((i) => x.o[i]), k: seal({ i: x.id, p }), ...(x.t === 'multi' ? { pick: x.a.length } : {}) };
  }
  if (x.t === 'match') return { ...base, lefts: x.pairs.map((p) => p[0]), rights: shuffle([...new Set(x.pairs.map((p) => p[1]))]) };
  if (x.t === 'order') return { ...base, steps: shuffle(x.steps) };
  return base;
}

function gradeOne(x, ans) {
  const v = ans?.v, c = [1, 2, 3].includes(ans?.c) ? ans.c : 2;
  if (x.t === 'mcq') {
    const ok = Number.isInteger(v) && v === x.a;
    return { score: ok ? 1 : 0, knowledge: ok ? (c === 1 ? 0.5 : 1) : 0, cbm: CBM[c][ok ? 0 : 1], conf: c, confidentWrong: !ok && c === 3, correct: { a: x.a, o: x.o }, given: Number.isInteger(v) ? v : null };
  }
  if (x.t === 'multi') {
    const picks = Array.isArray(v) ? [...new Set(v.filter(Number.isInteger))] : [];
    const tp = picks.filter((p) => x.a.includes(p)).length, fp = picks.length - tp;
    const s = Math.max(0, (tp - fp) / x.a.length);
    return { score: s, knowledge: s, correct: { a: x.a, o: x.o }, picks };
  }
  if (x.t === 'match') {
    const arr = Array.isArray(v) ? v : [];
    const right = x.pairs.filter((p, i) => arr[i] === p[1]).length;
    const s = right / x.pairs.length;
    return { score: s, knowledge: s, correct: { pairs: x.pairs }, given: arr };
  }
  if (x.t === 'order') {
    const arr = Array.isArray(v) ? v : [];
    // Credit for each step that is directly followed by the step that should come next.
    const n = x.steps.length;
    const right = x.steps.slice(0, -1).filter((st, i) => { const at = arr.indexOf(st); return at >= 0 && arr[at + 1] === x.steps[i + 1]; }).length;
    const s = n > 1 ? right / (n - 1) : (arr[0] === x.steps[0] ? 1 : 0);
    return { score: s, knowledge: s, correct: { steps: x.steps }, given: arr };
  }
  return { score: 0, knowledge: 0 };
}

/** answers: [{ id, v, c }] where v is an index (mcq), an index list (multi), a list of chosen answers (match) or the steps in order (order). */
export function grade(answers, allowed) {
  const results = [];
  for (const raw of answers) {
    const x = itemById(raw?.id);
    if (!x || (allowed && !allowed(x))) return { error: 'Unknown question.' };
    let a = raw;
    if (x.t === 'mcq' || x.t === 'multi') {
      const sealed = unseal(raw?.k);
      if (!sealed || sealed.i !== x.id || !validPerm(sealed.p, x.o.length)) return { error: 'These questions have expired. Reload the page to get a fresh set.' };
      const map = (v) => (Number.isInteger(v) && v >= 0 && v < sealed.p.length ? sealed.p[v] : -1);
      a = { ...raw, v: x.t === 'mcq' ? map(raw.v) : (Array.isArray(raw.v) ? raw.v.map(map).filter((v) => v >= 0) : []) };
    }
    results.push({ id: x.id, t: x.t, q: x.q, module: x.module, scenario: x.scenario, why: x.why, ...gradeOne(x, a) });
  }
  const r2 = (n) => Math.round(n * 100) / 100;
  const total = results.length;
  const correct = r2(results.reduce((s, r) => s + r.score, 0));
  const knowledge = r2(results.reduce((s, r) => s + r.knowledge, 0));
  const mcq = results.filter((r) => r.t === 'mcq');
  const cbm = mcq.length ? r2(mcq.reduce((s, r) => s + r.cbm, 0) / mcq.length) : null;
  return { results, total, correct, knowledge, cbm, confidentWrong: results.filter((r) => r.confidentWrong).length };
}

// ------------------------------------------------------------------ walkthroughs
export const hasWalkthrough = (k) => !!WALKTHROUGHS[k];
export function walkthroughIntro(k) {
  const w = WALKTHROUGHS[k]; if (!w) return null;
  return { title: w.title, intro: w.intro, steps: w.steps.length, first: presentStep(k, 0) };
}
function presentStep(k, i) {
  const st = WALKTHROUGHS[k].steps[i], p = permOf(st.choices.length);
  return { text: st.text, choices: p.map((j) => st.choices[j].t), k: seal({ w: k, s: i, p }) };
}
/** Stateless walk: the client sends the choices so far; the server returns feedback on them and the next step (or the end). */
/** path = the positions clicked, as shown; keys = the sealed order of each step as it was shown. */
export function walk(k, path, keys) {
  const w = WALKTHROUGHS[k]; if (!w) return { error: 'Not found.' };
  if (!Array.isArray(path) || path.length < 1 || path.length > w.steps.length) return { error: 'Invalid path.' };
  if (!Array.isArray(keys) || keys.length !== path.length) return { error: 'This walkthrough has expired. Reload the page and start again.' };
  const done = [], orig = [];
  for (const [i, shown] of path.entries()) {
    const sealed = unseal(keys[i]);
    if (!sealed || sealed.w !== k || sealed.s !== i || !validPerm(sealed.p, w.steps[i].choices.length)) return { error: 'This walkthrough has expired. Reload the page and start again.' };
    const ch = Number.isInteger(shown) ? sealed.p[shown] : undefined;
    const c = w.steps[i].choices[ch];
    if (!Number.isInteger(ch) || !c) return { error: 'Invalid choice.' };
    orig.push(ch);
    const best = w.steps[i].choices.find((x) => x.q === 2);
    done.push({ step: w.steps[i].text, chose: c.t, quality: c.q, fb: c.fb, best: c.q === 2 ? null : best?.t });
  }
  const end = path.length === w.steps.length;
  const score = done.reduce((s, d) => s + d.quality, 0);
  const next = end ? null : presentStep(k, path.length);
  return { done, next, end, score, max: w.steps.length * 2, path: orig };
}
export { MODULE_BY_KEY };
