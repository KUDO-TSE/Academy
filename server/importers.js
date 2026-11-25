import { q } from './db.js';
import { hash, initialPassword } from './auth.js';
import { SCENARIO_KEYS, DEFAULT_WEIGHT } from './scenarios.js';

const s = (v) => (v == null ? '' : String(v).trim());
const n = (v) => (s(v) === '' ? null : Number(v));
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const MONTH_RE = /^[1-3]$/;

async function userIdByEmail(email) {
  const r = await q('SELECT id FROM users WHERE lower(email)=lower($1)', [email]);
  return r.rows[0]?.id ?? null;
}

export async function upsertRound({ key, label, kind, taken_on, sort }) {
  const r = await q(
    `INSERT INTO rounds (key,label,kind,taken_on,sort) VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (key) DO UPDATE SET label=EXCLUDED.label, taken_on=COALESCE(EXCLUDED.taken_on, rounds.taken_on), sort=EXCLUDED.sort
     RETURNING id`,
    [key, label, kind, taken_on || null, sort ?? 0]);
  return r.rows[0].id;
}

/** rows: email,name,role,region,team,weight. New accounts get the generic password and must change it at first sign-in. Existing accounts keep their password. */
export async function importRoster(rows) {
  const report = { created: 0, updated: 0, errors: [] };
  const h = await hash(initialPassword());
  for (const [i, row] of rows.entries()) {
    const email = s(row.email).toLowerCase();
    if (!isEmail(email)) { report.errors.push(`Row ${i + 2}: invalid email "${s(row.email)}"`); continue; }
    const name = s(row.name) || email.split('@')[0];
    const role = s(row.role).toLowerCase() === 'admin' ? 'admin' : 'trainee';
    const team = s(row.team) || null;
    const weight = s(row.weight) !== '' ? Number(row.weight) : (DEFAULT_WEIGHT[team] ?? 1);
    if (!Number.isFinite(weight) || weight < 0 || weight > 1) { report.errors.push(`Row ${i + 2}: weight must be between 0 and 1`); continue; }
    const ex = await userIdByEmail(email);
    if (ex) {
      // A person listed in the roster is trained, so an admin who appears here also keeps their own trainee data.
      await q(`UPDATE users SET name=$2, region=$3, team=$4, weight=$5, is_trainee = is_trainee OR role='admin' WHERE id=$1`, [ex, name, s(row.region) || null, team, weight]);
      report.updated++;
    } else {
      await q(`INSERT INTO users (email,name,role,region,team,weight,password_hash,must_change_password) VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE)`,
        [email, name, role, s(row.region) || null, team, weight, h]);
      report.created++;
    }
  }
  return report;
}

/** rows: email,demand_scenario,struggle_scenarios (| separated),struggle_text,learning_pref,unsure_behaviour,self_sufficiency */
export async function importProfile(rows) {
  const report = { updated: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    const id = await userIdByEmail(s(row.email));
    if (!id) { report.errors.push(`Row ${i + 2}: no account for ${s(row.email)}`); continue; }
    const demand = s(row.demand_scenario);
    if (demand && !SCENARIO_KEYS.includes(demand)) { report.errors.push(`Row ${i + 2}: unknown scenario "${demand}"`); continue; }
    const struggle = s(row.struggle_scenarios).split('|').map((x) => x.trim()).filter(Boolean);
    const bad = struggle.find((x) => !SCENARIO_KEYS.includes(x));
    if (bad) { report.errors.push(`Row ${i + 2}: unknown scenario "${bad}"`); continue; }
    const profile = { learning_pref: s(row.learning_pref), unsure_behaviour: s(row.unsure_behaviour), self_sufficiency: n(row.self_sufficiency) };
    await q('UPDATE users SET demand_scenario=$2, struggle_scenarios=$3, struggle_text=$4, profile=$5 WHERE id=$1',
      [id, demand || null, struggle, s(row.struggle_text) || null, profile]);
    report.updated++;
  }
  return report;
}

/** Self assessment rows: email,scenario,understanding,confidence  (scenario "overall" = overall average rating, both columns equal) */
export async function importSelf(round, rows) {
  const rid = await upsertRound({ ...round, kind: 'self' });
  const report = { saved: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    const id = await userIdByEmail(s(row.email));
    const sc = s(row.scenario);
    if (!id) { report.errors.push(`Row ${i + 2}: no account for ${s(row.email)}`); continue; }
    if (sc !== 'overall' && !SCENARIO_KEYS.includes(sc)) { report.errors.push(`Row ${i + 2}: unknown scenario "${sc}"`); continue; }
    const u = n(row.understanding), c = n(row.confidence);
    const vals = [u, c].filter((v) => v != null);
    if (!vals.length || vals.some((v) => !(v >= 1 && v <= 5))) { report.errors.push(`Row ${i + 2}: ratings must be 1 to 5`); continue; }
    const pct = (vals.reduce((a, b) => a + b, 0) / vals.length / 5) * 100;
    await q(`INSERT INTO scores (user_id,round_id,scenario,pct) VALUES ($1,$2,$3,$4)
             ON CONFLICT (user_id,round_id,scenario) DO UPDATE SET pct=EXCLUDED.pct`, [id, rid, sc, pct]);
    report.saved++;
  }
  return report;
}

