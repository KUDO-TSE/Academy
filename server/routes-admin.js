import { Router } from 'express';
import { parse } from 'csv-parse/sync';
import { q, audit, pool } from './db.js';
import { hash, initialPassword } from './auth.js';
import { SCENARIOS, SCENARIO_KEYS, REGIONS, TEAMS, DEFAULT_WEIGHT, CRITICAL_STEPS } from './scenarios.js';
import { computePriorities, computeOneToOne, latestByUser } from './scoring.js';
import * as imp from './importers.js';
import { refreshAll } from './engine.js';

export const adminRouter = Router();
const bad = (res, msg) => res.status(400).json({ error: msg });
const KINDS = ['session', 'resource', 'one_to_one', 'practice', 'checkpoint'];

async function criticalSteps() {
  const r = await q('SELECT key, critical_steps FROM scenario_settings');
  const out = { ...CRITICAL_STEPS };
  for (const row of r.rows) out[row.key] = row.critical_steps;
  return out;
}
async function allScoreRows() {
  const r = await q(`SELECT s.user_id,s.scenario,s.pct,s.correct,s.total,r.kind,r.sort,r.id AS round_id
                       FROM scores s JOIN rounds r ON r.id=s.round_id`);
  return r.rows;
}
const trainees = async () => (await q(`SELECT id,name,email,region,team,weight,demand_scenario,struggle_scenarios,active
                                         FROM users WHERE (role='trainee' OR is_trainee) AND active AND NOT is_demo ORDER BY name`)).rows;

adminRouter.get('/meta', async (_req, res) => {
  res.json({ scenarios: SCENARIOS.map(({ key, label, short }) => ({ key, label, short })), regions: REGIONS, teams: TEAMS, defaultWeights: DEFAULT_WEIGHT, kinds: KINDS });
});

adminRouter.get('/overview', async (_req, res, next) => {
  try {
    const [users, rows, rounds, plan, crit] = await Promise.all([
      trainees(), allScoreRows(), q('SELECT id,key,label,kind,taken_on,sort FROM rounds ORDER BY sort,id'),
      q(`SELECT user_id, count(*)::int total, count(*) FILTER (WHERE status='done')::int done FROM plan_items GROUP BY user_id`), criticalSteps(),
    ]);
    const self = latestByUser(rows, 'self'), live = latestByUser(rows, 'live');
    const per = (u) => ({
      id: u.id, name: u.name, region: u.region, team: u.team, weight: Number(u.weight),
      self: self.get(u.id)?.overall?.pct ?? null, live: live.get(u.id)?.overall?.pct ?? null,
    });
    const people = users.map(per);
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
    const byScenario = SCENARIOS.map((s) => ({
      scenario: s.key,
      self: avg(users.map((u) => self.get(u.id)?.[s.key]?.pct).filter((v) => v != null)),
      live: avg(users.map((u) => live.get(u.id)?.[s.key]?.pct).filter((v) => v != null)),
    }));
    const byRegion = REGIONS.map((r) => ({
      region: r, people: people.filter((p) => p.region === r).length,
      self: avg(people.filter((p) => p.region === r && p.self != null).map((p) => p.self)),
      live: avg(people.filter((p) => p.region === r && p.live != null).map((p) => p.live)),
      liveDone: people.filter((p) => p.region === r && p.live != null).length,
    }));
    const planTotals = plan.rows.reduce((a, r) => ({ total: a.total + r.total, done: a.done + r.done }), { total: 0, done: 0 });
    const priorities = computePriorities({ users, selfByUser: self, liveByUser: live, critical: crit });
    res.json({
      counts: { trainees: users.length, selfDone: people.filter((p) => p.self != null).length, liveDone: people.filter((p) => p.live != null).length, withPlan: plan.rows.length },
      avgSelf: avg(people.filter((p) => p.self != null).map((p) => p.self)), avgLive: avg(people.filter((p) => p.live != null).map((p) => p.live)),
      byScenario, byRegion, planTotals, rounds: rounds.rows, topPriorities: priorities.filter((p) => !['hi', 'ai'].includes(p.scenario)).slice(0, 4),
      pendingLive: people.filter((p) => p.live == null && p.weight >= 1).map((p) => ({ id: p.id, name: p.name, region: p.region })),
    });
  } catch (e) { next(e); }
});

