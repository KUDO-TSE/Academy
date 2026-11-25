// Integration tests. Needs a throwaway Postgres: DATABASE_URL=... INITIAL_PASSWORD=... npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { pool, q } from '../server/db.js';
import * as imp from '../server/importers.js';
import { itemById, POOLS } from '../server/assess.js';

process.env.INITIAL_PASSWORD ||= 'Generic-Pass-1!';
process.env.AUTO_REVIEW ||= 'off';
process.env.LOGIN_RATE_LIMIT ||= '200'; // the automatic-review test below switches it on
process.env.ADMIN_EMAILS ||= 'boss@test.local';
const GEN = process.env.INITIAL_PASSWORD;
let server, base;

function client() {
  let cookie = '';
  return async (method, url, body, headers = {}) => {
    const res = await fetch(base + url, { method, headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'academy', ...(cookie ? { cookie } : {}), ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    const sc = res.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
    let json = null; try { json = await res.json(); } catch { /* */ }
    return { status: res.status, json };
  };
}

test.before(async () => {
  await q('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
  const app = await createApp();
  await new Promise((r) => { server = app.listen(0, r); });
  base = `http://127.0.0.1:${server.address().port}`;
  await imp.importRoster([
    { email: 'ann@test.local', name: 'Ann One', region: 'EMEA', team: 'Sales' },
    { email: 'bob@test.local', name: 'Bob Two', region: 'APAC', team: 'Client Managers' },
  ]);
  await imp.importSelf({ key: 'r1-self', label: 'R1 Self Assessment', sort: 1 }, [
    { email: 'ann@test.local', scenario: 'teams', understanding: 4, confidence: 4 }, { email: 'bob@test.local', scenario: 'teams', understanding: 2, confidence: 2 }]);
  await imp.importLiveScores({ key: 'r1-live', label: 'R1 Knowledge Test', sort: 1 }, [
    { email: 'ann@test.local', scenario: 'overall', correct: 40, total: 50 }, { email: 'bob@test.local', scenario: 'overall', correct: 25, total: 50 }]);
  await imp.importPlan([{ email: 'ann@test.local', month: 1, title: 'Ann plan item' }, { email: 'bob@test.local', month: 1, title: 'Bob plan item' }]);

});
test.after(async () => { server?.close(); await pool.end(); });

test('wrong password and unknown user get the same answer', async () => {
  const c = client();
  const a = await c('POST', '/api/auth/login', { email: 'ann@test.local', password: 'nope' });
  const b = await c('POST', '/api/auth/login', { email: 'ghost@test.local', password: 'nope' });
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.json.error, b.json.error);
});

test('first login forces a password change and blocks data until done', async () => {
  const c = client();
  const l = await c('POST', '/api/auth/login', { email: 'ann@test.local', password: GEN });
  assert.equal(l.status, 200); assert.equal(l.json.user.mustChange, true);
  assert.equal((await c('GET', '/api/me')).status, 403);
  assert.equal((await c('POST', '/api/auth/change-password', { current: GEN, next: GEN })).status, 400);
  assert.equal((await c('POST', '/api/auth/change-password', { current: GEN, next: 'short1' })).status, 400);
  assert.equal((await c('POST', '/api/auth/change-password', { current: 'wrong', next: 'Brand-new-pass-77' })).status, 400);
  assert.equal((await c('POST', '/api/auth/change-password', { current: GEN, next: 'Brand-new-pass-77' })).status, 200);
  const me = await c('GET', '/api/me');
  assert.equal(me.status, 200); assert.equal(me.json.user.email, 'ann@test.local');
  const c2 = client();
  assert.equal((await c2('POST', '/api/auth/login', { email: 'ann@test.local', password: GEN })).status, 401, 'generic password stops working');
  assert.equal((await c2('POST', '/api/auth/login', { email: 'ANN@test.local', password: 'Brand-new-pass-77' })).status, 200, 'email is case-insensitive');
});

test('a trainee only ever sees their own data and cannot reach admin routes', async () => {
  const bob = client();
  await bob('POST', '/api/auth/login', { email: 'bob@test.local', password: GEN });
  await bob('POST', '/api/auth/change-password', { current: GEN, next: 'Quiet-river-pass-99' });
  const me = (await bob('GET', '/api/me')).json;
  assert.equal(me.user.email, 'bob@test.local');
  assert.deepEqual(me.plan.map((p) => p.title), ['Bob plan item']);
  assert.ok(me.scores.every((s) => s.pct <= 50), 'only Bob scores');
  const annId = (await q("SELECT id FROM users WHERE email='ann@test.local'")).rows[0].id;
  const annItem = (await q('SELECT id FROM plan_items WHERE user_id=$1', [annId])).rows[0].id;
  for (const u of ['/api/admin/overview', '/api/admin/trainees', `/api/admin/trainees/${annId}`, '/api/admin/users', '/api/admin/audit', '/api/admin/priorities']) assert.equal((await bob('GET', u)).status, 403, u);
  assert.equal((await bob('PATCH', `/api/me/plan/${annItem}`, { status: 'done' })).status, 404, 'cannot change another person item');
  assert.equal((await bob('POST', '/api/admin/users', { email: 'x@test.local', name: 'X', role: 'admin' })).status, 403);
  assert.equal((await bob('PATCH', `/api/admin/trainees/${me.user.id}`, { role: 'admin' })).status, 403, 'cannot promote self');
  const own = me.plan[0].id;
  assert.equal((await bob('PATCH', `/api/me/plan/${own}`, { status: 'done' })).status, 200);
});

test('signed-out requests are refused; state changes need the CSRF header', async () => {
  const c = client();
  assert.equal((await c('GET', '/api/me')).status, 401);
  assert.equal((await c('GET', '/api/admin/overview')).status, 401);
  const r = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(r.status, 403);
  const r2 = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'academy', Origin: 'https://evil.example' }, body: '{}' });
  assert.equal(r2.status, 403);
});

