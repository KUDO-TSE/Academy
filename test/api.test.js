// Integration tests. Needs a throwaway Postgres: DATABASE_URL=... INITIAL_PASSWORD=... npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { pool, q } from '../server/db.js';
import * as imp from '../server/importers.js';

process.env.INITIAL_PASSWORD ||= 'Generic-Pass-1!';
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
  const imp1 = await adm('POST', '/api/admin/import', { kind: 'plan', csv: 'email,month,title\nann@test.local,2,Imported item\nnobody@test.local,1,Lost' });
  assert.equal(imp1.json.saved, 1); assert.equal(imp1.json.errors.length, 1);
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
