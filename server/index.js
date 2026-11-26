import { coachRouter, groupAdminRouter } from './coach.js';
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
import { boardRouter } from './board.js';
import { warmUp, resumePending } from './autoreview.js';
import { sessionsRouter, loadFieldItems, failInterrupted } from './sessions.js';
import { collectiblesRouter } from './collectibles.js';
import { releasesRouter, whatsNewRouter, loadContentEdits } from './releases.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const prod = process.env.NODE_ENV === 'production';

export async function createApp() {
  if (prod && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 24)) throw new Error('SESSION_SECRET must be set (24+ characters) in production.');
  await migrate();
  await ensureAdmins();
  await ensureDemo();
  await loadFieldItems(); await failInterrupted(); await loadContentEdits();
  if (process.env.AUTO_REVIEW !== 'off') { warmUp(); resumePending().catch((e) => console.error(e)); }

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
        mediaSrc: ["'self'", 'blob:'],
        frameSrc: ['https://kudolive.sharepoint.com', 'https://*.sharepoint.com', 'https://www.youtube-nocookie.com'],
        scriptSrc: ["'self'"],
        connectSrc: ["'self'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
      },
    },
    hsts: prod,
  }));
  // Explain-it recordings arrive as base64 audio; everything else stays small.
  const bigJson = express.json({ limit: '9mb' }), smallJson = express.json({ limit: '2.5mb' });
  app.use((req, res, next) => (req.path.startsWith('/api/me/explain/') ? bigJson : smallJson)(req, res, next));

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

  const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: Number(process.env.LOGIN_RATE_LIMIT) || 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Try again in a few minutes.' } });

  const publicUser = (u, admin = null) => ({ id: u.id, name: u.name, email: u.email, role: u.role, region: u.region, team: u.team, isTrainee: u.role === 'trainee' || !!u.is_trainee, mustChange: !!u.must_change_password, tourSeen: !!u.tour_seen_at, actingAs: admin ? { adminName: admin.name } : null });

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
    res.json({ user: publicUser(req.user, req.realAdmin) });
  });

  // Guided tour: shown once automatically (on first sign-in), then available from the menu. Done or skipped both count.
  app.post('/api/auth/tour-seen', async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Not signed in.' });
      await q('UPDATE users SET tour_seen_at=COALESCE(tour_seen_at, now()) WHERE id=$1', [req.user.id]);
      res.json({ ok: true });
    } catch (e) { next(e); }
  });

  // Admins step into a test trainee to take the courses, then come back.
  app.post('/api/auth/act-as', async (req, res, next) => {
    try {
      if (!req.user || req.realAdmin || req.user.role !== 'admin' || req.user.must_change_password) return res.status(403).json({ error: 'Admin access only.' });
      const id = Number(req.body?.id);
      const d = await q('SELECT id,name FROM users WHERE id=$1 AND is_demo AND active', [id]);
      if (!d.rowCount) return res.status(404).json({ error: 'Not a test trainee.' });
      req.session.actAs = id;
      await audit(req, 'act_as.start', d.rows[0].name);
      req.session.save((err) => (err ? next(err) : res.json({ ok: true })));
    } catch (e) { next(e); }
  });
  app.post('/api/auth/act-as/stop', (req, res, next) => {
    if (!req.session?.actAs) return res.json({ ok: true });
    const name = req.user?.name; req.session.actAs = null;
    audit({ user: req.realAdmin }, 'act_as.stop', name);
    req.session.save((err) => (err ? next(err) : res.json({ ok: true })));
  });

  app.post('/api/auth/change-password', async (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ error: 'Please sign in.' });
      if (req.realAdmin) return res.status(400).json({ error: 'Go back to your admin account to change your password.' });
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
  app.use('/api/me', requireAuth, collectiblesRouter);
  app.use('/api/me', requireAuth, whatsNewRouter);
  app.use('/api/me', requireAuth, coachRouter);
  app.use('/api/admin', requireAdmin, adminRouter);
  app.use('/api/admin', requireAdmin, adminProgramme);
  app.use('/api/admin', requireAdmin, boardRouter);
  app.use('/api/admin', requireAdmin, sessionsRouter);
  app.use('/api/admin', requireAdmin, releasesRouter);
  app.use('/api/admin', requireAdmin, groupAdminRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // Browsers revalidate the app files on every visit (cheap 304s via ETag), so a new version shows up straight away.
  app.use(express.static(path.join(here, '..', 'public'), { index: 'index.html', etag: true, lastModified: true, setHeaders: (res, file) => { res.setHeader('Cache-Control', /\.(png|svg|ico)$/.test(file) ? 'public, max-age=86400' : 'no-cache'); } }));
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
  createApp().then((app) => { const srv = app.listen(port, () => console.log(`KUDO Academy listening on ${port}`)); srv.requestTimeout = 30 * 60 * 1000; /* large session recordings */ }).catch((e) => { console.error(e); process.exit(1); });
}
