import bcrypt from 'bcryptjs';
import { q, audit } from './db.js';

const ROUNDS = 12;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', ROUNDS);
export const hash = (pw) => bcrypt.hash(pw, ROUNDS);
export const verify = (pw, h) => bcrypt.compare(pw, h);

export function initialPassword() {
  const pw = process.env.INITIAL_PASSWORD;
  if (!pw) throw new Error('INITIAL_PASSWORD is not set');
  return pw;
}

// Password policy for the password a user chooses.
export function checkNewPassword(pw, user) {
  if (typeof pw !== 'string' || pw.length < 10) return 'Use at least 10 characters.';
  if (pw.length > 200) return 'That password is too long.';
  if (!/[A-Za-z]/.test(pw) || !/[0-9]/.test(pw)) return 'Use at least one letter and one number.';
  const local = String(user?.email || '').split('@')[0].toLowerCase();
  if (local.length >= 3 && pw.toLowerCase().includes(local)) return 'Do not include your email name in your password.';
  if (process.env.INITIAL_PASSWORD && pw === process.env.INITIAL_PASSWORD) return 'Choose a password that is different from the generic one.';
  return null;
}

// Create the admin accounts listed in ADMIN_EMAILS if they do not exist yet. Never touches existing accounts.
export async function ensureAdmins() {
  const emails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return;
  let pw;
  try { pw = initialPassword(); } catch { console.warn('INITIAL_PASSWORD not set: admin accounts were not created.'); return; }
  const h = await hash(pw);
  for (const email of emails) {
    const name = email.split('@')[0].replace(/^./, (c) => c.toUpperCase());
    const r = await q(
      `INSERT INTO users (email, name, role, team, weight, password_hash, must_change_password)
       VALUES ($1,$2,'admin','Admin',0,$3,TRUE) ON CONFLICT (lower(email)) DO NOTHING RETURNING id`,
      [email, name, h]);
    if (r.rowCount) console.log('Created admin account', email);
    else {
      // Already exists (for example loaded from the roster as a trainee): make them an admin who also keeps their own trainee data.
      const p = await q(`UPDATE users SET role='admin', is_trainee=TRUE WHERE lower(email)=$1 AND role='trainee' RETURNING id`, [email]);
      if (p.rowCount) console.log('Promoted to admin (keeps own trainee data)', email);
    }
  }
}

export async function loadUser(req, _res, next) {
  req.user = null;
  const id = req.session?.userId;
  if (!id) return next();
  try {
    const r = await q('SELECT id,email,name,role,region,team,is_trainee,must_change_password,active FROM users WHERE id=$1', [id]);
    const u = r.rows[0];
    if (u && u.active) req.user = u; else req.session.userId = null;
  } catch (e) { return next(e); }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (req.user.must_change_password) return res.status(403).json({ error: 'Please set a new password first.', code: 'MUST_CHANGE' });
  next();
}
export function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
  if (req.user.must_change_password) return res.status(403).json({ error: 'Please set a new password first.', code: 'MUST_CHANGE' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access only.' });
  next();
}

// CSRF defence for a same-origin JSON app: state-changing requests must carry a custom header and a matching Origin.
export function csrfGuard(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (req.get('x-requested-with') !== 'academy') return res.status(403).json({ error: 'Blocked request.' });
  const origin = req.get('origin');
  if (origin) {
    try { if (new URL(origin).host !== req.get('host')) return res.status(403).json({ error: 'Blocked request.' }); }
    catch { return res.status(403).json({ error: 'Blocked request.' }); }
  }
  next();
}

const MAX_FAILS = 5;
const LOCK_MIN = 15;
export async function login(req, email, password) {
  const r = await q('SELECT * FROM users WHERE lower(email)=lower($1)', [String(email || '').trim()]);
  const u = r.rows[0];
  // Same work and same message whether or not the account exists.
  if (!u || !u.active) { await verify(String(password || ''), DUMMY_HASH).catch(() => {}); return { ok: false }; }
  if (u.locked_until && new Date(u.locked_until) > new Date()) return { ok: false, locked: true };
  const ok = await verify(String(password || ''), u.password_hash);
  if (!ok) {
    const fails = u.failed_logins + 1;
    if (fails >= MAX_FAILS) {
      await q('UPDATE users SET failed_logins=0, locked_until=now()+($2||\' minutes\')::interval WHERE id=$1', [u.id, String(LOCK_MIN)]);
    } else {
      await q('UPDATE users SET failed_logins=$2 WHERE id=$1', [u.id, fails]);
    }
    return { ok: false };
  }
  await q('UPDATE users SET failed_logins=0, locked_until=NULL, last_login_at=now() WHERE id=$1', [u.id]);
  return { ok: true, user: u };
}
export { audit };
