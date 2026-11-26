// Integration tests. Needs a throwaway Postgres: DATABASE_URL=... INITIAL_PASSWORD=... npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server/index.js';
import { pool, q } from '../server/db.js';
import * as imp from '../server/importers.js';
import { itemById, POOLS, seal } from '../server/assess.js';
import { WALKTHROUGHS } from '../server/curriculum-extra.js';

// Answers in the order the browser was shown them (options are shuffled and the order is sealed in x.k).
const shownRight = (x) => { const it = itemById(x.id); const at = (i) => x.o.indexOf(it.o[i]);
  return { id: x.id, k: x.k, c: 3, v: it.t === 'mcq' ? at(it.a) : it.t === 'multi' ? it.a.map(at) : it.t === 'match' ? it.pairs.map((p) => p[1]) : it.steps }; };
const shownWrong = (x) => { const it = itemById(x.id); const at = (i) => x.o.indexOf(it.o[i]);
  return { id: x.id, k: x.k, c: 1, v: it.t === 'mcq' ? at((it.a + 1) % it.o.length) : it.t === 'multi' ? [] : it.t === 'match' ? it.pairs.map(() => 'x') : [...it.steps].reverse() }; };
// An item as if shown in its stored order.
const asShown = (it) => ({ id: it.id, ...(it.o ? { o: it.o, k: seal({ i: it.id, p: it.o.map((_, i) => i) }) } : {}) });
// Play a walkthrough the way the browser does: one step at a time, clicking the choice whose stored position is pick(i).
async function playWalk(cl, key, pick) {
  let next = (await cl('GET', `/api/me/modules/${key}/walk`)).json.first; const path = [], keys = []; let r;
  for (const [i, st] of WALKTHROUGHS[key].steps.entries()) {
    path.push(next.choices.indexOf(st.choices[pick(i, st)].t)); keys.push(next.k);
    r = await cl('POST', `/api/me/modules/${key}/walk`, { path, keys }); next = r.json.next;
  }
  return r;
}
const best = (i, st) => st.choices.findIndex((c) => c.q === 2);

process.env.INITIAL_PASSWORD ||= 'Generic-Pass-1!';
process.env.AUTO_REVIEW ||= 'off';
process.env.LOGIN_RATE_LIMIT ||= '200'; // the automatic-review test below switches it on
process.env.ADMIN_EMAILS ||= 'boss@test.local';
const GEN = process.env.INITIAL_PASSWORD;
let server, base;