test('admin can see everyone, manage plans, reset passwords; reset forces a change', async () => {
  const adm = client();
  assert.equal((await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: GEN })).status, 200);
  assert.equal((await adm('GET', '/api/admin/overview')).status, 403, 'admin must change the generic password first');
  await adm('POST', '/api/auth/change-password', { current: GEN, next: 'Quiet-harbor-pass-55' });
  const t = (await adm('GET', '/api/admin/trainees')).json;
  assert.equal(t.length, 2);
  const bob = t.find((x) => x.email === 'bob@test.local');
  const add = await adm('POST', '/api/admin/plan', { user_ids: t.map((x) => x.id), title: 'Shared session', month: 1, kind: 'session', scenario: 'teams', due_date: '2026-12-02' });
  assert.equal(add.json.added, 2, JSON.stringify(add));
  assert.equal((await adm('POST', '/api/admin/plan', { user_ids: [bob.id], title: 'x', month: 4 })).status, 400);
  assert.equal((await adm('POST', '/api/admin/plan', { user_ids: [bob.id], title: 'x', month: 1, link: 'javascript:alert(1)' })).status, 400, 'only https links');
  assert.equal((await adm('POST', `/api/admin/users/${bob.id}/reset-password`)).status, 200);
  const b = client();
  const l = await b('POST', '/api/auth/login', { email: 'bob@test.local', password: GEN });
  assert.equal(l.json.user.mustChange, true);
  const pr = (await adm('GET', '/api/admin/priorities')).json;
  assert.equal(pr.scenarios.length, 12);
  const imp1 = await adm('POST', '/api/admin/import', { kind: 'plan', csv: 'email,month,title\nann@test.local,2,Imported item' });
  assert.equal(imp1.status, 400, 'plans are built automatically, there is no plan import');
  assert.equal((await adm('PATCH', `/api/admin/trainees/${(await q("SELECT id FROM users WHERE email='boss@test.local'")).rows[0].id}`, { active: false })).status, 400, 'cannot deactivate self');
  const csv = await fetch(base + '/api/admin/export/results.csv', { headers: { cookie: '' } });
  assert.equal(csv.status, 401);
});