/** Live test scores rows: email,scenario,correct,total (scenario "overall" = whole test) */
export async function importLiveScores(round, rows) {
  const rid = await upsertRound({ ...round, kind: 'live' });
  const report = { saved: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    const id = await userIdByEmail(s(row.email));
    const sc = s(row.scenario);
    if (!id) { report.errors.push(`Row ${i + 2}: no account for ${s(row.email)}`); continue; }
    if (sc !== 'overall' && !SCENARIO_KEYS.includes(sc)) { report.errors.push(`Row ${i + 2}: unknown scenario "${sc}"`); continue; }
    const correct = n(row.correct), total = n(row.total);
    if (correct == null || !total || correct < 0 || correct > total) { report.errors.push(`Row ${i + 2}: correct/total invalid`); continue; }
    await q(`INSERT INTO scores (user_id,round_id,scenario,pct,correct,total) VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (user_id,round_id,scenario) DO UPDATE SET pct=EXCLUDED.pct, correct=EXCLUDED.correct, total=EXCLUDED.total`,
      [id, rid, sc, (correct / total) * 100, correct, total]);
    report.saved++;
  }
  return report;
}

/** Question bank rows: qnum,scenario,level,question,answer */
export async function importQuestions(round, rows) {
  const rid = await upsertRound({ ...round, kind: 'live' });
  const report = { saved: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    const qn = n(row.qnum), sc = s(row.scenario);
    if (!qn || !SCENARIO_KEYS.includes(sc) || !s(row.question)) { report.errors.push(`Row ${i + 2}: qnum, scenario or question invalid`); continue; }
    await q(`INSERT INTO questions (round_id,qnum,scenario,level,question,answer) VALUES ($1,$2,$3,$4,$5,$6)
             ON CONFLICT (round_id,qnum) DO UPDATE SET scenario=EXCLUDED.scenario, level=EXCLUDED.level, question=EXCLUDED.question, answer=EXCLUDED.answer`,
      [rid, qn, sc, s(row.level) || null, s(row.question), s(row.answer) || null]);
    report.saved++;
  }
  return report;
}

/** Per question results rows: email,qnum,correct (1/0) */
export async function importQuestionResults(round, rows) {
  const rid = await upsertRound({ ...round, kind: 'live' });
  const report = { saved: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    const id = await userIdByEmail(s(row.email));
    const qn = n(row.qnum);
    if (!id || !qn) { report.errors.push(`Row ${i + 2}: unknown email or qnum`); continue; }
    await q(`INSERT INTO question_results (user_id,round_id,qnum,correct) VALUES ($1,$2,$3,$4)
             ON CONFLICT (user_id,round_id,qnum) DO UPDATE SET correct=EXCLUDED.correct`, [id, rid, qn, ['1', 'true', 'yes', 'correct'].includes(s(row.correct).toLowerCase())]);
    report.saved++;
  }
  return report;
}

/** Training plan rows: email,month,title,description,scenario,kind,delivery,due_date,link */
export async function importPlan(rows, createdBy = null) {
  const report = { saved: 0, errors: [] };
  const KINDS = ['session', 'resource', 'one_to_one', 'practice', 'checkpoint'];
  for (const [i, row] of rows.entries()) {
    const id = await userIdByEmail(s(row.email));
    if (!id) { report.errors.push(`Row ${i + 2}: no account for ${s(row.email)}`); continue; }
    const month = s(row.month) || '1';
    if (!MONTH_RE.test(month)) { report.errors.push(`Row ${i + 2}: month must be 1, 2 or 3`); continue; }
    if (!s(row.title)) { report.errors.push(`Row ${i + 2}: title is required`); continue; }
    const sc = s(row.scenario) || null;
    if (sc && !SCENARIO_KEYS.includes(sc)) { report.errors.push(`Row ${i + 2}: unknown scenario "${sc}"`); continue; }
    const kind = s(row.kind) || 'resource';
    if (!KINDS.includes(kind)) { report.errors.push(`Row ${i + 2}: kind must be one of ${KINDS.join(', ')}`); continue; }
    const delivery = s(row.delivery) || 'both';
    if (!['both', 'hi', 'ai'].includes(delivery)) { report.errors.push(`Row ${i + 2}: delivery must be both, hi or ai`); continue; }
    const due = s(row.due_date) || null;
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) { report.errors.push(`Row ${i + 2}: due_date must be YYYY-MM-DD`); continue; }
    const link = s(row.link);
    if (link && !/^https:\/\//i.test(link)) { report.errors.push(`Row ${i + 2}: link must start with https://`); continue; }
    await q(`INSERT INTO plan_items (user_id,month,title,description,scenario,kind,delivery,due_date,link,created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [id, Number(month), s(row.title), s(row.description) || null, sc, kind, delivery, due, link || null, createdBy]);
    report.saved++;
  }
  return report;
}
