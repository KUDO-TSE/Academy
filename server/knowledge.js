// KUDOG's knowledge: the whole curriculum cut into small passages (lesson sections, hand-over rules, stories, key points,
// case studies, check questions with their explanations, the KUDO Trainer's published FAQ). For each question the best
// passages are picked by keyword relevance and given to Claude, so answers stay grounded in what the Academy teaches.
import { MODULES } from './curriculum.js';
import { STORIES } from './stories.js';
import { EXPLAIN, PRACTICE, WALKTHROUGHS } from './curriculum-extra.js';
import { CASES } from './curriculum-bank.js';
import { q } from './db.js';

const STOP = new Set('the a an and or of to in on for with is are be it this that what how do does can i my me you your we our at as by from if when which who why will would should there their them they about into than then so not no yes was were has have had just get got use using any some'.split(' '));
const words = (t) => String(t || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').match(/[a-z0-9]+/g)?.filter((w) => w.length > 2 && !STOP.has(w)).map((w) => w.replace(/(ings|ing|ies|es|s)$/, '')) || [];
// Collect every human-readable string in a story slide.
const strings = (x) => (typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(strings) : x && typeof x === 'object' ? Object.entries(x).filter(([k]) => !['kind', 't', 'hi', 'ok', 'step'].includes(k)).flatMap(([, v]) => strings(v)) : []);

function staticChunks() {
  const out = [];
  const add = (module, title, text) => { if (text && text.trim()) out.push({ module, title, text: text.trim() }); };
  for (const m of MODULES) {
    add(m.key, `${m.title}: overview`, [m.summary, ...(m.objectives || []).map((o) => `- ${o}`)].join('\n'));
    for (const s of m.sections || []) add(m.key, `${m.title}: ${s.title}`, s.points.map((p) => `- ${p}`).join('\n'));
    if (m.escalate?.length) add(m.key, `${m.title}: when to hand over`, m.escalate.map((p) => `- ${p}`).join('\n'));
    if (EXPLAIN[m.key]) add(m.key, `${m.title}: what a good explanation covers`, EXPLAIN[m.key].points.map((p) => `- ${p}`).join('\n'));
    if (PRACTICE[m.key]) add(m.key, `${m.title}: practice task`, PRACTICE[m.key].prompt);
    if (CASES[m.key]) add(m.key, `${m.title}: worked example`, strings(CASES[m.key]).join('\n'));
    if (STORIES[m.key]) add(m.key, `${m.title}: lesson story`, strings(STORIES[m.key].slides).join('\n'));
    if (WALKTHROUGHS[m.key]) add(m.key, `${m.title}: decision walkthrough`, strings(WALKTHROUGHS[m.key]).join('\n').slice(0, 3000));
    for (const x of m.quiz || []) add(m.key, `${m.title}: check question`, `Q: ${x.q}\nRight answer: ${Array.isArray(x.a) ? x.a.map((i) => x.o[i]).join('; ') : x.o?.[x.a] ?? ''}\nWhy: ${x.why || ''}`);
  }
  return out;
}

let cache = null, cachedAt = 0;
async function corpus() {
  if (cache && Date.now() - cachedAt < 10 * 60e3) return cache;
  const chunks = staticChunks();
  try {
    const faq = (await q("SELECT module_key,question,answer FROM field_notes WHERE status='published' AND kind='faq'")).rows;
    const byKey = Object.fromEntries(MODULES.map((m) => [m.key, m.title]));
    for (const f of faq) chunks.push({ module: f.module_key, title: `${byKey[f.module_key] || 'Academy'}: FAQ from your KUDO Trainer`, text: `Q: ${f.question}\nA: ${f.answer}` });
  } catch { /* no field notes yet */ }
  const df = new Map();
  for (const c of chunks) { c.terms = words(`${c.title} ${c.text}`); for (const w of new Set(c.terms)) df.set(w, (df.get(w) || 0) + 1); }
  cache = { chunks, df, n: chunks.length }; cachedAt = Date.now();
  return cache;
}
export const resetKnowledgeCache = () => { cache = null; };

/** The passages that best match the question (and the last turns), within a character budget. */
export async function relevantKnowledge(question, history = [], { budget = 14000, max = 12 } = {}) {
  const { chunks, df, n } = await corpus();
  const qTerms = words([question, ...history.slice(-2).map((h) => h.text)].join(' '));
  if (!qTerms.length) return [];
  const idf = (w) => Math.log(1 + n / (1 + (df.get(w) || 0)));
  const qSet = new Set(qTerms);
  // A question that names a module (Teams, RTMP, glossary...) leans towards that module's passages.
  const named = new Set(MODULES.filter((m) => words(`${m.key} ${m.title}`).some((w) => qSet.has(w) && (df.get(w) || 0) < n / 4)).map((m) => m.key));
  const scored = chunks.map((c) => {
    const tf = new Map(); for (const w of c.terms) tf.set(w, (tf.get(w) || 0) + 1);
    let s = 0; for (const w of qSet) if (tf.has(w)) s += idf(w) * (1 + Math.log(tf.get(w)));
    s /= Math.sqrt(8 + c.terms.length / 12);
    if (named.has(c.module)) s *= 1.6;
    return { c, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
  const out = []; let used = 0;
  for (const { c } of scored) { if (out.length >= max) break; const t = `[${c.title}] (lesson: #module-${c.module})\n${c.text}`; if (used + t.length > budget) continue; out.push(t); used += t.length; }
  return out;
}

export const moduleIndex = () => MODULES.map((m) => `- ${m.title}: #module-${m.key}`).join('\n');
