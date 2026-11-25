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

## Assessment (v3)

Checks are no longer a fixed multiple-choice list. Each module has a pool of mixed items and every attempt draws a new set of six with at least one of each format:

- **Single answer with certainty** (certainty-based marking): right at low/mid/high certainty scores 1/2/3, wrong scores 0/-2/-6. A lucky low-certainty answer counts half towards the level. "Certain but wrong" answers are flagged as likely misconceptions.
- **Pick all that fit**: every wrong pick cancels a right one, so ticking everything does not pay.
- **Match** and **Order**: credit per correct pair or position.

Other formats in the plan:
- **Decision walkthroughs** (`WALKTHROUGHS` in `server/curriculum-extra.js`): a realistic client situation, three or four decisions, feedback after each. Graded on the server.
- **Explain it**: the trainee records up to 3 minutes of audio in the browser (or writes it), then ticks the key points they covered. Jack scores four criteria from 1 to 3 on the **Reviews** page; the average becomes a Gap / Developing / Solid input on their level.
- **Weekly challenge**: four mixed questions from modules already started, with a weekly streak. It does not change levels.
- **Feedback**: three ratings and a comment after each module check, and a ten-question end-of-programme survey (adapted from Coursecheck's templates, including NPS). Results and the most-missed questions are on the **Feedback** page.

## Action board (admins)

**My board** is the admin landing page. It lists everything waiting on the Academy owner, derived from live data so that doing the action clears the task:
approvals, sessions due (dated from each plan's start: overdue, this week, next week), explain-it recordings to review, focus practice to sign off,
trainees to nudge (after their first week, when behind pace or inactive for 10 days, with a ready-to-paste message), and content to fix (low module ratings, questions most people miss).
When four or more kick-offs or mid-point check-ins fall due together, they become one group session; "Mark held" logs it for everyone who attended.
The suggested week fills the owner's available days and hours (set on the board), sessions first, and lists what does not fit.
"Add this week's sessions to my calendar" downloads an .ics file. Tasks can be snoozed for a week or marked done.

## Automatic review of explain-it recordings (free, no API key)

`server/autoreview.js` runs two open-source models inside the app with transformers.js:
Whisper (`onnx-community/whisper-base`, override with `WHISPER_MODEL`) transcribes the recording (decoded with the bundled ffmpeg-static),
and `all-MiniLM-L6-v2` checks which key points the explanation covers, confirmed by keyword cues per point.
Pace, filler words and whether the trainee says who they would involve give the clarity and hand-over scores.
The trainee gets scores, covered and missed points, where each missed point is in the lesson, and the transcript, usually within a minute.

Facts are never marked wrong automatically (embeddings cannot see negation). Jack spot-checks: flagged answers, every Gap, every "Ask Jack to listen", and a random share (`SPOTCHECK_SAMPLE`, default 0.2). His scores replace the automatic ones.
Recordings are kept 60 days, then deleted; transcripts and scores stay.

Deployment notes: set `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` on the service (the GPU binaries are not needed). Models (about 120 MB) download from Hugging Face on first start into `MODEL_CACHE_DIR` (default `/tmp/academy-models`); the service needs about 1 GB of memory. Set `AUTO_REVIEW=off` to send every recording to Jack instead.

## Test trainees

Fictional trainees for the admin team to try the trainee side. Set `DEMO_TRAINEE_EMAILS` (comma-separated; `demo.jack@kudo.ai` becomes "Test Trainee (Jack)"), or create one under **Users & access › Test trainees**.
Each starts with fictional October results and an approved plan two weeks in. They sign in with the generic password and must change it, so use one per tester.
"Reset to start" deletes everything a test trainee did and recreates it with the generic password.
Test trainees are excluded from team results, priorities, the team list, module feedback, item analysis and the board's schedule.

## Practice reviewed automatically

Every module has one practice task the system reviews on its own (`PRACTICE` in `server/curriculum-extra.js`): written (an email, a runsheet, a briefing),
spoken (a recording), or a step-by-step account of what the trainee did in a test account. The same reviewer as explain-it checks the key points,
clarity and hand-over. A result that is not a Gap signs the practice off automatically; a Gap asks the trainee to try again.
Trainees can no longer tick practice by hand. Jack only spot-checks (flagged, gaps, requests, random share) on the Reviews page and board.

## Results of record

The first attempt in the current assessment cycle is the score of record, for module checks, spaced reviews, the baseline check, decision walkthroughs, explain-it recordings and practice tasks.
Retakes and new submissions are practice: they get full feedback but never change levels, plans, reports, item statistics or sign-offs, and they are not sent to Jack unless the trainee asks.
A cycle starts with each knowledge test round (`rounds.kind = 'live'`): importing the 3-month retest starts a new cycle, levels restart from the new results and the first attempt in the new cycle becomes the new record.
