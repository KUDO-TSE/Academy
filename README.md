# KUDO Academy Tracker

Training tracker for KUDO's client-facing team. Two sides in one app:

- **Admin** (the KUDO Trainer + backup owners): everyone's results, priorities, plans, targets, imports, users, audit log.
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
| `ADMIN_EMAILS` | `jack@kudo.ai,nils@kudo.ai,erick@kudo.ai,fardad@kudo.ai` |
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

Targets depend on depth: Set up scenarios 80%, Hand over scenarios 70% (the KUDO Trainer can change the base target on the Programme page).
The three scenarios with the highest personal priority become the focus. Every module has a lesson, practice, a graded check (pass 80%) and hand-over rules (`server/curriculum.js`, 17 modules, sourced from the CM Onboarding Guide V3, the explainer videos and the Help Center).

Approval: a new plan, or a change to its structure, is saved as a draft. The trainee only sees approved plans. Admins approve on **Programme** (one by one or all at once).
Trainees' own tests move their levels live but never reshuffle the plan; assessments, the baseline check and the KUDO Trainer's inputs can.

**What moves a level (shown live on My results):** only test results. The first attempt at each module check (weight 0.6 towards the score, certainty-adjusted), decision walkthrough (0.4) and explain-it recording (0.5; accuracy, completeness and hand-over, 1 to 3 each, as 0-100; the KUDO Trainer's review replaces the automatic score at the same point in the history), the baseline check, and each quarterly knowledge test (which resets the starting point). Lessons, practice and its sign-off, retakes, the weekly challenge, spaced reviews and the KUDO Trainer's 1:1 ratings do not move the level shown to the trainee; the 1:1 ratings still shape the plan. My results shows the overall readiness against October, a chart of each scenario's change since October, every test that counted with its effect, and a module-by-module table (test of record, walkthrough, effect, practice retakes). `GET /api/me/progress-live`.

There is no plan import any more: plans come from the inputs.

### Demo trainee
Set `DEMO_TRAINEE_EMAIL` (for example `demo.trainee@kudo.ai`) and restart: a trainee with fictional results and an approved, partly completed plan is created once. It signs in with the generic initial password and must change it. It is excluded from team figures and priorities.

## Assessment (v3)

Checks are no longer a fixed multiple-choice list. Each module has a pool of mixed items and every attempt draws a new set of six with at least one of each format:

- **Single answer with certainty** (certainty-based marking): right at low/mid/high certainty scores 1/2/3, wrong scores 0/-2/-6. A lucky low-certainty answer counts half towards the level. "Certain but wrong" answers are flagged as likely misconceptions.
- **Pick all that fit**: the number of answers is shown ("Pick 3"), every wrong pick cancels a right one, and items have several wrong options, so ticking everything scores about 25%.
- **Match**: credit per correct pair. **Order**: credit for each step directly followed by the right next step, so a random order scores close to nothing and one misplaced step keeps the rest of the sequence.
- **No answer pattern**: options and walkthrough choices are shuffled every time they are shown. The order is sealed in an encrypted token (AES-GCM, keyed from `SESSION_SECRET`) that the browser sends back, so neither the screen nor the network traffic shows where the answer sits. Option lengths were evened out so the longest option is no longer a hint.
- **Question bank**: 104 extra single-answer questions in `server/curriculum-bank.js`, written from the lessons only, each tagged with the objective it tests and its level (recall, apply, decide). 49 of them are parallel forms marked `reserve`: they are not drawn until a second knowledge test round exists, so the 3-month reassessment does not repeat what trainees have practised. Every module now has 10 to 15 questions. The Curriculum page shows objective coverage and marks the new questions "New: to check" until the KUDO Trainer has reviewed them.
- **Levels are shown as a range** (±10 points), and within one assessment cycle the plan's focus only changes when a level moves by 15 points or more (`STABLE_POINTS` in `server/engine.js`).

Other formats in the plan:
- **Decision walkthroughs** (`WALKTHROUGHS` in `server/curriculum-extra.js`): a realistic client situation, three or four decisions, feedback after each. Graded on the server.
- **Explain it**: the trainee records up to 3 minutes of audio in the browser (or writes it), then ticks the key points they covered. The KUDO Trainer scores four criteria from 1 to 3 on the **Reviews** page; the average becomes a Gap / Developing / Solid input on their level.
- **Weekly challenge**: four mixed questions from modules already started. Progress shows as "weeks active: 7 of 9", which never resets (a broken streak is a common reason self-paced trainees quit). It does not change levels.
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

Facts are never marked wrong automatically (embeddings cannot see negation). The KUDO Trainer spot-checks: flagged answers, every Gap, every "Ask your KUDO Trainer to listen", and a random share (`SPOTCHECK_SAMPLE`, default 0.2). His scores replace the automatic ones.
Recordings are kept 60 days, then deleted; transcripts and scores stay.

Deployment notes: set `ONNXRUNTIME_NODE_INSTALL_CUDA=skip` on the service (the GPU binaries are not needed). Models (about 120 MB) download from Hugging Face on first start into `MODEL_CACHE_DIR` (default `/tmp/academy-models`); the service needs about 1 GB of memory. Set `AUTO_REVIEW=off` to send every recording to the KUDO Trainer instead.

## Test trainees

Fictional trainees for the admin team to try the trainee side. Set `DEMO_TRAINEE_EMAILS` (comma-separated; `demo.jack@kudo.ai` becomes "Test Trainee (the KUDO Trainer)"), or create one under **Users & access › Test trainees**.
Each starts with fictional October results and an approved plan two weeks in. They sign in with the generic password and must change it, so use one per tester.
"Reset to start" deletes everything a test trainee did and recreates it with the generic password.
Test trainees are excluded from team results, priorities, the team list, module feedback, item analysis and the board's schedule.

## Practice reviewed automatically

Every module has one practice task the system reviews on its own (`PRACTICE` in `server/curriculum-extra.js`): written (an email, a runsheet, a briefing),
spoken (a recording), or a step-by-step account of what the trainee did in a test account. The same reviewer as explain-it checks the key points,
clarity and hand-over. A result that is not a Gap signs the practice off automatically; a Gap asks the trainee to try again.
Trainees can no longer tick practice by hand. The KUDO Trainer only spot-checks (flagged, gaps, requests, random share) on the Reviews page and board.

## Results of record

The first attempt in the current assessment cycle is the score of record, for module checks, spaced reviews, the baseline check, decision walkthroughs, explain-it recordings and practice tasks.
Retakes and new submissions are practice: they get full feedback but never change levels, plans, reports, item statistics or sign-offs, and they are not sent to the KUDO Trainer unless the trainee asks.
A cycle starts with each knowledge test round (`rounds.kind = 'live'`): importing the 3-month retest starts a new cycle, levels restart from the new results and the first attempt in the new cycle becomes the new record.

## Learning design (v4)

- **This week first**: the programme page opens on the steps due this week (with the time they take). Only the current phase is open; growth since the start shows on each level, and scenarios that reached their target are called out.
- **Spaced review**: questions a trainee missed or guessed on come back after 1 week and again after 3 weeks (`/api/me/review`). Practice only.
- **Trainee choice**: the trainee can swap the third focus area for one of the next two in priority. It becomes a draft that the KUDO Trainer approves. The KUDO Trainer's own focus override always wins.
- **Teach-back pairs**: in weeks 8 to 10, the board suggests pairing trainees who share a focus scenario, with a message to copy. The KUDO Trainer makes the introduction, so no trainee sees another's results.
- **Warm-up**: before a first recorded check, three neutral questions show the formats. Marked in the browser, never stored.
- **Worked example and common mistakes** per module (`CASES` in `server/curriculum-bank.js`). The examples are illustrative, built from the lesson facts; replace them with real cases when available.
- **Videos in the page**: on the Curriculum page, paste each module's video link. A SharePoint embed link (Share, Embed, the link inside src) plays in the page; any other https link opens in a new tab. The CSP allows frames from *.sharepoint.com and youtube-nocookie.com only.
- **Objectives** use observable verbs (no "Know ...").


## Guided tour

`public/tour.js`. Two scripts: trainees (12 steps: the programme page, a module, results) and admins (11 steps: one per menu area). It opens automatically the first time someone signs in (after the password change), with Skip at every step; Done or Skip both record `users.tour_seen_at`. "Guided tour" at the bottom of the menu replays it at any time. Admins acting as a test trainee see the trainee tour. Keyboard: arrows to move, Esc to close. A step whose element is missing shows as a centred card, so the tour never gets stuck.

## Sessions: the Academy learns from 1:1 and group sessions

Admin menu, **Sessions** (`server/sessions.js`, `public/views-sessions.js`).

- **Upload** a Teams transcript (.vtt, .docx; best: instant, knows who spoke) or a recording (.mp4, .m4a, .mp3, .wav, .webm, .mov, up to `SESSION_MAX_MB`, default 500). Files are streamed to disk; recordings are transcribed with the same free Whisper model, in 10-minute windows (about a third of real time on the current server), then deleted. The transcript is kept until the session is deleted.
- **Analysis**: questions (with who asked and the answer that followed), mapped to a module with sentence embeddings plus module names, and compared with what the Academy already teaches and asks (lessons, objectives, check questions, published FAQ): covered, partly covered or not covered. Questions that came up in earlier sessions are marked. For a 1:1, level signals are suggested from what the trainee said, and can be added to their inputs in one click.
- **Improve the content**: on each question, the KUDO Trainer can publish a lesson FAQ entry ("Asked in sessions", no names) or a new check question (four options, his wording). New questions join the module checks immediately (`registerItem`) and are marked "From a session" on the Curriculum page. Both can be withdrawn. The board shows a task per session with questions to review.
- No language model writes content: the Academy finds and sorts; the KUDO Trainer decides and words it.

## Release notes: the Academy keeps up with the product

Imports has three tabs: Results & rosters (CSV), Sessions and Release notes. An admin pastes a KUDO release note (or uploads .txt, .md or .docx). The Academy:

1. splits it into items (new feature, fix, known issue) under the note's own headings;
2. maps each item to the modules it concerns: product names in the title first (Teams, Glossary, segmenter...), then closeness in meaning to what each module teaches;
3. flags lesson lines, objectives and check questions the change may have made wrong. "Likely out of date" when the note says "now X instead of Y" and the line still says Y (a rewrite is drafted), or uses the same figure; "Worth a check" when the line is close to the change or names the changed feature;
4. drafts the changes: a What's new entry (on by default), a lesson FAQ entry for new features, rewritten lines and questions to retire (both off by default: the admin ticks what is right).

The admin edits and applies. Trainees then see a "New in KUDO" card on their programme (changes in their focus areas first), a "Recent product changes" box at the top of each lesson concerned, and rewritten lines marked Updated. Retired questions leave the check pool. "Undo all changes" restores everything a release changed. There is no AI text generation (no API key): rewrites are drafted only where the note states what replaced what; everything else is the admin's wording.

## Collectibles

`server/collectibles.js`, `public/collectibles.js`. 29 cards in four sets: Journey (plan approved, each phase cleared, mock call, retest), Scenarios (one per scenario, earned at target level), Craft (first step, perfect walkthrough, Solid explanation, well-judged certainty, spaced-review comeback, teach-back, a session question added to the Academy) and Habit (3, 6, 10 active weeks, not necessarily in a row). Worked out from existing data each time the trainee opens the app, stored with the date earned, never taken back, never shown to anyone else, and they never change a score. New cards are revealed once with a card flip (no animation when the device asks for reduced motion). "My collection" in the trainee menu; a strip on the programme page. Card art is original, drawn in code: generic symbols, no product logos.

The coaching role is called "your KUDO Trainer" everywhere trainees read it (plan items, lessons, reviews, tour), so the role can change hands without editing the content. Stored plans are rewritten once at start-up.

## Phones and laptops

The app adapts below 860 px wide: the menu becomes a top bar with a menu button (drawer), trainees get a tab bar at the bottom (Programme, Collection, Results, Progress), grids stack, tables scroll sideways, and charts are redrawn for the screen (the 12-week route turns vertical, one stop per week, and the selected week opens in place; other charts get a narrower drawing so text stays readable). Charts redraw when the screen crosses the phone breakpoint. The guided tour docks its card at the top or bottom on phones and opens the menu drawer for menu steps. Checked at 390 px (iPhone size) and 1400 px.