test('an admin who is also on the team keeps their own trainee data', async () => {
  await imp.importRoster([{ email: 'dual@test.local', name: 'Dual Person', region: 'AMER', team: 'Technical Solutions / Support' }]);
  await imp.importLiveScores({ key: 'r1-live', label: 'R1 Knowledge Test', sort: 1 }, [{ email: 'dual@test.local', scenario: 'overall', correct: 30, total: 50 }]);
  process.env.ADMIN_EMAILS = 'boss@test.local,dual@test.local';
  const { ensureAdmins } = await import('../server/auth.js');
  await ensureAdmins();
  const row = (await q("SELECT role,is_trainee FROM users WHERE email='dual@test.local'")).rows[0];
  assert.equal(row.role, 'admin'); assert.equal(row.is_trainee, true);
  const c = client();
  await c('POST', '/api/auth/login', { email: 'dual@test.local', password: GEN });
  await c('POST', '/api/auth/change-password', { current: GEN, next: 'Calm-meadow-pass-42' });
  const mine = (await c('GET', '/api/me')).json;
  assert.equal(mine.user.email, 'dual@test.local');
  assert.deepEqual(mine.scores.map((s) => Math.round(s.pct)), [60], 'only their own score');
  assert.ok((await c('GET', '/api/admin/trainees')).json.some((x) => x.email === 'dual@test.local'), 'listed as a trainee for other admins');
});

test('five wrong passwords lock the account', async () => {
  const c = client();
  for (let i = 0; i < 5; i++) await c('POST', '/api/auth/login', { email: 'ann@test.local', password: 'bad-guess' });
  const r = await c('POST', '/api/auth/login', { email: 'ann@test.local', password: 'Brand-new-pass-77' });
  assert.equal(r.status, 401); assert.match(r.json.error, /locked/);
  await q("UPDATE users SET locked_until=NULL, failed_logins=0 WHERE email='ann@test.local'");
});

test('deactivated users cannot sign in and live sessions end', async () => {
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  const bob = client(); await bob('POST', '/api/auth/login', { email: 'bob@test.local', password: GEN });
  await bob('POST', '/api/auth/change-password', { current: GEN, next: 'Second-river-pass-1' });
  const id = (await q("SELECT id FROM users WHERE email='bob@test.local'")).rows[0].id;
  assert.equal((await adm('PATCH', `/api/admin/trainees/${id}`, { active: false })).status, 200);
  assert.equal((await bob('GET', '/api/me')).status, 401);
  assert.equal((await client()('POST', '/api/auth/login', { email: 'bob@test.local', password: 'Second-river-pass-1' })).status, 401);
});