function client() {
  let cookie = '';
  return async (method, url, body, headers = {}) => {
    const raw = Buffer.isBuffer(body);
    const res = await fetch(base + url, { method, headers: { 'Content-Type': raw ? 'application/octet-stream' : 'application/json', 'X-Requested-With': 'academy', ...(cookie ? { cookie } : {}), ...headers }, body: body === undefined ? undefined : raw ? body : JSON.stringify(body), redirect: 'manual' });
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
  assert.equal(l.json.user.tourSeen, false, 'the guided tour shows on first sign-in');
  assert.equal((await c('POST', '/api/auth/change-password', { current: GEN, next: GEN })).status, 400);
  assert.equal((await c('POST', '/api/auth/change-password', { current: GEN, next: 'short1' })).status, 400);
  assert.equal((await c('POST', '/api/auth/change-password', { current: 'wrong', next: 'Brand-new-pass-77' })).status, 400);
  assert.equal((await c('POST', '/api/auth/change-password', { current: GEN, next: 'Brand-new-pass-77' })).status, 200);
  assert.equal((await c('POST', '/api/auth/tour-seen')).status, 200);
  assert.equal((await c('GET', '/api/auth/me')).json.user.tourSeen, true, 'and only once');
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
  const right = shownRight;
  assert.ok(items.filter((x) => x.t === 'mcq').every((x) => typeof x.k === 'string' && x.k.length > 20), 'option order is sealed');
  assert.equal((await ann('POST', '/api/me/modules/teams/attempt', { answers: items.map((x) => ({ ...right(x), k: undefined })) })).status, 400, 'answers without the sealed order are refused');
  const at = await ann('POST', '/api/me/modules/teams/attempt', { answers: items.map(right) });
  assert.equal(at.json.correct, items.length); assert.equal(at.json.passed, true); assert.equal(at.json.planChanged, false, 'own checks do not reshuffle the plan');
  // Guessing does not pay: ticking every box in a "pick all that fit" question scores less than the right picks.
  const multi = Object.values(POOLS).flat().find((x) => x.t === 'multi' && x.module === 'teams');
  const g = await ann('POST', '/api/me/modules/teams/attempt', { answers: [{ ...asShown(multi), v: multi.o.map((_, i) => i) }, ...items.filter((x) => x.id !== multi.id).slice(0, 3).map(right)] });
  assert.ok(g.json.results.find((r) => r.id === multi.id).score < 1);
  // A certain wrong single answer is flagged and counts zero.
  const mcq = Object.values(POOLS).flat().find((x) => x.t === 'mcq' && x.module === 'teams');
  const w = await ann('POST', '/api/me/modules/teams/attempt', { answers: [{ ...asShown(mcq), v: (mcq.a + 1) % mcq.o.length, c: 3 }, ...items.filter((x) => x.id !== mcq.id).slice(0, 3).map(right)] });
  assert.equal(w.json.confidentWrong, 1);
  // Walkthrough, explain-it, feedback and the survey.
  const walk = await playWalk(ann, 'teams', best);
  assert.equal(walk.json.end, true); assert.equal(walk.json.score, walk.json.max);
  assert.equal((await ann('POST', '/api/me/modules/teams/walk', { path: [0, 0, 0, 0] })).status, 400, 'a path without the sealed order is refused');
  assert.equal((await ann('POST', '/api/me/explain/teams', { text: 'short' })).status, 400);
  const ex = await ann('POST', '/api/me/explain/teams', { text: 'IT approves the KUDO app in the Teams admin center and reviews the external bot policy, starting now.' });
  assert.equal(ex.status, 200); assert.ok(ex.json.points.length > 2);
  assert.equal((await ann('POST', '/api/me/modules/teams/feedback', { clear: 5, relevant: 4, confidence: 9 })).status, 400);
  assert.equal((await ann('POST', '/api/me/modules/teams/feedback', { clear: 5, relevant: 4, confidence: 3, comment: 'Good' })).status, 200);
  const ch = await ann('GET', '/api/me/challenge'); assert.equal(ch.json.items.length, 4);
  const chDone = await ann('POST', '/api/me/challenge', { answers: ch.json.items.map(shownRight) });
  assert.equal(chDone.json.weeksActive, 1); assert.ok(chDone.json.weeksSoFar >= 1); assert.equal(chDone.json.streak, undefined, 'no streak that resets');
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
  assert.ok(fbk.json.stats.some((x) => x.module === 'teams' && x.verdict === 'too few answers yet'), 'item statistics per question');
  assert.ok(fbk.json.agreement && Array.isArray(fbk.json.agreement.lines));
  const board = await adm('GET', '/api/admin/board');
  assert.equal(board.status, 200); assert.ok(Array.isArray(board.json.tasks)); assert.ok(board.json.week.days.length >= 0);
  assert.equal((await ann('GET', '/api/admin/board')).status, 403);
  assert.equal((await adm('POST', '/api/admin/board/tasks', { key: 'nudge:1:2026-11-23', action: 'snooze' })).status, 200);
  assert.equal((await adm('POST', '/api/admin/board/group-done', { itemKey: 'kickoff', userIds: [annId] })).status, 200);
  assert.equal((await ann('GET', '/api/me/programme')).json.state.items.find((i) => i.key === 'kickoff').done, true);
  // Videos and worked examples on the module page.
  assert.equal((await adm('PUT', '/api/admin/curriculum/teams/video', { url: 'javascript:alert(1)' })).status, 400);
  assert.equal((await ann('PUT', '/api/admin/curriculum/teams/video', { url: 'https://kudolive.sharepoint.com/x' })).status, 403);
  assert.equal((await adm('PUT', '/api/admin/curriculum/teams/video', { url: 'https://kudolive.sharepoint.com/_layouts/15/embed.aspx?UniqueId=abc' })).status, 200);
  const tm = (await ann('GET', '/api/me/modules/teams')).json;
  assert.ok(tm.video.includes('embed.aspx')); assert.ok(tm.caseStudy.example.length > 50 && tm.caseStudy.mistakes.length >= 2);
  // The trainee may choose the third focus area; it becomes a draft for Jack.
  await adm('POST', `/api/admin/trainees/${annId}/programme/approve`);
  const opt = await ann('GET', '/api/me/plan/options'); assert.equal(opt.status, 200);
  if (opt.json.canChoose && !opt.json.pending) {
    const alt = opt.json.options.find((x) => !x.current);
    assert.equal((await ann('POST', '/api/me/plan/focus', { third: 'not-a-scenario' })).status, 400);
    const ch2 = await ann('POST', '/api/me/plan/focus', { third: alt.scenario }); assert.equal(ch2.json.status, 'draft');
    assert.equal((await ann('GET', '/api/me/plan/options')).json.pending, true);
  }
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
  const retry = await ann('POST', '/api/me/explain/teams', { text: 'You just add KUDO to the meeting and it works, nothing special to set up at all really.' });
  assert.equal(retry.json.counts, false, 'a second recording is practice');
  for (let i = 0; i < 80; i++) { s = (await ann('GET', `/api/me/explain/result/${retry.json.id}`)).json; if (s.status !== 'processing') break; await new Promise((ok) => setTimeout(ok, 1500)); }
  assert.equal(s.needs_human, false, 'practice retries do not go to Jack');
  const weak = await ann('POST', '/api/me/explain/zoom', { text: 'You just add KUDO to the meeting and it works, nothing special to set up at all really.' });
  for (let i = 0; i < 80; i++) { s = (await ann('GET', `/api/me/explain/result/${weak.json.id}`)).json; if (s.status !== 'processing') break; await new Promise((ok) => setTimeout(ok, 1500)); }
  assert.equal(s.auto.rating, 'gap'); assert.equal(s.needs_human, true, 'gaps go to Jack as spot-checks');
  assert.equal((await ann('POST', `/api/me/explain/${r.json.id}/ask-jack`)).status, 200);
  // Practice: a good email is reviewed and signed off on its own; practice can no longer be ticked by hand.
  const email = "Hello, before your first KUDO event in Teams, please approve the KUDO app in the Teams admin center and check the permission policy allows hosts to use third-party apps. Please also review the external bot policy: by default the bot waits in the lobby until someone admits it. Microsoft can take 24 hours or more, so please start today. Anyone who cannot use the app can follow on the Mobile Link in a browser.";
  const pr = await ann('POST', '/api/me/explain/teams', { text: email, kind: 'practice' });
  for (let i = 0; i < 80; i++) { s = (await ann('GET', `/api/me/explain/result/${pr.json.id}`)).json; if (s.status !== 'processing') break; await new Promise((ok) => setTimeout(ok, 1500)); }
  assert.notEqual(s.auto.rating, 'gap', JSON.stringify(s.auto.points));
  const caraId = (await q("SELECT id FROM users WHERE email='cara@test.local'")).rows[0].id;
  const pp = (await q("SELECT signed_off_at FROM plan_progress WHERE user_id=$1 AND item_key='teams.practice'", [caraId])).rows[0];
  assert.ok(pp?.signed_off_at, 'signed off automatically');
  assert.equal((await ann('POST', '/api/me/items/teams.practice/done', {})).status === 200, false, 'no manual tick for practice');
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
  // A trainee can choose the third focus area; the change waits for Jack's approval.
  const opt = (await adm('GET', '/api/me/plan/options')).json;
  assert.equal(opt.canChoose, true); assert.equal(opt.keep.length, 2);
  const alt = opt.options.find((x) => !x.current);
  assert.equal((await adm('POST', '/api/me/plan/focus', { third: 'not-a-scenario' })).status, 400);
  assert.equal((await adm('POST', '/api/me/plan/focus', { third: alt.scenario })).json.status, 'draft');
  assert.equal((await adm('GET', '/api/me/plan/options')).json.pending, true);
  assert.equal((await adm('POST', '/api/auth/change-password', { current: 'x', next: 'Whatever-pass-99' })).status, 400);
  assert.equal((await adm('POST', '/api/auth/act-as/stop')).status, 200);
  assert.equal((await adm('GET', '/api/admin/board')).status, 200, 'admin again');
  const tr = client(); await tr('POST', '/api/auth/login', { email: 'demo.jack@kudo.ai', password: GEN });
  assert.equal((await tr('POST', '/api/auth/act-as', { id: demoId })).status, 403, 'trainees cannot act as anyone');
  assert.equal((await adm('POST', `/api/admin/demo/${realId}/reset`)).status, 404, 'a real person can never be reset');
});