adminRouter.get('/trainees', async (_req, res, next) => {
  try {
    const [users, rows, plan] = await Promise.all([trainees(), allScoreRows(), q(`SELECT user_id, count(*)::int total, count(*) FILTER (WHERE status='done')::int done FROM plan_items GROUP BY user_id`)]);
    const self = latestByUser(rows, 'self'), live = latestByUser(rows, 'live');
    const planBy = new Map(plan.rows.map((r) => [r.user_id, r]));
    res.json(users.map((u) => ({
      id: u.id, name: u.name, email: u.email, region: u.region, team: u.team, weight: Number(u.weight),
      self: self.get(u.id)?.overall?.pct ?? null, live: live.get(u.id)?.overall?.pct ?? null,
      liveCorrect: live.get(u.id)?.overall?.correct ?? null, liveTotal: live.get(u.id)?.overall?.total ?? null,
      planTotal: planBy.get(u.id)?.total ?? 0, planDone: planBy.get(u.id)?.done ?? 0,
    })));
  } catch (e) { next(e); }
});

adminRouter.get('/trainees/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return bad(res, 'Invalid id.');
    const u = await q('SELECT id,name,email,role,region,team,weight,demand_scenario,struggle_scenarios,struggle_text,profile,active,last_login_at,must_change_password FROM users WHERE id=$1', [id]);
    if (!u.rowCount) return res.status(404).json({ error: 'Not found.' });
    const [rounds, scores, qs, plan, targets, notes, all, crit] = await Promise.all([
      q('SELECT id,key,label,kind,taken_on,sort FROM rounds ORDER BY sort,id'),
      q('SELECT round_id,scenario,pct,correct,total FROM scores WHERE user_id=$1', [id]),
      q(`SELECT qr.round_id, qr.qnum, qr.correct, qu.scenario, qu.level, qu.question, qu.answer
           FROM question_results qr JOIN questions qu ON qu.round_id=qr.round_id AND qu.qnum=qr.qnum WHERE qr.user_id=$1 ORDER BY qr.round_id, qr.qnum`, [id]),
      q('SELECT id,month,title,description,scenario,kind,delivery,due_date,link,status,completed_at FROM plan_items WHERE user_id=$1 ORDER BY month, due_date NULLS LAST, id', [id]),
      q('SELECT scenario,target_pct,due_date FROM targets WHERE user_id=$1', [id]),
      q(`SELECT n.id,n.body,n.shared,n.created_at,a.name AS author FROM notes n LEFT JOIN users a ON a.id=n.author_id WHERE n.user_id=$1 ORDER BY n.created_at DESC`, [id]),
      allScoreRows(), criticalSteps(),
    ]);
    const users = await trainees();
    const selfBy = latestByUser(all, 'self'), liveBy = latestByUser(all, 'live');
    const oto = computeOneToOne({ users, selfByUser: selfBy, liveByUser: liveBy, critical: crit }).find((x) => x.user_id === id) || null;
    res.json({
      user: { ...u.rows[0], weight: Number(u.rows[0].weight) },
      rounds: rounds.rows, scores: scores.rows.map((r) => ({ ...r, pct: Number(r.pct) })), questions: qs.rows, plan: plan.rows,
      targets: targets.rows.map((r) => ({ ...r, target_pct: Number(r.target_pct) })), notes: notes.rows, oneToOne: oto,
    });
  } catch (e) { next(e); }
});

