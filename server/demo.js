// A demo trainee with fictional results, so the Academy team can see exactly what a trainee gets.
// Created once at start-up when DEMO_TRAINEE_EMAIL is set. It is flagged is_demo and excluded from team figures and priorities.
// It signs in with the generic initial password and must choose its own at first sign-in, like everyone else.
import { q } from './db.js';
import { hash, initialPassword } from './auth.js';
import { upsertRound } from './importers.js';
import { refreshPlan, approvePlan } from './engine.js';
import { MODULE_BY_KEY } from './curriculum.js';

// Fictional profile: a Client Manager whose clients mostly bring Teams meetings.
const SELF = { teams: 4, zoom: 4, onsite: 3.5, hybrid: 2, platform: 4.5, widget: 2.5, external: 3, meetnow: 3, rtmp: 1.5, hls: 1.5, hi: 4, ai: 4 };
const LIVE_RATE = { teams: 0.34, zoom: 0.75, onsite: 0.6, hybrid: 0.25, platform: 0.86, widget: 0.5, external: 0.5, meetnow: 1, rtmp: 0.34, hls: 0.34, hi: 1, ai: 0.8 };

const REAL = "SELECT id FROM users WHERE NOT is_demo";
export const DEMO_FILTER = `user_id IN (${REAL})`; // use in team-level queries so test trainees never count

/** Test trainees: DEMO_TRAINEE_EMAILS (comma-separated) or DEMO_TRAINEE_EMAIL. demo.jack@kudo.ai becomes "Test Trainee (Jack)". */
export function demoEmails() {
  return String(process.env.DEMO_TRAINEE_EMAILS || process.env.DEMO_TRAINEE_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter((e) => /^[^\s@]+@[^\s@]+$/.test(e));
}
const nameFor = (email) => { const local = email.split('@')[0].replace(/^demo[.-]?/, '').replace(/[._-]+/g, ' ').trim(); return !local || local === 'trainee' ? 'Demo Trainee' : `Test Trainee (${local.replace(/\b\w/g, (c) => c.toUpperCase())})`; };

export async function ensureDemo() {
  for (const email of demoEmails()) await ensureOne(email);
}

async function ensureOne(email) {
  const ex = await q('SELECT id FROM users WHERE lower(email)=$1 AND is_demo', [email]);
  if (ex.rowCount) { await refreshPlan(ex.rows[0].id); await approvePlan(ex.rows[0].id, null); return ex.rows[0].id; } // keep it on the latest plan
  if ((await q('SELECT 1 FROM users WHERE lower(email)=$1', [email])).rowCount) return null; // never turn a real account into a test one
  return createDemo(email, nameFor(email));
}

/** Delete a test trainee and everything it did, then create it again from scratch (generic password, fresh plan). */
export async function resetDemo(id) {
  const r = await q('DELETE FROM users WHERE id=$1 AND is_demo RETURNING email,name', [id]);
  if (!r.rowCount) return null;
  return createDemo(r.rows[0].email, r.rows[0].name);
}

export async function createDemo(email, name) {
  let pw; try { pw = initialPassword(); } catch { console.warn('INITIAL_PASSWORD not set: demo trainee not created.'); return null; }
  const u = await q(`INSERT INTO users (email,name,role,region,team,weight,demand_scenario,struggle_scenarios,struggle_text,profile,password_hash,must_change_password,is_demo)
                     VALUES ($1,$6,'trainee','EMEA','Client Managers',0,'teams',$2,$3,$4,$5,TRUE,TRUE) RETURNING id`,
    [email, ['hybrid', 'rtmp'], 'How do I explain Dante and the Audio Manager without getting lost?', { learning_pref: 'Short Videos', unsure_behaviour: 'Ask a colleague; Bring in a specialist', self_sufficiency: 3 }, await hash(pw), name]);
  const id = u.rows[0].id;
  const selfR = await upsertRound({ key: 'oct-2026-self', label: 'Oct 2026 Self Assessment', kind: 'self', taken_on: '2026-10-21', sort: 1 });
  const liveR = await upsertRound({ key: 'oct-2026-live', label: 'Oct 2026 Knowledge Test', kind: 'live', taken_on: '2026-11-09', sort: 1 });
  const selfPct = Object.values(SELF).reduce((a, b) => a + b, 0) / 12 / 5 * 100;
  for (const [s, v] of Object.entries(SELF)) await q('INSERT INTO scores (user_id,round_id,scenario,pct) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [id, selfR, s, (v / 5) * 100]);
  await q("INSERT INTO scores (user_id,round_id,scenario,pct) VALUES ($1,$2,'overall',$3) ON CONFLICT DO NOTHING", [id, selfR, selfPct]);
  const qs = (await q('SELECT qnum,scenario FROM questions WHERE round_id=$1 ORDER BY qnum', [liveR])).rows;
  let C = 0, T = 0;
  for (const [s, rate] of Object.entries(LIVE_RATE)) {
    const mine = qs.filter((x) => x.scenario === s);
    const total = mine.length || 3, correct = Math.round(total * rate);
    C += correct; T += total;
    await q('INSERT INTO scores (user_id,round_id,scenario,pct,correct,total) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING', [id, liveR, s, (correct / total) * 100, correct, total]);
    for (const [i, x] of mine.entries()) await q('INSERT INTO question_results (user_id,round_id,qnum,correct) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING', [id, liveR, x.qnum, i < correct]);
  }
  await q("INSERT INTO scores (user_id,round_id,scenario,pct,correct,total) VALUES ($1,$2,'overall',$3,$4,$5) ON CONFLICT DO NOTHING", [id, liveR, (C / T) * 100, C, T]);

  // A plan that has been running for a little over two weeks, with some progress, so every part of the page shows.
  await refreshPlan(id);
  await approvePlan(id, null);
  await q("UPDATE plans SET started_on = CURRENT_DATE - 9 WHERE user_id=$1 AND status='approved'", [id]);
  await q(`INSERT INTO inputs (user_id,kind,happened_on,title,body,signals,item_key,shared_summary)
           VALUES ($1,'one_to_one',CURRENT_DATE - 8,'Kick-off with your KUDO Trainer','(Demo) Agreed the goal and the plan. Strong on the platform basics; not sure how the Teams bot is admitted from the lobby.',$2,'kickoff',$3)`,
    [id, JSON.stringify([{ scenario: 'teams', rating: 'gap', note: 'Lobby and IT policy questions' }]), 'Great start. Teams is your first focus because your clients bring it most: watch the video before the lesson, and bring your IT questions to our next session.']);
  await q("INSERT INTO plan_progress (user_id,item_key,status,completed_at) VALUES ($1,'foundations.lesson','done',now() - interval '8 days'), ($1,'foundations.practice','done',now() - interval '7 days'), ($1,'teams.lesson','done',now() - interval '1 day') ON CONFLICT DO NOTHING", [id]);
  const f = MODULE_BY_KEY.foundations.quiz;
  await q("INSERT INTO quiz_attempts (user_id,module_key,correct,total,answers,created_at) VALUES ($1,'foundations',$2,$3,$4,now() - interval '7 days')",
    [id, f.length, f.length, JSON.stringify(f.map((x, i) => ({ id: `foundations.${i}`, score: 1, knowledge: 1, scenario: null })))]);
  await refreshPlan(id);
  await approvePlan(id, null);
  console.log(`Demo trainee created: ${email}`);
  return id;
}