test('the first attempt is the score of record; retakes are practice', async () => {
  await imp.importRoster([{ email: 'dana@test.local', name: 'Dana Four', region: 'EMEA', team: 'Sales' }]);
  const d = client(); await d('POST', '/api/auth/login', { email: 'dana@test.local', password: GEN });
  await d('POST', '/api/auth/change-password', { current: GEN, next: 'Quiet-valley-pass-73' });
  const right = shownRight, wrong = shownWrong;
  const set1 = (await d('GET', '/api/me/modules/zoom')).json.check;
  const first = await d('POST', '/api/me/modules/zoom/attempt', { answers: set1.map(wrong) });
  assert.equal(first.json.counts, true); assert.ok(first.json.correct < first.json.total / 2);
  const set2 = (await d('GET', '/api/me/modules/zoom')).json.check;
  const second = await d('POST', '/api/me/modules/zoom/attempt', { answers: set2.map(right) });
  assert.equal(second.json.counts, false, 'a retake is practice');
  assert.equal(second.json.record.correct, first.json.correct, 'the first score stays the record');
  const id = (await q("SELECT id FROM users WHERE email='dana@test.local'")).rows[0].id;
  const rows = (await q("SELECT counts FROM quiz_attempts WHERE user_id=$1 AND module_key='zoom' ORDER BY id", [id])).rows.map((r) => r.counts);
  assert.deepEqual(rows, [true, false]);
  // The level only moves with the recorded attempt.
  const { loadContext, computeLevels } = await import('../server/engine.js');
  const ctx = await loadContext(id); const lv = computeLevels(ctx.users.find((u) => u.id === id), ctx);
  assert.ok(lv.per.zoom.est < 60, `level reflects the poor first attempt (${lv.per.zoom.est})`);
  // Walkthroughs follow the same rule.
  const w1 = await playWalk(d, 'zoom', (i, st) => (best(i, st) + 1) % st.choices.length);
  const w2 = await playWalk(d, 'zoom', best);
  assert.equal(w1.json.counts, true); assert.equal(w2.json.counts, false); assert.equal(w2.json.record.correct, w1.json.score);
  // Spaced review: missed questions come back after a week, as practice.
  assert.equal((await d('GET', '/api/me/review')).json.due, 0, 'nothing due on the day');
  await q("UPDATE quiz_attempts SET created_at = now() - interval '8 days' WHERE user_id=$1", [id]);
  const rv = await d('GET', '/api/me/review');
  assert.ok(rv.json.due > 0 && rv.json.items.length > 0, 'missed questions are due a week later');
  const lvBefore = computeLevels(ctx.users.find((u) => u.id === id), await loadContext(id)).per.zoom.est;
  const done = await d('POST', '/api/me/review', { answers: rv.json.items.map(right) });
  assert.equal(done.status, 200); assert.equal(done.json.counts, false);
  const ctx2 = await loadContext(id);
  assert.equal(computeLevels(ctx2.users.find((u) => u.id === id), ctx2).per.zoom.est, lvBefore, 'review does not change levels');
  const after = (await d('GET', '/api/me/review')).json;
  assert.ok(after.due < rv.json.due || after.items.every((x) => !rv.json.items.some((y) => y.id === x.id)), 'reviewed questions wait for their next return');
});

