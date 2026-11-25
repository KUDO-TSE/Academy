import express from 'express';
import helmet from 'helmet';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, q, migrate, audit } from './db.js';
import { ensureAdmins, loadUser, requireAuth, requireAdmin, csrfGuard, login, hash, verify, checkNewPassword } from './auth.js';
import { meRouter } from './routes-me.js';
import { adminRouter } from './routes-admin.js';
import { meProgramme, adminProgramme } from './programme.js';
import { ensureDemo } from './demo.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const prod = process.env.NODE_ENV === 'production';

export async function createApp() {
  if (prod && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 24)) throw new Error('SESSION_SECRET must be set (24+ characters) in production.');
  await migrate();
  await ensureAdmins();
  await ensureDemo();

  const app = express();
  app.set('trust proxy', 1); // Railway terminates TLS in front of the app
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com', "'unsafe-inline'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    hsts: prod,
  }));
  app.use(express.json({ limit: '2.5mb' }));

  const PgStore = connectPgSimple(session);
  app.use(session({
    store: new PgStore({ pool, createTableIfMissing: true, tableName: 'user_sessions' }),
    name: 'academy.sid',
    secret: process.env.SESSION_SECRET || 'dev-only-secret-not-for-production',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: { httpOnly: true, sameSite: 'lax', secure: prod, maxAge: 1000 * 60 * 60 * 8 },
  }));
  app.use(loadUser);
  app.use('/api', csrfGuard);

  app.get('/healthz', async (_req, res) => { try { await q('SELECT 1'); res.json({ ok: true }); } catch { res.status(503).json({ ok: false }); } });

  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });

  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, region: u.region, team: u.team, isTrainee: u.role === 'trainee' || !!u.is_trainee, mustChange: !!u.must_change_password });

  app.post('/api/auth/login', loginLimiter, async (req, res, next) => {
    try {
      const r = await login(req, req.body?.email, req.body?.password);
      if (!r.ok) {
        await audit({ user: null }, 'login.fail', String(req.body?.email || '').slice(0, 120));
        return res.status(401).json({ error: r.locked ? 'This account is temporarily locked. Try again in 15 minutes.' : 'Email or password is not right.' });
      }
      req.session.regenerate((err) => {
        if (err) return next(err);
        req.session.userId = r.user.id;
        req.session.save(async (err2) => {
          if (err2) return next(err2);
          await audit({ user: r.user }, 'login', r.user.email);
          res.json({ user: publicUser(r.user) });
        });
      });
    } catch (e) { next(e); }
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => { res.clearCookie('academy.sid'); res.json({ ok: true }); });
  });

  app.get('/api/auth/me', (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
    res.json({ user: publicUser(req.user) });
  });

  app.post('/api/auth/change-password', async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
      const { current, next: np } = req.body || {};
      const r = await q('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
      if (!(await verify(String(current || ''), r.rows[0].password_hash))) return res.status(400).json({ error: 'Your current password is not right.' });
      const problem = checkNewPassword(np, req.user);
      if (problem) return res.status(400).json({ error: problem });
      if (await verify(String(np), r.rows[0].password_hash)) return res.status(400).json({ error: 'Choose a password that is different from the current one.' });
      await q('UPDATE users SET password_hash=$2, must_change_password=FALSE WHERE id=$1', [req.user.id, await hash(np)]);
      await audit(req, 'password.change', req.user.email);
      // Sign out other sessions of this user, keep this one.
      await q(`DELETE FROM user_sessions WHERE (sess->>'userId')::int = $1 AND sid <> $2`, [req.user.id, req.sessionID]).catch(() => {});
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  app.use('/api/me', requireAuth, meRouter);
  app.use('/api/me', requireAuth, meProgramme);
  app.use('/api/admin', requireAdmin, adminRouter);
  app.use('/api/admin', requireAdmin, adminProgramme);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  app.use(express.static(path.join(here, '..', 'public'), { index: 'index.html', maxAge: prod ? '1h' : 0 }));
  app.get('*', (_req, res) => res.sendFile(path.join(here, '..', 'public', 'index.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  });
  return app;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 3000;
  createApp().then((app) => app.listen(port, () => console.log(`KUDO Academy listening on ${port}`))).catch((e) => { console.error(e); process.exit(1); });
}