test('programme: built automatically, approved by an admin, graded on the server, updated by inputs', async () => {
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  const ann = client(); assert.equal((await ann('POST', '/api/auth/login', { email: 'ann@test.local', password: 'Brand-new-pass-77' })).status, 200);
  const annId = (await q("SELECT id FROM users WHERE email='ann@test.local'")).rows[0].id;
  // Before approval the trainee sees a pending page, not the draft.
  const pending = await ann('GET', '/api/me/programme');
  assert.equal(pending.status, 200); assert.equal(pending.json.status, 'pending'); assert.equal(pending.json.plan, undefined);
  const ov = await adm('GET', '/api/admin/programme');
  assert.ok(ov.json.rows.some((r) => r.id === annId && r.status === 'draft'));
  assert.equal((await ann('GET', '/api/admin/programme')).status, 403);
  assert.equal((await adm('POST', `/api/admin/trainees/${annId}/programme/approve`)).status, 200);
  const p = await ann('GET', '/api/me/programme');
  assert.equal(p.json.status, 'approved'); assert.equal(p.json.state.items[0].key, 'kickoff');
  assert.ok(p.json.state.items.some((i) => i.kind === 'baseline'), 'no per-scenario test, so a baseline check is planned');
  // Quiz answers never reach the browser before an attempt, and grading happens on the server.
  const mod = await ann('GET', '/api/me/modules/teams');
  assert.equal(mod.status, 200);
  const items = mod.json.check;
  assert.ok(items.length >= 5 && items.some((x) => x.t !== 'mcq'), 'a mixed draw');
  assert.ok(items.every((x) => x.a === undefined && x.why === undefined && x.pairs === undefined), 'no answers sent before an attempt');
  assert.equal((await ann('POST', '/api/me/modules/teams/attempt', { answers: [{ id: 'zoom.0', v: 1, c: 3 }] })).status, 400, 'questions from another module are refused');
  const right = (x) => { const it = itemById(x.id); return { id: x.id, c: 3, v: it.t === 'mcq' ? it.a : it.t === 'multi' ? it.a : it.t === 'match' ? it.pairs.map((p) => p[1]) : it.steps }; };
  const at = await ann('POST', '/api/me/modules/teams/attempt', { answers: items.map(right) });
  assert.equal(at.json.correct, items.length); assert.equal(at.json.passed, true); assert.equal(at.json.planChanged, false, 'own checks do not reshuffle the plan');
  // Guessing does not pay: ticking every box in a "pick all that fit" question scores less than the right picks.
  const multi = Object.values(POOLS).flat().find((x) => x.t === 'multi' && x.module === 'teams');
  const g = await ann('POST', '/api/me/modules/teams/attempt', { answers: [{ id: multi.id, v: multi.o.map((_, i) => i) }, ...items.filter((x) => x.id !== multi.id).slice(0, 3).map(right)] });
  assert.ok(g.json.results.find((r) => r.id === multi.id).score < 1);
  // A certain wrong single answer is flagged and counts zero.
  const mcq = Object.values(POOLS).flat().find((x) => x.t === 'mcq' && x.module === 'teams');
  const w = await ann('POST', '/api/me/modules/teams/attempt', { answers: [{ id: mcq.id, v: (mcq.a + 1) % mcq.o.length, c: 3 }, ...items.filter((x) => x.id !== mcq.id).slice(0, 3).map(right)] });
  assert.equal(w.json.confidentWrong, 1);
  // Walkthrough, explain-it, feedback and the survey.
  const walk = await ann('POST', '/api/me/modules/teams/walk', { path: [0, 0, 0, 0] });
  assert.equal(walk.json.end, true); assert.equal(walk.json.score, walk.json.max);
  assert.equal((await ann('POST', '/api/me/modules/teams/walk', { path: [9] })).status, 400);
  assert.equal((await ann('POST', '/api/me/explain/teams', { text: 'short' })).status, 400);
  const ex = await ann('POST', '/api/me/explain/teams', { text: 'IT approves the KUDO app in the Teams admin center and reviews the external bot policy, starting now.' });
  assert.equal(ex.status, 200); assert.ok(ex.json.points.length > 2);
  assert.equal((await ann('POST', '/api/me/modules/teams/feedback', { clear: 5, relevant: 4, confidence: 9 })).status, 400);
  assert.equal((await ann('POST', '/api/me/modules/teams/feedback', { clear: 5, relevant: 4, confidence: 3, comment: 'Good' })).status, 200);
  const ch = await ann('GET', '/api/me/challenge'); assert.equal(ch.json.items.length, 4);
  // Trainees can tick lessons but not sessions with Jack.
  assert.equal((await ann('POST', '/api/me/items/kickoff/done', {})).status, 400);
  const lesson = p.json.state.items.find((i) => i.kind === 'lesson');
  assert.equal((await ann('POST', `/api/me/items/${lesson.key}/done`, {})).status, 200);
  // An input from the admin ticks the kick-off and, if the structure changes, creates a draft the trainee does not see yet.
  const inp = await adm('POST', `/api/admin/trainees/${annId}/inputs`, { kind: 'one_to_one', title: 'Kick-off', item_key: 'kickoff', signals: [{ scenario: 'hls', rating: 'solid' }, { scenario: 'zoom', rating: 'gap' }], shared_summary: 'Good start' });
  assert.equal(inp.status, 200);
  const p2 = await ann('GET', '/api/me/programme');
  assert.equal(p2.json.state.items.find((i) => i.key === 'kickoff').done, true);
  assert.equal(p2.json.shared[0].text, 'Good start');
  assert.equal(p2.json.version, p.json.version, 'trainee still sees the approved version');
  const detail = await adm('GET', `/api/admin/trainees/${annId}/programme`);
  if (inp.json.planChanged) assert.ok(detail.json.draft, 'changed structure waits as a draft');
  assert.equal((await adm('POST', '/api/admin/inputs/suggest', { text: 'Zoom came up. Not sure about the Zoom encryption. Confused by the Zoom waiting room.' })).json.signals[0].rating, 'gap');
  const rv = await adm('GET', '/api/admin/reviews'); const sub = rv.json.items.find((x) => x.name === 'Ann One');
  assert.ok(sub);
  assert.equal((await adm('POST', `/api/admin/submissions/${sub.id}/review`, { rubric: { accurate: 3, complete: 3, clear: 2 } })).status, 400, 'every criterion is needed');
  const rr = await adm('POST', `/api/admin/submissions/${sub.id}/review`, { rubric: { accurate: 3, complete: 3, clear: 3, handover: 2 }, comment: 'Clear and complete' });
  assert.equal(rr.json.rating, 'solid');
  assert.equal((await ann('GET', '/api/admin/reviews')).status, 403);
  const fbk = await adm('GET', '/api/admin/feedback'); assert.equal(fbk.json.modules.find((m) => m.key === 'teams').n, 1);
  const board = await adm('GET', '/api/admin/board');
  assert.equal(board.status, 200); assert.ok(Array.isArray(board.json.tasks)); assert.ok(board.json.week.days.length >= 0);
  assert.equal((await ann('GET', '/api/admin/board')).status, 403);
  assert.equal((await adm('POST', '/api/admin/board/tasks', { key: 'nudge:1:2026-11-23', action: 'snooze' })).status, 200);
  assert.equal((await adm('POST', '/api/admin/board/group-done', { itemKey: 'kickoff', userIds: [annId] })).status, 200);
  assert.equal((await ann('GET', '/api/me/programme')).json.state.items.find((i) => i.key === 'kickoff').done, true);
  // Admin-only routes stay closed to trainees.
  assert.equal((await ann('POST', `/api/admin/trainees/${annId}/programme/approve`)).status, 403);
  assert.equal((await ann('GET', `/api/admin/trainees/${annId}/programme`)).status, 403);
});