test('scoring: shuffled options are graded by meaning, order questions get credit per correct next step', async () => {
  const { grade, publicItem } = await import('../server/assess.js');
  const mcq = Object.values(POOLS).flat().find((x) => x.t === 'mcq');
  const shown = Array.from({ length: 40 }, () => publicItem(mcq));
  assert.ok(new Set(shown.map((x) => x.o.indexOf(mcq.o[mcq.a]))).size > 1, 'the answer moves between draws');
  for (const x of shown.slice(0, 5)) assert.equal(grade([{ id: x.id, k: x.k, v: x.o.indexOf(mcq.o[mcq.a]), c: 2 }]).results[0].score, 1);
  const forged = { ...shown[0], k: shown[1].k.slice(0, -2) + 'AA' };
  assert.ok(grade([{ id: forged.id, k: forged.k, v: 0 }]).error, 'a tampered order token is refused');
  const { draw } = await import('../server/assess.js');
  for (let i = 0; i < 20; i++) assert.ok(draw('marketplace').every((x) => !x.reserve), 'reserve questions stay out in the first cycle');
  assert.ok(Array.from({ length: 30 }, () => draw('marketplace', 6, { reserve: true })).flat().some((x) => x.reserve), 'and come in for the next cycle');
  assert.ok(Object.keys(POOLS).every((k) => POOLS[k].length >= 10), 'every module has at least 10 questions');
  const ord = Object.values(POOLS).flat().find((x) => x.t === 'order' && x.steps.length >= 5);
  const sc = (v) => grade([{ id: ord.id, v }]).results[0].score;
  assert.equal(sc(ord.steps), 1);
  assert.equal(sc([...ord.steps.slice(1), ord.steps[0]]), (ord.steps.length - 2) / (ord.steps.length - 1), 'one step out of place keeps the rest of the sequence');
  assert.equal(sc([...ord.steps].reverse()), 0);
});

