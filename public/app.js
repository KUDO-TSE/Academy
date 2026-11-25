import { h, api, toast, modal, icon, initials } from './ui.js';
import { resultsView, progressView } from './views-trainee.js';
import * as A from './views-admin.js';
import * as P from './views-admin-programme.js';
import { programmeView, moduleRoute, missedView } from './views-programme.js';
import { surveyView } from './assess-ui.js';
import { boardView } from './views-board.js';
import { sessionsView, sessionView } from './views-sessions.js';
import { collectionView, revealNew } from './collectibles.js';
import { startTour, tourFor } from './tour.js';

const root = document.getElementById('app');
let me = null;

const NAV_TRAINEE = [['programme', 'My programme', 'plan'], ['collection', 'My collection', 'star'], ['results', 'My results', 'chart'], ['progress', 'My progress', 'trend']];
const NAV_ME = [['me-programme', 'My programme', 'plan'], ['me-collection', 'My collection', 'star'], ['me-results', 'My results', 'chart'], ['me-progress', 'My progress', 'trend']];
const NAV_ADMIN = [['board', 'My board', 'flag'], ['overview', 'Overview', 'home'], ['team', 'Team', 'team'], ['priorities', 'Priorities', 'flag'], ['programme', 'Programme', 'plan'], ['reviews', 'Reviews', 'flag'], ['sessions', 'Sessions', 'upload'], ['feedback', 'Feedback', 'chart'], ['curriculum', 'Curriculum', 'info'], ['try', 'Try as a trainee', 'user'], ['SEP', 'Admin'], ['imports', 'Imports', 'upload'], ['users', 'Users & access', 'key'], ['audit', 'Activity log', 'log'], ['logic', 'Logic notes', 'info']];

async function boot() {
  try { me = (await api('GET', '/api/auth/me')).user; } catch { me = null; }
  render();
}

function render() {
  root.replaceChildren();
  if (!me) return root.append(loginScreen());
  if (me.mustChange) return root.append(changePasswordScreen(true));
  root.append(shell());
  route().then(() => { if (!me.tourSeen) runTour(); });
}