adminRouter.patch('/trainees/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const b = req.body || {};
    const cur = await q('SELECT id,role FROM users WHERE id=$1', [id]);
    if (!cur.rowCount) return res.status(404).json({ error: 'Not found.' });
    const f = {};
    if (b.name != null) { if (!String(b.name).trim()) return bad(res, 'Name is required.'); f.name = String(b.name).trim(); }
    if (b.region !== undefined) { if (b.region && !REGIONS.includes(b.region)) return bad(res, 'Unknown region.'); f.region = b.region || null; }
    if (b.team !== undefined) f.team = b.team ? String(b.team).slice(0, 80) : null;
    if (b.weight !== undefined) { const w = Number(b.weight); if (!(w >= 0 && w <= 1)) return bad(res, 'Weight must be between 0 and 1.'); f.weight = w; }
    if (b.demand_scenario !== undefined) { if (b.demand_scenario && !SCENARIO_KEYS.includes(b.demand_scenario)) return bad(res, 'Unknown scenario.'); f.demand_scenario = b.demand_scenario || null; }
    if (b.struggle_scenarios !== undefined) { if (!Array.isArray(b.struggle_scenarios) || b.struggle_scenarios.some((x) => !SCENARIO_KEYS.includes(x))) return bad(res, 'Unknown scenario.'); f.struggle_scenarios = b.struggle_scenarios; }
    if (b.active !== undefined) { if (id === req.user.id && !b.active) return bad(res, 'You cannot deactivate your own account.'); f.active = !!b.active; }
    if (b.role !== undefined) { if (!['admin', 'trainee'].includes(b.role)) return bad(res, 'Unknown role.'); if (id === req.user.id && b.role !== 'admin') return bad(res, 'You cannot remove your own admin role.'); f.role = b.role; f.role_locked = true; if (b.role === 'trainee') f.is_trainee = false; }
    const keys = Object.keys(f);
    if (!keys.length) return bad(res, 'Nothing to update.');
    await q(`UPDATE users SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(', ')} WHERE id=$1`, [id, ...keys.map((k) => f[k])]);
    await audit(req, 'user.update', String(id), keys.join(','));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

adminRouter.post('/users', async (req, res, next) => {
  try {
    const b = req.body || {};
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad(res, 'Enter a valid email.');
    if (!String(b.name || '').trim()) return bad(res, 'Name is required.');
    const role = b.role === 'admin' ? 'admin' : 'trainee';
    if (b.region && !REGIONS.includes(b.region)) return bad(res, 'Unknown region.');
    const team = b.team ? String(b.team).slice(0, 80) : null;
    const h = await hash(initialPassword());
    const r = await q(`INSERT INTO users (email,name,role,region,team,weight,password_hash,must_change_password)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE) ON CONFLICT (lower(email)) DO NOTHING RETURNING id`,
      [email, String(b.name).trim(), role, b.region || null, team, role === 'admin' ? 0 : (DEFAULT_WEIGHT[team] ?? 1), h]);
    if (!r.rowCount) return bad(res, 'An account with that email already exists.');
    await audit(req, 'user.create', email, role);
    res.json({ id: r.rows[0].id });
  } catch (e) { next(e); }
});

adminRouter.post('/users/:id/reset-password', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const h = await hash(initialPassword());
    const r = await q('UPDATE users SET password_hash=$2, must_change_password=TRUE, failed_logins=0, locked_until=NULL WHERE id=$1 RETURNING email', [id, h]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    await audit(req, 'user.reset_password', r.rows[0].email);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const r = await q('SELECT id,email,name,role,is_trainee,is_demo,region,team,active,must_change_password,last_login_at FROM users ORDER BY role, name');
    res.json(r.rows);
  } catch (e) { next(e); }
});

// ---- Plan
adminRouter.post('/plan', async (req, res, next) => {
  try {
    const b = req.body || {};
    const ids = Array.isArray(b.user_ids) ? b.user_ids.map(Number).filter(Number.isInteger) : [];
    if (!ids.length) return bad(res, 'Choose at least one person.');
    if (!String(b.title || '').trim()) return bad(res, 'Title is required.');
    if (![1, 2, 3].includes(Number(b.month))) return bad(res, 'Month must be 1, 2 or 3.');
    if (b.scenario && !SCENARIO_KEYS.includes(b.scenario)) return bad(res, 'Unknown scenario.');
    if (b.kind && !KINDS.includes(b.kind)) return bad(res, 'Unknown kind.');
    if (b.delivery && !['both', 'hi', 'ai'].includes(b.delivery)) return bad(res, 'Unknown delivery.');
    if (b.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.due_date)) return bad(res, 'Date must be YYYY-MM-DD.');
    if (b.link && !/^https:\/\//i.test(b.link)) return bad(res, 'Link must start with https://');
    let n = 0;
    for (const uid of ids) {
      const r = await q(`INSERT INTO plan_items (user_id,month,title,description,scenario,kind,delivery,due_date,link,created_by)
                         SELECT id,$2,$3,$4,$5,$6,$7,$8,$9,$10 FROM users WHERE id=$1 AND (role='trainee' OR is_trainee)`,
        [uid, Number(b.month), String(b.title).trim(), b.description || null, b.scenario || null, b.kind || 'resource', b.delivery || 'both', b.due_date || null, b.link || null, req.user.id]);
      n += r.rowCount;
    }
    await audit(req, 'plan.add', `${n} people`, String(b.title).trim());
    res.json({ added: n });
  } catch (e) { next(e); }
});

