// Loads FAKE demo data so you can look around the app. Never use real employee data in this repo.
// Usage: INITIAL_PASSWORD=... DATABASE_URL=... node scripts/seed-demo.js
import { migrate, pool } from '../server/db.js';
import * as imp from '../server/importers.js';
import { SCENARIO_KEYS } from '../server/scenarios.js';

await migrate();
const people = [
  ['demo.sales1@example.com', 'Demo Sales One', 'AMER', 'Sales'], ['demo.cm1@example.com', 'Demo Client Manager', 'APAC', 'Client Managers'],
  ['demo.ms1@example.com', 'Demo Meeting Services', 'EMEA', 'Meeting Services'], ['demo.ls1@example.com', 'Demo Language Services', 'APAC', 'Language Services'],
];
await imp.importRoster(people.map(([email, name, region, team]) => ({ email, name, region, team, role: 'trainee' })));
await imp.importProfile(people.map(([email], i) => ({ email, demand_scenario: ['teams', 'onsite', 'zoom', 'hybrid'][i], struggle_scenarios: i % 2 ? 'hls' : 'rtmp|hls', struggle_text: 'Demo question', learning_pref: 'Written guides', self_sufficiency: 3 })));
const rnd = (seed) => { let x = seed; return () => (x = (x * 9301 + 49297) % 233280) / 233280; };
const selfRows = [], liveRows = [];
people.forEach(([email], i) => { const r = rnd(i + 3); SCENARIO_KEYS.forEach((s) => { selfRows.push({ email, scenario: s, understanding: 2 + Math.round(r() * 3), confidence: 2 + Math.round(r() * 3) }); const total = 4; liveRows.push({ email, scenario: s, correct: Math.round(2 + r() * 2), total }); }); });
await imp.importSelf({ key: 'oct-2026-self', label: 'Oct 2026 Self Assessment', taken_on: '2026-10-21', sort: 1 }, selfRows);
await imp.importLiveScores({ key: 'oct-2026-live', label: 'Oct 2026 Knowledge Test', taken_on: '2026-11-09', sort: 1 }, liveRows);
await imp.importPlan(people.flatMap(([email]) => [{ email, month: 1, title: 'MS Teams Integration team session', scenario: 'teams', kind: 'session', delivery: 'both', due_date: '2026-12-02' }, { email, month: 2, title: 'Onsite Events session', scenario: 'onsite', kind: 'session', delivery: 'both' }, { email, month: 3, title: 'Quarterly checkpoint', kind: 'checkpoint', delivery: 'both', due_date: '2027-01-25' }]));
console.log('Demo data loaded. Demo accounts use the generic password and must change it at first sign-in.');
await pool.end();