// ------------------------------------------------------------ Guided tour
function runTour() {
  const start = location.hash.replace(/^#/, '');
  startTour(tourFor(me), {
    go: async (r) => { if (location.hash.replace(/^#/, '') !== r) { history.replaceState(null, '', `#${r}`); await route(); } },
    onEnd: async () => {
      if (!me.tourSeen) { me.tourSeen = true; try { await api('POST', '/api/auth/tour-seen'); } catch { /* shown again next time */ } }
      if (location.hash.replace(/^#/, '') !== start) { history.replaceState(null, '', start ? `#${start}` : location.pathname); route(); }
    },
  });
}

// ------------------------------------------------------------ Login
function brandHero(text) {
  return h('div', { class: 'login-hero' },
    h('img', { src: '/kudo-logo.png', alt: 'KUDO' }),
    h('div', { class: 'copy' }, h('h1', null, 'KUDO Academy'), h('p', null, text)),
    h('span', { class: 'blob b1' }), h('span', { class: 'blob b2' }), h('span', { class: 'blob b3' }));
}
function loginScreen() {
  const email = h('input', { type: 'email', autocomplete: 'username', required: true, placeholder: 'you@kudo.ai' });
  const pw = h('input', { type: 'password', autocomplete: 'current-password', required: true });
  const err = h('div');
  const btn = h('button', { class: 'btn primary block', type: 'submit' }, 'Sign in');
  const form = h('form', { novalidate: true, on: { submit: async (e) => {
    e.preventDefault(); err.replaceChildren(); btn.disabled = true;
    try { me = (await api('POST', '/api/auth/login', { email: email.value, password: pw.value })).user; location.hash = ''; render(); }
    catch (ex) { err.replaceChildren(h('div', { class: 'err', role: 'alert' }, ex.message)); btn.disabled = false; pw.value = ''; pw.focus(); }
  } } },
  h('label', { class: 'f' }, h('span', { class: 'l' }, 'Email'), email), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Password'), pw), err, btn);
  return h('div', { class: 'login' }, brandHero('Product knowledge, client scenarios and how KUDO fits each client. Your results, your progress, your plan.'),
    h('div', { class: 'login-panel' }, h('div', { class: 'login-card' }, h('h2', null, 'Sign in'), h('p', { class: 'lead' }, 'Use your KUDO email. First time here? Use the password you were given, then choose your own.'), form)));
}

function passwordFields() {
  return { cur: h('input', { type: 'password', autocomplete: 'current-password' }), n1: h('input', { type: 'password', autocomplete: 'new-password' }), n2: h('input', { type: 'password', autocomplete: 'new-password' }) };
}
async function submitPassword(f, err, done) {
  err.replaceChildren();
  if (f.n1.value !== f.n2.value) return err.append(h('div', { class: 'err', role: 'alert' }, 'The two new passwords do not match.'));
  try { await api('POST', '/api/auth/change-password', { current: f.cur.value, next: f.n1.value }); done(); }
  catch (e) { err.append(h('div', { class: 'err', role: 'alert' }, e.message)); }
}
function changePasswordScreen(forced) {
  const f = passwordFields(); const err = h('div');
  const form = h('form', { novalidate: true, on: { submit: (e) => { e.preventDefault(); submitPassword(f, err, async () => { me = (await api('GET', '/api/auth/me')).user; toast('Password updated'); render(); }); } } },
    h('label', { class: 'f' }, h('span', { class: 'l' }, 'Current (generic) password'), f.cur), h('label', { class: 'f' }, h('span', { class: 'l' }, 'New password'), f.n1), h('div', { class: 'hint' }, 'At least 10 characters, with a letter and a number.'),
    h('label', { class: 'f' }, h('span', { class: 'l' }, 'Repeat new password'), f.n2), err, h('button', { class: 'btn primary block', type: 'submit' }, 'Save and continue'));
  return h('div', { class: 'login' }, brandHero(`Welcome, ${me.name.split(' ')[0]}. One quick step before you start.`),
    h('div', { class: 'login-panel' }, h('div', { class: 'login-card' }, h('h2', null, 'Choose your password'), h('p', { class: 'lead' }, 'You signed in with the generic password. Set your own so only you can open your account.'), form,
      h('p', { class: 'muted small', style: 'margin-top:14px' }, h('a', { href: '#', on: { click: (e) => { e.preventDefault(); logout(); } } }, 'Sign out')))));
}
function changePasswordModal() {
  const f = passwordFields(); const err = h('div');
  const body = h('div', null, h('label', { class: 'f' }, h('span', { class: 'l' }, 'Current password'), f.cur), h('label', { class: 'f' }, h('span', { class: 'l' }, 'New password'), f.n1), h('div', { class: 'hint' }, 'At least 10 characters, with a letter and a number.'), h('label', { class: 'f' }, h('span', { class: 'l' }, 'Repeat new password'), f.n2), err);
  modal('Change password', body, { actions: (close) => [h('button', { class: 'btn', on: { click: close } }, 'Cancel'), h('button', { class: 'btn primary', on: { click: () => submitPassword(f, err, () => { close(); toast('Password updated'); }) } }, 'Save')] });
}
async function logout() { try { await api('POST', '/api/auth/logout'); } catch { /* already out */ } me = null; sessionStorage.clear(); location.hash = ''; render(); }

// ------------------------------------------------------------ Shell
function shell() {
  const nav = me.role === 'admin' ? [...NAV_ADMIN.slice(0, 10), ...(me.isTrainee ? [['SEP', 'My Academy'], ...NAV_ME] : []), ...NAV_ADMIN.slice(10)] : NAV_TRAINEE;
  const list = h('ul', { class: 'nav' }, nav.map(([k, l, ic]) => k === 'SEP' ? h('li', { class: 'sep' }, l) : h('li', null, h('a', { href: `#${k}`, 'data-r': k }, icon(ic), l))),
    h('li', { class: 'nav-tour' }, h('a', { href: '#', class: 'tour-link', on: { click: (e) => { e.preventDefault(); runTour(); } } }, icon('info'), 'Guided tour')));
  const menu = h('div', { class: 'menu', role: 'menu', hidden: true }, h('button', { role: 'menuitem', on: { click: () => { menu.hidden = true; changePasswordModal(); } } }, 'Change password'), h('button', { class: 'out', role: 'menuitem', on: { click: logout } }, 'Log out'));
  const acct = h('div', { class: 'acct' }, menu, h('button', { class: 'acct-btn', 'aria-haspopup': 'menu', on: { click: (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; } } }, h('span', { class: 'avatar' }, initials(me.name)), h('span', { class: 'acct-meta' }, h('div', { class: 'acct-name' }, me.name), h('div', { class: 'acct-role' }, me.role === 'admin' ? 'Admin' : 'Trainee'))));
  document.addEventListener('click', () => { menu.hidden = true; });
  const testBar = me.actingAs ? h('div', { class: 'test-bar' }, h('span', null, h('b', null, 'Test mode. '), `You are ${me.name}. Nothing you do here counts in the team results.`),
    h('button', { class: 'btn sm', on: { click: async () => { await api('POST', '/api/auth/act-as/stop'); location.hash = 'try'; location.reload(); } } }, `Back to admin (${me.actingAs.adminName})`)) : null;
  // Phones: the menu folds into a drawer behind a button; trainees also get a tab bar at the bottom.
  const toggle = h('button', { class: 'nav-toggle', type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false', on: { click: (e) => { e.stopPropagation(); const open = !document.body.classList.contains('nav-open'); document.body.classList.toggle('nav-open', open); toggle.setAttribute('aria-expanded', String(open)); } } },
    h('span'), h('span'), h('span'));
  const traineeTabs = me.role !== 'admin' ? h('nav', { class: 'tabbar', 'aria-label': 'Main' }, NAV_TRAINEE.map(([k, l, ic]) => h('a', { href: `#${k}`, 'data-r': k }, icon(ic), h('span', null, l.replace(/^My (.)/, (_m, c) => c.toUpperCase()))))) : null;
  return h('div', { class: `shell ${me.actingAs ? 'testing' : ''} ${traineeTabs ? 'has-tabbar' : ''}` }, testBar, h('aside', { class: 'sidebar' }, h('div', { class: 'brand' }, h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO' }), h('span', { class: 'tag' }, 'Academy')), list, acct, toggle), h('main', { class: 'main', id: 'main', tabindex: -1 }), traineeTabs);
}

// ------------------------------------------------------------ Router
const TRAINEE_ROUTES = { programme: null, collection: null, results: resultsView, progress: progressView };
const ADMIN_ROUTES = { try: () => P.tryView(me), board: boardView, overview: A.overviewView, team: A.teamView, priorities: A.prioritiesView, programme: P.programmeOverview, reviews: P.reviewsView, sessions: sessionsView, feedback: P.feedbackView, curriculum: () => P.curriculumView(), imports: A.importView, users: A.usersView, audit: A.auditView, logic: A.logicView };
const isTraineeDyn = (r) => r.startsWith('module-') || r === 'missed' || r === 'survey';
const isAdminDyn = (r) => r.startsWith('session-') || r.startsWith('person-') || r.startsWith('preview') || r.startsWith('pview-') || r.startsWith('curriculum-');

async function route() {
  if (!me || me.mustChange) return;
  const main = document.getElementById('main'); if (!main) return;
  let r = location.hash.replace(/^#/, '') || (me.role === 'admin' ? 'board' : 'programme');
  const isAdmin = me.role === 'admin';
  let meMode = isAdmin && me.isTrainee && r.startsWith('me-');
  if (meMode) r = r.slice(3);
  if (isAdmin && !meMode && isTraineeDyn(r)) { if (me.isTrainee) meMode = true; else r = r.startsWith('module-') ? `curriculum-${r.slice(7).split('~')[0]}` : 'overview'; }
  const okTrainee = (x) => x in TRAINEE_ROUTES || isTraineeDyn(x);
  if (isAdmin && !meMode && r in TRAINEE_ROUTES && !(r in ADMIN_ROUTES)) r = 'overview';
  if (!isAdmin && !okTrainee(r)) r = 'programme';
  if (meMode && !okTrainee(r)) r = 'programme';
  if (isAdmin && !meMode && !(r in ADMIN_ROUTES) && !isAdminDyn(r)) r = 'overview';
  const navKey = meMode ? `me-${r}` : r;
  document.body.classList.remove('nav-open'); document.querySelector('.nav-toggle')?.setAttribute('aria-expanded', 'false');
  document.querySelectorAll('.nav a, .tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.r === navKey || (r.startsWith('person-') && a.dataset.r === 'team') || (r.startsWith('curriculum-') && a.dataset.r === 'curriculum') || (r.startsWith('session-') && a.dataset.r === 'sessions') || (isTraineeDyn(r) && a.dataset.r === (meMode ? 'me-programme' : 'programme'))));
  main.replaceChildren(h('div', { class: 'page muted' }, 'Loading…'));
  try {
    let view;
    if (isAdmin && !meMode) {
      if (r.startsWith('session-')) view = await sessionView(Number(r.slice(8)));
      else if (r.startsWith('person-')) view = await A.personView(Number(r.slice(7)));
      else if (r.startsWith('pview-')) { const [, id, d] = r.split('-'); view = await P.previewProgramme(Number(id), d === 'draft'); }
      else if (r.startsWith('preview')) view = A.previewView(r.split('-')[1]);
      else if (r.startsWith('curriculum-')) view = await P.curriculumView(r.slice(11));
      else view = await ADMIN_ROUTES[r]();
    } else if (r === 'collection') {
      view = await collectionView();
    } else if (r === 'programme' || isTraineeDyn(r)) {
      const prog = await api('GET', '/api/me/programme');
      const items = prog.state?.items || [];
      const rerender = () => route();
      if (r === 'programme') view = programmeView(prog);
      else if (r === 'missed') view = await missedView({ rerender, planItems: items });
      else if (r === 'survey') view = await surveyView();
      else view = await moduleRoute(r.slice(7), { planItems: items, rerender });
    } else {
      const data = await api('GET', '/api/me');
      view = TRAINEE_ROUTES[r](data, { onChange: () => {} });
    }
    main.replaceChildren(view);
    main.scrollTop = 0;
    if ((!isAdmin || meMode) && r !== 'collection') revealNew();
  } catch (e) {
    if (e.status === 401) { me = null; return render(); }
    if (e.code === 'MUST_CHANGE') { me.mustChange = true; return render(); }
    main.replaceChildren(h('div', { class: 'page' }, h('div', { class: 'card empty' }, h('b', null, 'Something went wrong'), e.message)));
  }
}
window.addEventListener('hashchange', route);
// Charts are drawn for the screen size: redraw when crossing the phone breakpoint (rotation, window resize).
window.matchMedia?.('(max-width: 700px)').addEventListener?.('change', () => { if (me && !document.querySelector('.tour-layer')) route(); });
boot();