adminRouter.patch('/plan/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id); const b = req.body || {};
    const f = {};
    if (b.title !== undefined) { if (!String(b.title).trim()) return bad(res, 'Title is required.'); f.title = String(b.title).trim(); }
    if (b.description !== undefined) f.description = b.description || null;
    if (b.month !== undefined) { if (![1, 2, 3].includes(Number(b.month))) return bad(res, 'Month must be 1, 2 or 3.'); f.month = Number(b.month); }
    if (b.status !== undefined) { if (!['todo', 'in_progress', 'done'].includes(b.status)) return bad(res, 'Unknown status.'); f.status = b.status; f.completed_at = b.status === 'done' ? new Date() : null; }
    if (b.due_date !== undefined) { if (b.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(b.due_date)) return bad(res, 'Date must be YYYY-MM-DD.'); f.due_date = b.due_date || null; }
    if (b.link !== undefined) { if (b.link && !/^https:\/\//i.test(b.link)) return bad(res, 'Link must start with https://'); f.link = b.link || null; }
    const keys = Object.keys(f);
    if (!keys.length) return bad(res, 'Nothing to update.');
    const r = await q(`UPDATE plan_items SET ${keys.map((k, i) => `${k}=$${i + 2}`).join(', ')} WHERE id=$1`, [id, ...keys.map((k) => f[k])]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    await audit(req, 'plan.update', String(id), keys.join(','));
    res.json({ ok: true });
  } catch (e) { next(e); }
});
adminRouter.delete('/plan/:id', async (req, res, next) => {
  try {
    const r = await q('DELETE FROM plan_items WHERE id=$1', [Number(req.params.id)]);
    if (!r.rowCount) return res.status(404).json({ error: 'Not found.' });
    await audit(req, 'plan.delete', req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- Targets and notes
adminRouter.put('/trainees/:id/targets', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    const list = Array.isArray(req.body?.targets) ? req.body.targets : null;
    if (!list) return bad(res, 'Invalid request.');
    for (const t of list) {
      if (!SCENARIO_KEYS.includes(t.scenario) || !(Number(t.target_pct) >= 0 && Number(t.target_pct) <= 100)) return bad(res, 'Invalid target.');
      if (t.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(t.due_date)) return bad(res, 'Date must be YYYY-MM-DD.');
    }
    await client.query('BEGIN');
    await client.query('DELETE FROM targets WHERE user_id=$1', [id]);
    for (const t of list) await client.query('INSERT INTO targets (user_id,scenario,target_pct,due_date) VALUES ($1,$2,$3,$4)', [id, t.scenario, Number(t.target_pct), t.due_date || null]);
    await client.query('COMMIT');
    await audit(req, 'targets.set', String(id), `${list.length} targets`);
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); next(e); } finally { client.release(); }
});

adminRouter.post('/trainees/:id/notes', async (req, res, next) => {
  try {
    const body = String(req.body?.body || '').trim();
    if (!body) return bad(res, 'Write a note first.');
    if (body.length > 4000) return bad(res, 'That note is too long.');
    const r = await q('INSERT INTO notes (user_id,author_id,body,shared) VALUES ($1,$2,$3,$4) RETURNING id', [Number(req.params.id), req.user.id, body, !!req.body?.shared]);
    await audit(req, 'note.add', req.params.id, req.body?.shared ? 'shared' : 'private');
    res.json({ id: r.rows[0].id });
  } catch (e) { next(e); }
});
adminRouter.delete('/notes/:id', async (req, res, next) => {
  try { await q('DELETE FROM notes WHERE id=$1', [Number(req.params.id)]); await audit(req, 'note.delete', req.params.id); res.json({ ok: true }); } catch (e) { next(e); }
});

// ---- Priorities
adminRouter.get('/priorities', async (req, res, next) => {
  try {
    const [users, rows, crit] = await Promise.all([trainees(), allScoreRows(), criticalSteps()]);
    const selfByUser = latestByUser(rows, 'self'), liveByUser = latestByUser(rows, 'live');
    const useLive = req.query.basis !== 'self';
    res.json({
      basis: useLive ? 'self+live' : 'self',
      scenarios: computePriorities({ users, selfByUser, liveByUser, critical: crit, useLive }),
      oneToOne: computeOneToOne({ users, selfByUser, liveByUser, critical: crit }),
      critical: crit,
    });
  } catch (e) { next(e); }
});
adminRouter.put('/settings/critical-steps', async (req, res, next) => {
  try {
    const m = req.body?.critical;
    if (!m || typeof m !== 'object') return bad(res, 'Invalid request.');
    for (const [k, v] of Object.entries(m)) {
      if (!SCENARIO_KEYS.includes(k) || !Number.isInteger(v) || v < 0 || v > 99) return bad(res, 'Invalid value.');
      await q('INSERT INTO scenario_settings (key,critical_steps) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET critical_steps=EXCLUDED.critical_steps', [k, v]);
    }
    await audit(req, 'settings.critical', null, JSON.stringify(m));
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// ---- Imports (CSV text from the admin screen)
adminRouter.post('/import', async (req, res, next) => {
  try {
    const { kind, csv } = req.body || {};
    if (typeof csv !== 'string' || !csv.trim()) return bad(res, 'Paste or choose a CSV first.');
    if (csv.length > 2_000_000) return bad(res, 'That file is too large.');
    let rows;
    try { rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true }); } catch (e) { return bad(res, `Could not read the CSV: ${e.message}`); }
    const round = { key: String(req.body.round_key || '').trim(), label: String(req.body.round_label || '').trim(), taken_on: req.body.taken_on || null, sort: Number(req.body.sort) || 0 };
    const needsRound = ['self', 'live', 'questions', 'question_results'].includes(kind);
    if (needsRound && (!round.key || !round.label)) return bad(res, 'Give the round a key and a label.');
    if (needsRound && !/^[a-z0-9-]{2,40}$/.test(round.key)) return bad(res, 'Round key: lowercase letters, numbers and hyphens only.');
    let report;
    if (kind === 'roster') report = await imp.importRoster(rows);
    else if (kind === 'profile') report = await imp.importProfile(rows);
    else if (kind === 'self') report = await imp.importSelf(round, rows);
    else if (kind === 'live') report = await imp.importLiveScores(round, rows);
    else if (kind === 'questions') report = await imp.importQuestions(round, rows);
    else if (kind === 'question_results') report = await imp.importQuestionResults(round, rows);
    else return bad(res, 'Unknown import type.');
    await refreshAll().catch((e) => console.error('plan refresh after import failed', e));
    await audit(req, 'import', kind, JSON.stringify({ rows: rows.length, ...report, errors: report.errors.length }));
    res.json({ rows: rows.length, ...report });
  } catch (e) { next(e); }
});

adminRouter.get('/audit', async (_req, res, next) => {
  try { res.json((await q('SELECT id,at,actor_email,action,target,detail FROM audit_log ORDER BY id DESC LIMIT 200')).rows); } catch (e) { next(e); }
});

adminRouter.get('/export/results.csv', async (req, res, next) => {
  try {
    const r = await q(`SELECT u.name,u.email,u.region,u.team,rd.label AS round,rd.kind,s.scenario,round(s.pct,1) AS pct,s.correct,s.total
                         FROM scores s JOIN users u ON u.id=s.user_id JOIN rounds rd ON rd.id=s.round_id ORDER BY u.name, rd.sort, s.scenario`);
    const esc = (v) => { let t = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(t)) t = "'" + t; return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const head = ['name', 'email', 'region', 'team', 'round', 'kind', 'scenario', 'pct', 'correct', 'total'];
    const csv = [head.join(','), ...r.rows.map((x) => head.map((h) => esc(x[h])).join(','))].join('\n');
    await audit(req, 'export', 'results.csv', `${r.rowCount} rows`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="academy-results.csv"');
    res.send(csv);
  } catch (e) { next(e); }
});