test('explain-it recordings are reviewed automatically and spot-checks reach the board', { timeout: 240000 }, async () => {
  process.env.AUTO_REVIEW = 'on'; process.env.SPOTCHECK_SAMPLE = '0';
  await imp.importRoster([{ email: 'cara@test.local', name: 'Cara Three', region: 'EMEA', team: 'Sales' }]);
  const ann = client(); await ann('POST', '/api/auth/login', { email: 'cara@test.local', password: GEN });
  await ann('POST', '/api/auth/change-password', { current: GEN, next: 'Quiet-meadow-pass-48' });
  const good = "For KUDO to work in your Teams meetings, your IT admin first approves the KUDO app in the Teams admin center. Then check the permission policy lets hosts use third party apps, and review the external bot policy because the bot waits in the lobby. Start today, approval can take a day or more. Anyone who can't use the app can follow on the mobile link. If it still fails I bring in our technical support team.";
  const r = await ann('POST', '/api/me/explain/teams', { text: good });
  assert.equal(r.json.status, 'processing', JSON.stringify(r));
  let s; for (let i = 0; i < 80; i++) { s = (await ann('GET', `/api/me/explain/result/${r.json.id}`)).json; if (s.status !== 'processing') break; await new Promise((ok) => setTimeout(ok, 1500)); }
  assert.equal(s.status, 'auto'); assert.equal(s.auto.rating, 'solid'); assert.ok(s.review_comment.includes('key points'));
  const weak = await ann('POST', '/api/me/explain/teams', { text: 'You just add KUDO to the meeting and it works, nothing special to set up at all really.' });
  for (let i = 0; i < 80; i++) { s = (await ann('GET', `/api/me/explain/result/${weak.json.id}`)).json; if (s.status !== 'processing') break; await new Promise((ok) => setTimeout(ok, 1500)); }
  assert.equal(s.auto.rating, 'gap'); assert.equal(s.needs_human, true, 'gaps go to Jack as spot-checks');
  assert.equal((await ann('POST', `/api/me/explain/${r.json.id}/ask-jack`)).status, 200);
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  const board = (await adm('GET', '/api/admin/board')).json;
  assert.ok(board.tasks.some((t) => t.type === 'review' && /asked for your view/.test(t.detail)));
  process.env.AUTO_REVIEW = 'off';
});