test('sessions: a transcript is analysed, and Jack turns questions into a FAQ entry and a check question', async () => {
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  const tid = (await q("SELECT id FROM users WHERE email='dana@test.local'")).rows[0].id;
  const vtt = `WEBVTT

00:00:01.000 --> 00:00:05.000
<v Jack Admin>Good morning, can you hear me?</v>

00:00:06.000 --> 00:00:12.000
<v Dana Four>Yes. Why does the KUDO bot wait in the Teams lobby even when the lobby is open to everyone?</v>

00:00:13.000 --> 00:00:25.000
<v Jack Admin>That is expected. Teams holds detected bots in the lobby, so the host opens People and admits the KUDO AI Translator.</v>

00:00:26.000 --> 00:00:33.000
<v Dana Four>And how do we invoice a client in Brazil for interpretation in local currency through the billing portal?</v>

00:00:34.000 --> 00:00:40.000
<v Jack Admin>Finance handles that, ask the account manager to raise it with them.</v>
`;
  assert.equal((await adm('POST', '/api/admin/sessions', { kind: 'one_to_one', title: 'Test 1:1', user_ids: [], filename: 'a.vtt' })).status, 400, 'a 1:1 needs its trainee');
  assert.equal((await adm('POST', '/api/admin/sessions', { kind: 'group', title: 'x', filename: 'a.exe' })).status, 400, 'only transcripts and recordings');
  const cr = await adm('POST', '/api/admin/sessions', { kind: 'one_to_one', title: 'Test 1:1', user_ids: [tid], filename: 'meeting.vtt', host_name: 'Jack Admin' });
  assert.equal(cr.status, 200);
  const tr = client(); await tr('POST', '/api/auth/login', { email: 'dana@test.local', password: 'Quiet-valley-pass-73' });
  assert.equal((await tr('GET', '/api/admin/sessions')).status, 403, 'trainees never see sessions');
  assert.equal((await adm('PUT', `/api/admin/sessions/${cr.json.id}/file`, Buffer.from(vtt))).status, 200);
  let s; for (let k = 0; k < 50; k++) { s = (await adm('GET', `/api/admin/sessions/${cr.json.id}`)).json; if (s.status === 'ready' || s.status === 'failed') break; await new Promise((r) => setTimeout(r, 100)); }
  assert.equal(s.status, 'ready', s.error);
  assert.ok(s.transcript.includes('Dana Four: Yes.'));
  const lobby = s.findings.find((f) => /lobby/.test(f.q));
  assert.ok(lobby, 'the product question is found'); assert.equal(lobby.module, 'teams'); assert.equal(lobby.asker, 'Dana Four'); assert.ok(/admits/.test(lobby.answer), 'with the answer given');
  assert.ok(!s.findings.some((f) => /hear me/.test(f.q)), 'small talk is ignored');
  // FAQ entry
  const faq = await adm('POST', '/api/admin/field-notes', { kind: 'faq', module: 'teams', question: lobby.q, answer: 'It is expected: the host admits the bot from People.', session_id: s.id, finding_id: lobby.id });
  assert.equal(faq.status, 200);
  const mod = (await tr('GET', '/api/me/modules/teams')).json;
  assert.ok(mod.faq.some((f) => /lobby/.test(f.question)), 'trainees see it in the lesson'); assert.ok(!JSON.stringify(mod.faq).includes('Dana'), 'without names');
  // New check question
  assert.equal((await adm('POST', '/api/admin/field-notes', { kind: 'item', module: 'teams', question: 'Who admits the bot?', options: ['The host', 'The host', 'x', 'y'], correct: 0 })).status, 400, 'four different options');
  const it = await adm('POST', '/api/admin/field-notes', { kind: 'item', module: 'teams', question: 'The KUDO bot waits in the Teams lobby. Who lets it in?', options: ['The host, from People', 'KUDO support, remotely', 'Any attendee, from chat', 'Nobody: it joins after 10 minutes'], correct: 0, answer: 'The host admits it from People.' });
  assert.equal(it.status, 200);
  assert.ok(POOLS.teams.some((x) => x.id === it.json.itemId), 'the question joins the module checks');
  assert.equal((await adm('GET', `/api/admin/sessions/${s.id}`)).json.findings.find((f) => f.id === lobby.id).status, 'faq');
  const ins = (await adm('GET', '/api/admin/sessions-insights')).json; assert.equal(ins.sessions, 1); assert.ok(ins.published >= 2);
  // Withdrawing takes it out again.
  assert.equal((await adm('DELETE', `/api/admin/field-notes/${faq.json.id}`)).status, 200);
  assert.ok(!(await tr('GET', '/api/me/modules/teams')).json.faq.some((f) => /lobby/.test(f.question)));
  assert.equal((await adm('DELETE', `/api/admin/sessions/${s.id}`)).status, 200);
});


