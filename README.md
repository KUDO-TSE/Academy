# KUDO Academy Tracker

Training tracker for KUDO's client-facing team. Two sides in one app:

- **Admin** (Jack + backup owners): everyone's results, priorities, plans, targets, imports, users, audit log.
- **Trainee**: each person logs in and sees only their own test results, progress over time and 3-month training plan.

Node 22 + Express, PostgreSQL, vanilla JS front end. No data or password is stored in this repository.

## Deploy on Railway

1. Push this folder to GitHub (`KUDO-TSE/Academy`), then create a Railway project from the repo.
2. Add a **PostgreSQL** plugin. Railway sets `DATABASE_URL` for the app.
3. Set these variables on the app service:

| Variable | Value |
|---|---|
| `SESSION_SECRET` | long random string (24+ characters) |
| `INITIAL_PASSWORD` | the generic first-login password (everyone must change it at first login) |
| `ADMIN_EMAILS` | `jack@kudo.ai,nils@kudo.ai,erick@kudo.ai,bayardo@kudo.ai,fardad@kudo.ai` |
| `NODE_ENV` | `production` |

4. Deploy. Tables are created automatically at start-up (`/healthz` for health check).
5. Load the real data once (see below), then everyone can log in.

## Loading real data (private, never commit)

Keep the CSV files outside the repo (templates are in `public/templates/`). From a machine with access to the Railway database:

```
DATABASE_URL=<railway public url> INITIAL_PASSWORD=<generic password> \
ADMIN_EMAILS=<as above> PRIVATE_SEED_DIR=/path/to/private-seed npm run import:private
```

Order handled by the script: roster, profile, self assessment, question bank, live scores, question results, plan.
Further rounds can be loaded from the admin **Imports** screen.

**Round label convention:** `Oct 2026 Self Assessment` and `Oct 2026 Knowledge Test`. Matching month and year pairs them into one checkpoint on the progress chart.

## Local run

```
cp .env.example .env   # fill values
npm install
npm run seed:demo      # fake demo data only
npm start
npm test               # needs a throwaway Postgres in DATABASE_URL
```

## Security notes

bcrypt passwords, server-side role checks on every route (trainee API is scoped to the logged-in user), forced password change at first login, lockout after 5 failures, login rate limit, CSRF header + origin check, secure cookies in production, audit log of admin actions.

## Assumptions to review

- Emails are `firstname@kudo.ai`; correct them in the roster file if different.
- Priority weighting follows Priority Weighting System v1; HI/AI themes and risk inputs (Admin > Priorities) are editable.
- Free-text "dreaded question" answers are visible to admins only.

## Programme (v2): personal plans built automatically

Each trainee gets a 12-week, self-paced programme in four phases (Warm-up, Build, Broaden, Prove it), built by `server/engine.js` from:

- the latest Self Assessment and knowledge test (per scenario, blended; overall-only results are scaled; self-only results are corrected by how the team scored),
- the questions they missed, their profile (client demand, stated struggle, learning preference),
- the team priorities (Priority Weighting System v1),
- the Academy team's inputs: 1:1 sessions, call or video reviews and observations, each with Gap / Developing / Solid ratings per scenario.

Targets depend on depth: Set up scenarios 80%, Hand over scenarios 70% (Jack can change the base target on the Programme page).
The three scenarios with the highest personal priority become the focus. Every module has a lesson, practice, a graded check (pass 80%) and hand-over rules (`server/curriculum.js`, 17 modules, sourced from the CM Onboarding Guide V3, the explainer videos and the Help Center).

Approval: a new plan, or a change to its structure, is saved as a draft. The trainee only sees approved plans. Admins approve on **Programme** (one by one or all at once).
Trainees' own checks move their levels and progress live but never reshuffle the plan; assessments, the baseline check and admin inputs can.

There is no plan import any more: plans come from the inputs.

### Demo trainee
Set `DEMO_TRAINEE_EMAIL` (for example `demo.trainee@kudo.ai`) and restart: a trainee with fictional results and an approved, partly completed plan is created once. It signs in with the generic initial password and must change it. It is excluded from team figures and priorities.
