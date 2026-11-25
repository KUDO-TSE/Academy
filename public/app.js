import { h, api, toast, modal, icon, initials } from './ui.js';
import { homeView, resultsView, progressView, planView } from './views-trainee.js';
import * as A from './views-admin.js';

const root = document.getElementById('app');
let me = null;

const NAV_TRAINEE = [['home', 'Home', 'home'], ['results', 'My results', 'chart'], ['progress', 'My progress', 'trend'], ['plan', 'My training plan', 'plan']];
const NAV_ME = [['me-home', 'My home', 'user'], ['me-results', 'My results', 'chart'], ['me-progress', 'My progress', 'trend'], ['me-plan', 'My training plan', 'plan']];
const NAV_ADMIN = [['overview', 'Overview', 'home'], ['team', 'Team', 'team'], ['priorities', 'Priorities', 'flag'], ['plans', 'Training plans', 'plan'], ['SEP', 'Admin'], ['imports', 'Imports', 'upload'], ['users', 'Users & access', 'key'], ['audit', 'Activity log', 'log'], ['logic', 'Logic notes', 'info']];

async function boot() {
  try { me = (await api('GET', '/api/auth/me')).user; } catch { me = null; }
  render();
}

function render() {
  root.replaceChildren();
  if (!me) return root.append(loginScreen());
  if (me.mustChange) return root.append(changePasswordScreen(true));
  root.append(shell());
  route();
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
  const nav = me.role === 'admin' ? [...NAV_ADMIN.slice(0, 4), ...(me.isTrainee ? [['SEP', 'My Academy'], ...NAV_ME] : []), ...NAV_ADMIN.slice(4)] : NAV_TRAINEE;
  const list = h('ul', { class: 'nav' }, nav.map(([k, l, ic]) => k === 'SEP' ? h('li', { class: 'sep' }, l) : h('li', null, h('a', { href: `#${k}`, 'data-r': k }, icon(ic), l))));
  const menu = h('div', { class: 'menu', role: 'menu', hidden: true }, h('button', { role: 'menuitem', on: { click: () => { menu.hidden = true; changePasswordModal(); } } }, 'Change password'), h('button', { class: 'out', role: 'menuitem', on: { click: logout } }, 'Log out'));
  const acct = h('div', { class: 'acct' }, menu, h('button', { class: 'acct-btn', 'aria-haspopup': 'menu', on: { click: (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; } } }, h('span', { class: 'avatar' }, initials(me.name)), h('span', { class: 'acct-meta' }, h('div', { class: 'acct-name' }, me.name), h('div', { class: 'acct-role' }, me.role === 'admin' ? 'Admin' : 'Trainee'))));
  document.addEventListener('click', () => { menu.hidden = true; });
  return h('div', { class: 'shell' }, h('aside', { class: 'sidebar' }, h('div', { class: 'brand' }, h('img', { src: '/kudo-logo-navy.png', alt: 'KUDO' }), h('span', { class: 'tag' }, 'Academy')), list, acct), h('main', { class: 'main', id: 'main', tabindex: -1 }));
}

// ------------------------------------------------------------ Router
const TRAINEE_ROUTES = { home: homeView, results: resultsView, progress: progressView, plan: (d) => planView(d) };
const ADMIN_ROUTES = { overview: A.overviewView, team: A.teamView, priorities: A.prioritiesView, plans: A.plansView, imports: A.importView, users: A.usersView, audit: A.auditView, logic: A.logicView };

async function route() {
  if (!me || me.mustChange) return;
  const main = document.getElementById('main'); if (!main) return;
  let r = location.hash.replace(/^#/, '') || (me.role === 'admin' ? 'overview' : 'home');
  const isAdmin = me.role === 'admin';
  const meMode = isAdmin && me.isTrainee && r.startsWith('me-');
  if (meMode) r = r.slice(3);
  const adminOnly = r in ADMIN_ROUTES || r.startsWith('person-') || r.startsWith('preview');
  if (isAdmin && !meMode && r in TRAINEE_ROUTES) r = 'overview';
  if (!isAdmin && (adminOnly || !(r in TRAINEE_ROUTES))) r = 'home';
  if (meMode && !(r in TRAINEE_ROUTES)) r = 'home';
  if (isAdmin && !meMode && !(r in ADMIN_ROUTES) && !r.startsWith('person-') && !r.startsWith('preview')) r = 'overview';
  const navKey = meMode ? `me-${r}` : r;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.r === navKey || (r.startsWith('person-') && a.dataset.r === 'team')));
  main.replaceChildren(h('div', { class: 'page muted' }, 'Loading…'));
  try {
    let view;
    if (isAdmin && !meMode) {
      if (r.startsWith('person-')) view = await A.personView(Number(r.slice(7)));
      else if (r.startsWith('preview')) view = A.previewView(r.split('-')[1]);
      else view = await ADMIN_ROUTES[r]();
    } else {
      const data = await api('GET', '/api/me');
      view = TRAINEE_ROUTES[r](data, { onChange: () => {} });
    }
    main.replaceChildren(view);
    main.scrollTop = 0;
  } catch (e) {
    if (e.status === 401) { me = null; return render(); }
    if (e.code === 'MUST_CHANGE') { me.mustChange = true; return render(); }
    main.replaceChildren(h('div', { class: 'page' }, h('div', { class: 'card empty' }, h('b', null, 'Something went wrong'), e.message)));
  }
}
window.addEventListener('hashchange', route);
boot();