test('a role changed by hand sticks, even if the email is still in ADMIN_EMAILS', async () => {
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  await q("INSERT INTO users (email,name,role,team,weight,password_hash,must_change_password) VALUES ('lock@test.local','Lock Test','admin','Admin',0,'x',TRUE)");
  const id = (await q("SELECT id FROM users WHERE email='lock@test.local'")).rows[0].id;
  assert.equal((await adm('PATCH', `/api/admin/trainees/${id}`, { role: 'trainee' })).status, 200);
  const before = process.env.ADMIN_EMAILS; process.env.ADMIN_EMAILS = `${before},lock@test.local`;
  const { ensureAdmins } = await import('../server/auth.js'); await ensureAdmins();
  process.env.ADMIN_EMAILS = before;
  const u = (await q('SELECT role,role_locked FROM users WHERE id=$1', [id])).rows[0];
  assert.equal(u.role, 'trainee'); assert.equal(u.role_locked, true);
});

test('collectibles: earned at milestones, never taken back, revealed once', async () => {
  const d = client(); await d('POST', '/api/auth/login', { email: 'dana@test.local', password: 'Quiet-valley-pass-73' });
  const id = (await q("SELECT id FROM users WHERE email='dana@test.local'")).rows[0].id;
  const c1 = await d('GET', '/api/me/collectibles'); assert.equal(c1.status, 200);
  assert.ok(c1.json.total >= 25 && c1.json.cards.every((c) => c.earn && c.title));
  const has = (r, k) => r.json.cards.find((c) => c.key === k).earned;
  assert.ok(has(c1, 'first-step'), 'Dana has taken checks: first step');
  assert.ok(c1.json.cards.filter((c) => c.isNew).length >= 1, 'new cards are flagged for the reveal');
  assert.equal((await d('POST', '/api/me/collectibles/seen')).status, 200);
  assert.equal((await d('GET', '/api/me/collectibles')).json.cards.filter((c) => c.isNew).length, 0, 'revealed once');
  // Never taken back: even if the data behind a card disappears, the card stays.
  await q("INSERT INTO collectibles (user_id,key) VALUES ($1,'best-calls') ON CONFLICT DO NOTHING", [id]);
  await q("DELETE FROM quiz_attempts WHERE user_id=$1 AND kind='scenario'", [id]);
  assert.ok(has(await d('GET', '/api/me/collectibles'), 'best-calls'));
  const anon = client(); assert.equal((await anon('GET', '/api/me/collectibles')).status, 401);
});

