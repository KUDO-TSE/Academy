// Assessment engine: item pools, random draws, grading and decision walkthroughs.
// Guessing is handled three ways:
//  - single-answer questions ask for certainty (certainty-based marking, Gardner-Medwin):
//    right at low/mid/high certainty = 1/2/3, wrong = 0/-2/-6; a lucky low-certainty answer only counts half towards the level;
//  - "pick all that fit" questions: every wrong pick cancels a right one;
//  - matching and ordering give credit per pair or position, so random answers score close to nothing.
import { MODULES, MODULE_BY_KEY } from './curriculum.js';
import { EXTRA_ITEMS, WALKTHROUGHS } from './curriculum-extra.js';

export const DRAW = 6;
const CBM = { 1: [1, 0], 2: [2, -2], 3: [3, -6] };

export const POOLS = Object.fromEntries(MODULES.map((m) => [m.key, [...m.quiz, ...(EXTRA_ITEMS[m.key] || [])].map((x, i) => ({ t: 'mcq', ...x, id: `${m.key}.${i}`, module: m.key, scenario: m.scenario }))]));
const BY_ID = new Map(Object.values(POOLS).flat().map((x) => [x.id, x]));
export const itemById = (id) => BY_ID.get(id) || null;

const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };

/** A fresh draw for each attempt: at least one of each format the module has, the rest at random. */
export function draw(moduleKey, n = DRAW) {
  const pool = POOLS[moduleKey] || [];
  if (pool.length <= n) return shuffle(pool);
  const picked = [];
  for (const t of ['multi', 'match', 'order']) { const c = shuffle(pool.filter((x) => x.t === t))[0]; if (c) picked.push(c); }
  for (const x of shuffle(pool)) { if (picked.length >= n) break; if (!picked.includes(x)) picked.push(x); }
  return shuffle(picked);
}
export function drawMixed(moduleKeys, n = 4) {
  const pool = shuffle(moduleKeys.flatMap((k) => POOLS[k] || []));
  const out = []; const seen = new Set();
  for (const x of pool) { if (out.length >= n) break; if (seen.has(x.module) && pool.length > n * 2) continue; seen.add(x.module); out.push(x); }
  return out;
}

export function publicItem(x) {
  const base = { id: x.id, t: x.t, q: x.q, module: x.module, scenario: x.scenario || null };
  if (x.t === 'mcq' || x.t === 'multi') return { ...base, o: x.o };
  if (x.t === 'match') return { ...base, lefts: x.pairs.map((p) => p[0]), rights: shuffle([...new Set(x.pairs.map((p) => p[1]))]) };
  if (x.t === 'order') return { ...base, steps: shuffle(x.steps) };
  return base;
}

function gradeOne(x, ans) {
  const v = ans?.v, c = [1, 2, 3].includes(ans?.c) ? ans.c : 2;
  if (x.t === 'mcq') {
    const ok = Number.isInteger(v) && v === x.a;
    return { score: ok ? 1 : 0, knowledge: ok ? (c === 1 ? 0.5 : 1) : 0, cbm: CBM[c][ok ? 0 : 1], conf: c, confidentWrong: !ok && c === 3, correct: { a: x.a, o: x.o } };
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
    const right = x.steps.filter((st, i) => arr[i] === st).length;
    const s = right / x.steps.length;
    return { score: s, knowledge: s, correct: { steps: x.steps }, given: arr };
  }
  return { score: 0, knowledge: 0 };
}

/** answers: [{ id, v, c }] where v is an index (mcq), an index list (multi), a list of chosen answers (match) or the steps in order (order). */
export function grade(answers, allowed) {
  const results = [];
  for (const a of answers) {
    const x = itemById(a?.id);
    if (!x || (allowed && !allowed(x))) return { error: 'Unknown question.' };
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
  return { title: w.title, intro: w.intro, steps: w.steps.length, first: { text: w.steps[0].text, choices: w.steps[0].choices.map((c) => c.t) } };
}
/** Stateless walk: the client sends the choices so far; the server returns feedback on them and the next step (or the end). */
export function walk(k, path) {
  const w = WALKTHROUGHS[k]; if (!w) return { error: 'Not found.' };
  if (!Array.isArray(path) || path.length < 1 || path.length > w.steps.length) return { error: 'Invalid path.' };
  const done = [];
  for (const [i, ch] of path.entries()) {
    const c = w.steps[i].choices[ch];
    if (!Number.isInteger(ch) || !c) return { error: 'Invalid choice.' };
    const best = w.steps[i].choices.find((x) => x.q === 2);
    done.push({ step: w.steps[i].text, chose: c.t, quality: c.q, fb: c.fb, best: c.q === 2 ? null : best?.t });
  }
  const end = path.length === w.steps.length;
  const score = done.reduce((s, d) => s + d.quality, 0);
  const next = end ? null : { text: w.steps[path.length].text, choices: w.steps[path.length].choices.map((c) => c.t) };
  return { done, next, end, score, max: w.steps.length * 2 };
}
export { MODULE_BY_KEY };