test('test trainees are created and reset by admins and never count in team results', async () => {
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  const c = await adm('POST', '/api/admin/demo', { name: 'Jack' });
  assert.equal(c.status, 200); assert.equal(c.json.email, 'demo.jack@kudo.ai');
  assert.equal((await adm('POST', '/api/admin/demo', { name: 'Jack' })).status, 400, 'no duplicates');
  const t = client(); await t('POST', '/api/auth/login', { email: 'demo.jack@kudo.ai', password: GEN });
  await t('POST', '/api/auth/change-password', { current: GEN, next: 'Test-orchard-pass-62' });
  const p = await t('GET', '/api/me/programme'); assert.equal(p.json.status, 'approved', 'ready to use straight away');
  await t('POST', '/api/me/modules/teams/feedback', { clear: 1, relevant: 1, confidence: 1 });
  const fb = (await adm('GET', '/api/admin/feedback')).json.modules.find((m) => m.key === 'teams');
  assert.notEqual(fb.clear, 1, 'test feedback stays out of the team averages');
  const team = (await adm('GET', '/api/admin/trainees')).json; assert.ok(!team.some((x) => x.email === 'demo.jack@kudo.ai'), 'not on the team list');
  const r = await adm('POST', `/api/admin/demo/${c.json.id}/reset`); assert.equal(r.status, 200);
  assert.equal((await t('GET', '/api/me/programme')).status, 401, 'old session is gone');
  assert.equal((await client()('POST', '/api/auth/login', { email: 'demo.jack@kudo.ai', password: GEN })).status, 200, 'generic password again');
  const realId = (await q("SELECT id FROM users WHERE email='bob@test.local'")).rows[0].id;
  // Admins step into a test trainee, take a course, and come back.
  const demoId = (await q("SELECT id FROM users WHERE email='demo.jack@kudo.ai'")).rows[0].id;
  assert.equal((await adm('POST', '/api/auth/act-as', { id: realId })).status, 404, 'never a real person');
  assert.equal((await adm('POST', '/api/auth/act-as', { id: demoId })).status, 200);
  const meNow = (await adm('GET', '/api/auth/me')).json.user;
  assert.equal(meNow.email, 'demo.jack@kudo.ai'); assert.ok(meNow.actingAs); assert.equal(meNow.mustChange, false);
  const prog = await adm('GET', '/api/me/programme'); assert.equal(prog.status, 200);
  const lesson = prog.json.state.items.find((i) => i.kind === 'lesson' && !i.done);
  assert.equal((await adm('POST', `/api/me/items/${lesson.key}/done`, {})).status, 200);
  assert.equal((await adm('GET', '/api/admin/board')).status, 403, 'no admin rights while acting');
  assert.equal((await adm('POST', '/api/auth/change-password', { current: 'x', next: 'Whatever-pass-99' })).status, 400);
  assert.equal((await adm('POST', '/api/auth/act-as/stop')).status, 200);
  assert.equal((await adm('GET', '/api/admin/board')).status, 200, 'admin again');
  const tr = client(); await tr('POST', '/api/auth/login', { email: 'demo.jack@kudo.ai', password: GEN });
  assert.equal((await tr('POST', '/api/auth/act-as', { id: demoId })).status, 403, 'trainees cannot act as anyone');
  assert.equal((await adm('POST', `/api/admin/demo/${realId}/reset`)).status, 404, 'a real person can never be reset');
});