test('release notes: parsed, mapped to modules, stale content flagged, applied to the lessons and undone', async () => {
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  const note = `New features

* Segmenter extended to four more languages: Our in-house segmenter now also supports Japanese, Chinese, Korean, and Russian.

Fixes and improvements

* Bot join time in AI meetings: The bot now joins a couple of minutes before the scheduled start time instead of 15 minutes before, unless preparation time is assigned.

* Glossary v2 - UI improvements: Terms can now be clicked and edited directly, without using the three-dot menu.`;
  assert.equal((await adm('POST', '/api/admin/releases', { title: 'Empty', text: 'hello' })).status, 400, 'a note without items is refused');
  const cr = await adm('POST', '/api/admin/releases', { title: 'Release test', released_on: '2026-11-20', text: note });
  assert.equal(cr.status, 200); assert.equal(cr.json.items, 3);
  const r = (await adm('GET', `/api/admin/releases/${cr.json.id}`)).json;
  const [seg, bot, glo] = r.items;
  assert.deepEqual([seg.kind, bot.kind, glo.kind], ['feature', 'fix', 'fix']);
  assert.equal(seg.title, 'Segmenter extended to four more languages');
  assert.ok(seg.modules.includes('ai') && glo.modules[0] === 'glossary' && bot.modules.includes('ai'), JSON.stringify(r.items.map((i) => i.modules)));
  // The lesson still says "15 minutes before": flagged, with a rewrite drafted from "now X instead of Y"
  const line = bot.flags.find((f) => f.kind === 'line' && f.strength === 'strong');
  assert.ok(line, JSON.stringify(bot.flags));
  assert.ok(line.suggestion && !line.suggestion.includes('15 minutes before') && line.suggestion.includes('a couple of minutes before'), line.suggestion);
  const q0 = bot.flags.find((f) => f.kind === 'question');
  assert.ok(q0, 'a check question that says 15 minutes is flagged');
  // Nothing is changed by default: the admin ticks the rewrite and the retirement
  assert.ok(bot.actions.edits.every((e) => !e.on) && bot.actions.retire.every((e) => !e.on));
  const actions = { ...bot.actions, edits: bot.actions.edits.map((e) => (e.ref === line.ref ? { ...e, on: true } : e)), retire: bot.actions.retire.map((e) => (e.ref === q0.ref ? { ...e, on: true } : e)) };
  assert.equal((await adm('PUT', `/api/admin/releases/${cr.json.id}/items/${bot.id}`, { actions })).status, 200);
  assert.equal((await adm('PUT', `/api/admin/releases/${cr.json.id}/items/${glo.id}`, { status: 'skipped' })).status, 200);
  const tr = client(); await tr('POST', '/api/auth/login', { email: 'dana@test.local', password: 'Quiet-valley-pass-73' });
  assert.equal((await tr('POST', `/api/admin/releases/${cr.json.id}/apply`)).status, 403, 'trainees cannot apply');
  const ap = await adm('POST', `/api/admin/releases/${cr.json.id}/apply`);
  assert.equal(ap.status, 200); assert.equal(ap.json.done.edits, 1); assert.equal(ap.json.done.retired, 1); assert.equal(ap.json.done.whatsnew, 2, 'skipped items publish nothing');
  const [, mod, si, pi] = line.ref.split(':');
  const lesson = (await tr('GET', `/api/me/modules/${mod}`)).json;
  assert.equal(lesson.sections[si].points[pi], line.suggestion, 'trainees read the rewritten line');
  assert.ok(lesson.updatedLines[`${si}.${pi}`], 'and it is marked as updated');
  assert.ok((await tr('GET', '/api/me/modules/ai')).json.updates.some((u) => /Bot join time/.test(u.title)), 'the AI lesson lists the change');
  const { itemById } = await import('../server/assess.js');
  assert.equal(itemById(q0.ref.slice(2)).retired, true);
  const wn = (await tr('GET', '/api/me/whats-new')).json.updates;
  assert.equal(wn.length, 2); assert.ok(!wn.some((u) => /Glossary/.test(u.title)));
  assert.equal((await adm('DELETE', `/api/admin/releases/${cr.json.id}`)).status, 400, 'applied changes must be undone before deleting');
  // Undo
  assert.equal((await adm('POST', `/api/admin/releases/${cr.json.id}/revert`)).status, 200);
  assert.equal((await tr('GET', `/api/me/modules/${mod}`)).json.sections[si].points[pi], line.text, 'the original line is back');
  assert.ok(!itemById(q0.ref.slice(2)).retired, 'the question is back in the pool');
  assert.equal((await tr('GET', '/api/me/whats-new')).json.updates.length, 0);
  assert.equal((await adm('DELETE', `/api/admin/releases/${cr.json.id}`)).status, 200);
});

