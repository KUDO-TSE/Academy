import { SCENARIO_KEYS } from './scenarios.js';

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);

// Latest round per kind for each user: rows are { user_id, scenario, pct, correct, total, kind, sort }
export function latestByUser(rows, kind) {
  const best = new Map(); // user -> sort of the latest round
  for (const r of rows) if (r.kind === kind && (!best.has(r.user_id) || r.sort > best.get(r.user_id))) best.set(r.user_id, r.sort);
  const out = new Map();
  for (const r of rows) {
    if (r.kind !== kind || r.sort !== best.get(r.user_id)) continue;
    if (!out.has(r.user_id)) out.set(r.user_id, {});
    out.get(r.user_id)[r.scenario] = { pct: Number(r.pct), correct: r.correct, total: r.total };
  }
  return out;
}

/**
 * Priority Weighting System v1.
 * Training priority = 40% demand + 30% weakness + 15% stated struggle + 10% reach + 5% risk (each 0-100).
 *  demand   : weighted share of people whose single "clients bring me most" scenario it is, scaled so the top scenario = 100
 *  weakness : weighted average of (5 - self rating) / 4 now; 60% share of live test answers wrong + 40% self once the test is marked
 *  struggle : weighted share of people whose "dreaded question" was tagged to the scenario, scaled so the top scenario = 100
 *  reach    : weighted share of people whose self rating for the scenario is 2 or lower
 *  risk     : critical Guide steps for the scenario, scaled so the highest = 100
 * Tiers: 50+ Tier 1, 35-49 Tier 2, below 35 Tier 3. Safety net: reach >= 50% builds a resource regardless of demand.
 */
export function computePriorities({ users, selfByUser, liveByUser, critical, useLive = true }) {
  const people = users.filter((u) => Number(u.weight) > 0);
  const W = people.reduce((a, u) => a + Number(u.weight), 0) || 1;
  const maxCrit = Math.max(1, ...SCENARIO_KEYS.map((k) => critical[k] || 0));

  const personWeak = (u, s) => {
    const self = selfByUser.get(u.id)?.[s];
    const live = useLive ? liveByUser.get(u.id)?.[s] : null;
    const selfW = self ? (5 - (self.pct / 100) * 5) / 4 : null;
    const liveW = live && live.total ? 1 - live.correct / live.total : null;
    if (liveW != null && selfW != null) return 0.6 * liveW + 0.4 * selfW;
    if (liveW != null) return liveW;
    return selfW;
  };

  const demandRaw = {}; const struggleRaw = {};
  for (const s of SCENARIO_KEYS) { demandRaw[s] = 0; struggleRaw[s] = 0; }
  for (const u of people) {
    if (u.demand_scenario && demandRaw[u.demand_scenario] != null) demandRaw[u.demand_scenario] += Number(u.weight);
    for (const s of new Set(u.struggle_scenarios || [])) if (struggleRaw[s] != null) struggleRaw[s] += Number(u.weight);
  }
  const maxD = Math.max(...Object.values(demandRaw), 0.0001);
  const maxS = Math.max(...Object.values(struggleRaw), 0.0001);

  const rows = SCENARIO_KEYS.map((s) => {
    let wk = 0, wkW = 0, reach = 0, reachW = 0;
    for (const u of people) {
      const w = personWeak(u, s);
      if (w != null) { wk += w * Number(u.weight); wkW += Number(u.weight); }
      const self = selfByUser.get(u.id)?.[s];
      if (self) { reachW += Number(u.weight); if ((self.pct / 100) * 5 <= 2) reach += Number(u.weight); }
    }
    const D = (demandRaw[s] / maxD) * 100;
    const Wk = wkW ? (wk / wkW) * 100 : 0;
    const S = (struggleRaw[s] / maxS) * 100;
    const R = reachW ? (reach / reachW) * 100 : 0;
    const K = ((critical[s] || 0) / maxCrit) * 100;
    const priority = 0.4 * D + 0.3 * Wk + 0.15 * S + 0.1 * R + 0.05 * K;
    const tier = priority >= 50 ? 1 : priority >= 35 ? 2 : 3;
    return {
      scenario: s, priority: Math.round(priority), tier,
      demand: Math.round(D), weakness: Math.round(Wk), struggle: Math.round(S), reach: Math.round(R), risk: Math.round(K),
      demandPeople: demandRaw[s], safetyNet: R >= 50,
    };
  }).sort((a, b) => b.priority - a.priority);
  return rows;
}

/** 1:1 priority per person and scenario (CM & Sales only): 40% demand + 30% weakness + 15% struggle + 10% over-confidence + 5% risk. 55+ flags a 1:1. */
export function computeOneToOne({ users, selfByUser, liveByUser, critical }) {
  const maxCrit = Math.max(1, ...SCENARIO_KEYS.map((k) => critical[k] || 0));
  const out = [];
  for (const u of users.filter((x) => Number(x.weight) >= 1)) {
    const per = SCENARIO_KEYS.map((s) => {
      const self = selfByUser.get(u.id)?.[s];
      const live = liveByUser.get(u.id)?.[s];
      const selfW = self ? (5 - (self.pct / 100) * 5) / 4 : null;
      const liveW = live && live.total ? 1 - live.correct / live.total : null;
      const weak = liveW != null && selfW != null ? 0.6 * liveW + 0.4 * selfW : liveW ?? selfW ?? 0;
      const demand = u.demand_scenario === s ? 100 : 0;
      const struggle = (u.struggle_scenarios || []).includes(s) ? 100 : 0;
      const over = self && live ? clamp((self.pct - live.pct) * 2) : 0;
      const risk = ((critical[s] || 0) / maxCrit) * 100;
      const score = 0.4 * demand + 0.3 * weak * 100 + 0.15 * struggle + 0.1 * over + 0.05 * risk;
      return { scenario: s, score: Math.round(score) };
    }).sort((a, b) => b.score - a.score);
    out.push({ user_id: u.id, name: u.name, region: u.region, team: u.team, top: per[0], flagged: per[0].score >= 55, scenarios: per.slice(0, 3) });
  }
  return out.sort((a, b) => b.top.score - a.top.score);
}

export function overall(scoresForUser) {
  const o = scoresForUser?.overall;
  if (o) return o;
  const vals = Object.entries(scoresForUser || {}).filter(([k]) => SCENARIO_KEYS.includes(k)).map(([, v]) => v.pct);
  return vals.length ? { pct: avg(vals) } : null;
}
