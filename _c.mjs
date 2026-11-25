import { MODULES } from './server/curriculum.js';
import { POOLS } from './server/assess.js';
const k=process.argv[2].split(',');
for (const m of MODULES.filter(m=>k.includes(m.key))) {
  console.log(`\n### ${m.key} (${POOLS[m.key].length}) depth=${m.depth}`);
  m.objectives.forEach((o,i)=>console.log(`O${i}: ${o}`));
  for (const s of m.sections) { console.log(`-- ${s.title}`); s.points.forEach(p=>console.log(`  * ${p}`)); }
  console.log('existing:'); POOLS[m.key].forEach(x=>console.log(`  ? ${x.q}`));
}