test('an admin can delete a person who left; guarded against mistakes', async () => {
  const adm = client(); await adm('POST', '/api/auth/login', { email: 'boss@test.local', password: 'Quiet-harbor-pass-55' });
  const cr = await adm('POST', '/api/admin/users', { email: 'leaver@test.local', name: 'Lee Leaver', role: 'trainee', team: 'Sales' });
  const id = cr.json.id;
  await q("INSERT INTO collectibles (user_id,key) VALUES ($1,'start')", [id]);
  await q("INSERT INTO sessions (kind,title,user_ids,filename,status) VALUES ('group','Group with Lee',$1,'x.vtt','ready')", [[id]]);
  const tr = client(); await tr('POST', '/api/auth/login', { email: 'dana@test.local', password: 'Quiet-valley-pass-73' });
  assert.equal((await tr('DELETE', `/api/admin/users/${id}`, { confirm: 'leaver@test.local' })).status, 403, 'trainees cannot delete');
  assert.equal((await adm('DELETE', `/api/admin/users/${id}`, { confirm: 'someone@else' })).status, 400, 'the email must be typed');
  const me = (await adm('GET', '/api/auth/me')).json.user;
  assert.equal((await adm('DELETE', `/api/admin/users/${me.id}`, { confirm: 'boss@test.local' })).status, 400, 'not yourself');
  const ok = await adm('DELETE', `/api/admin/users/${id}`, { confirm: 'Leaver@test.local ' });
  assert.equal(ok.status, 200);
  assert.equal((await q('SELECT count(*)::int AS n FROM users WHERE id=$1', [id])).rows[0].n, 0);
  assert.equal((await q('SELECT count(*)::int AS n FROM collectibles WHERE user_id=$1', [id])).rows[0].n, 0, 'their data goes with them');
  assert.deepEqual((await q("SELECT user_ids FROM sessions WHERE title='Group with Lee'")).rows[0].user_ids, [], 'and they leave the session lists');
  assert.ok((await q("SELECT 1 FROM audit_log WHERE action='user.delete' AND target='leaver@test.local'")).rowCount, 'the deletion is logged');
  assert.equal((await adm('DELETE', `/api/admin/users/${id}`, { confirm: 'leaver@test.local' })).status, 404);
});

test('live progress: only tests move a level; lessons, practice and retakes do not', async () => {
  const d = client(); await d('POST', '/api/auth/login', { email: 'dana@test.local', password: 'Quiet-valley-pass-73' });
  const before = (await d('GET', '/api/me/progress-live')).json;
  const hb = before.scenarios.find((s) => s.key === 'hybrid');
  // A lesson ticked off and a practice signed off: no change
  const id = (await q("SELECT id FROM users WHERE email='dana@test.local'")).rows[0].id;
  await q("INSERT INTO plan_progress (user_id,item_key,status,completed_at,signed_off_at) VALUES ($1,'hybrid.lesson','done',now(),NULL),($1,'hybrid.practice','done',now(),now()) ON CONFLICT DO NOTHING", [id]);
  assert.equal((await d('GET', '/api/me/progress-live')).json.scenarios.find((s) => s.key === 'hybrid').now, hb.now, 'lessons and practice do not move the level');
  // The first module test does, and it is listed with its effect
  const set = (await d('GET', '/api/me/modules/hybrid')).json.check;
  await d('POST', '/api/me/modules/hybrid/attempt', { answers: set.map(shownRight) });
  const after = (await d('GET', '/api/me/progress-live')).json;
  const ha = after.scenarios.find((s) => s.key === 'hybrid');
  assert.ok(ha.now > hb.now, `a good first test lifts the level (${hb.now} → ${ha.now})`);
  assert.equal(ha.start, hb.start, 'the October starting point does not move');
  const m = after.modules.find((x) => x.key === 'hybrid');
  assert.equal(m.check.pct, 100); assert.equal(m.effect, ha.now - hb.now);
  assert.equal(after.feed[0].module, 'hybrid'); assert.equal(after.feed[0].to, ha.now);
  // A retake is practice: listed, no effect
  const set2 = (await d('GET', '/api/me/modules/hybrid')).json.check;
  await d('POST', '/api/me/modules/hybrid/attempt', { answers: set2.map(shownWrong) });
  const again = (await d('GET', '/api/me/progress-live')).json;
  assert.equal(again.scenarios.find((s) => s.key === 'hybrid').now, ha.now, 'a retake never moves the level');
  assert.equal(again.modules.find((x) => x.key === 'hybrid').practice.n, 1);
  assert.equal((await client()('GET', '/api/me/progress-live')).status, 401);
});
