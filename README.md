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
| `ADMIN_EMAILS` | `jack@kudo.ai,nils@kudo.ai,erick@kudo.ai` |
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
- Priority weighting follows Priority Weighting System v1; HI/AI themes and risk inputs (Admin > Priorities, behind Edit) are editable. Each scenario shows one bar whose segments are the weighted components; Show breakdown lists them.
- Self Assessment and test imports may omit the `overall` row: it is then derived (mean of the scenario ratings; summed correct/total for tests) so counts, averages and estimates match the bars.
- Free-text "dreaded question" answers are visible to admins only.

## Programme (v2): personal plans built automatically

Each trainee gets a 12-week, self-paced programme in three months of four weeks, built by `server/engine.js` from:

- the latest Self Assessment and knowledge test (per scenario, blended; overall-only results are scaled; self-only results are corrected by how the team scored),
- the questions they missed, their profile (client demand, stated struggle, learning preference),
- the team priorities (Priority Weighting System v1),
- the Academy team's inputs: 1:1 sessions, call or video reviews and observations, each with Gap / Developing / Solid ratings per scenario.

Targets depend on depth: Set up scenarios 80%, Hand over scenarios 70% (the KUDO Trainer can change the base target on the Programme page).
The three scenarios with the highest personal priority become the focus. Every module has a lesson, practice, a graded check (pass 80%) and hand-over rules (`server/curriculum.js`, 17 modules, sourced from the CM Onboarding Guide V3, the explainer videos and the Help Center).

**How the weeks are filled (Nov 2026).** Three months of four weeks (`PHASES` in `engine.js`). Every course is all-in-one: its learn, practise, decide, explain and check steps sit in the same week. Courses come in teaching order (the essentials: baseline, foundations, platform, the October questions; then the priority courses: each focus scenario with its coaching session, and the glossary when AI matters; then every other scenario and the cross-cutting topics, by personal priority) and weeks 1 to 11 are balanced so the heaviest week is as light as possible. Fixed points: kick-off in week 1, mid-point check-in in week 6, a spaced review three weeks after each focus course, the mock client call in week 11, and week 12 for the final reviews, the quick checks that confirm scenarios already at target, the survey and the retest. On Home, My Quarter's Program shows the three months (`monthsCard`, each with its own light colour and a short recap from `monthRecap`); a click opens My courses on that month (`monthPlan`), week by week, with one Take the course button per course. Every step on the trainee side opens with the same button, Take the course.

Approval: a new plan, or a change to its structure, is saved as a draft. The trainee only sees approved plans. Admins approve on **Programme** (one by one or all at once).
Trainees' own tests move their levels live but never reshuffle the plan; assessments, the baseline check and the KUDO Trainer's inputs can.

**What moves a level (shown live on My progress):** only test results. The first attempt at each module check (weight 0.6 towards the score, certainty-adjusted), decision walkthrough (0.4) and explain-it recording (0.5; accuracy, completeness and hand-over, 1 to 3 each, as 0-100; the KUDO Trainer's review replaces the automatic score at the same point in the history), the baseline check, and each quarterly knowledge test (which resets the starting point). Lessons, practice and its sign-off, retakes, the weekly challenge, spaced reviews and the KUDO Trainer's 1:1 ratings do not move the level shown to the trainee; the 1:1 ratings still shape the plan. My results shows the scores (28 Nov): one card, My results per course, opening with the average score as a large ring (the course tests of completed courses) with courses taken and passed, then the completed courses only, grouped by month in the month colours (one tile per course: the course test of record as a ring, then each step of the course as a pill with its score or Done, and a Go to course button, Continue the course in amber once the course is started, that opens My courses on that course's month and highlights its row through `sessionStorage['academy.course']`; a course outside the plan opens its course page), the sandbox exercises (numbered 1 to 11 in teaching order, the same numbers as in each exercise's header), My attempts (hidden until there is one), then, as the last section of the same card, My Starting Point: Self-assessment and Test Results, one tile per scenario in the same design (the test score as a ring, the Self Assessment as a bar, the reading chip), then Questions to review. My progress shows how the level moves: My Readiness against October, each scenario's change since October, one scenario over time (once a test has moved a level), then one "What moved my level" card: every test that moved a level with its effect (or a "Go to My courses" step until the first one), followed by what moves a level and what does not (folded away once there is a history), then the quarterly checkpoints; My targets shows only once the KUDO Trainer has set some. The course page shows its month and week (`.mchip.m1`-`.m3`, the month colours of Home) above the title; its "Why it is in your plan" line skips the step instructions already in the step cards. Both read `GET /api/me/progress-live`.

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

- **Home and My courses**: Home is the overview (goal and progress, three figures, the 12 weeks, readiness, levels, cards at the bottom) with one button, Take the course (the wording of every button that opens a step). Once one step of a course is done and others are left, the button reads Continue the course, in KUDO amber with navy text (`.btn.continue`, `isStarted` in `home.js`); My results shows the same wording on a started course's tile. My courses is where the work happens: focus areas and the weekly challenge on top, then the plan month by month, week by week. The spaced reviews are steps of the plan; the separate "Come back to these" card was removed (28 Nov). Menu order: Home, My courses, My results, My progress, My collection.
- **This week first**: My courses opens on the steps due this week (with the time they take). Only the current phase is open; growth since the start shows on each level, and scenarios that reached their target are called out.
- **Spaced review**: questions a trainee missed or guessed on come back after 1 week and again after 3 weeks (`/api/me/review`). Practice only.
- **Trainee choice**: the trainee can swap the third focus area for one of the next two in priority. It becomes a draft that the KUDO Trainer approves. The KUDO Trainer's own focus override always wins.
- **Teach-back pairs**: in weeks 7 to 11, the board suggests pairing trainees who share a focus scenario, with a message to copy. The KUDO Trainer makes the introduction, so no trainee sees another's results.
- **Warm-up**: before a first recorded check, three neutral questions show the formats. Marked in the browser, never stored.
- **Worked example and common mistakes** per module (`CASES` in `server/curriculum-bank.js`). The examples are illustrative, built from the lesson facts; replace them with real cases when available.
- **Videos in the page**: on the Curriculum page, paste each module's video link. A SharePoint embed link (Share, Embed, the link inside src) plays in the page; any other https link opens in a new tab. The CSP allows frames from *.sharepoint.com and youtube-nocookie.com only.
- **Objectives** use observable verbs (no "Know ...").


## Guided tour

`public/tour.js`. Two scripts: trainees (17 steps: Home, My courses, a module, results, progress, the coach) and admins (12 steps: one per menu area). It opens automatically the first time someone signs in (after the password change), with Skip at every step; Done or Skip both record `users.tour_seen_at`. "Guided tour" at the bottom of the menu replays it at any time. Admins acting as a test trainee see the trainee tour. Keyboard: arrows to move, Esc to close. A step whose element is missing shows as a centred card, so the tour never gets stuck.

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

The admin edits and applies. Several releases at once: on Imports, Release notes, "Several releases at once" reads a Word file with the release e-mails dragged into it (Outlook .msg files, `server/release-bundle.js`): one release per version, follow-up e-mails merged (a follow-up saying a fix is not included turns it into a known issue), greetings, signatures, quoted replies and links left out, versions already present skipped. The 2026 history (v67.1, 9 Feb, to v69.5, 26 Nov; `server/release-history.json`, client names removed) loads once at start-up and is shown in KUDO News; its lesson changes wait for review. A release can be shown in or hidden from KUDO News without applying it. Every applied release appears under KUDO News (in the sidebar, for trainees and admins): its version, date, an executive summary and every change by type. The summary is drafted when the release is applied (by Claude when `ANTHROPIC_API_KEY` is set, otherwise written from the note) and an admin can rewrite it on the release page; an admin's text is never overwritten. Trainees also see a "Recent product changes" box at the top of each lesson concerned, and rewritten lines marked Updated. Retired questions leave the check pool. "Undo all changes" restores everything a release changed. There is no AI text generation (no API key): rewrites are drafted only where the note states what replaced what; everything else is the admin's wording.

## Collectibles

`server/collectibles.js`, `public/collectibles.js`. 41 cards in six sets: Journey (8: First step at the first connection, then the plan's milestones and phases, Client-ready, Graduate), Scenarios (12: the target on the combined assessment plus at least one lesson or test on the topic in the Academy), Topics (5: the cross-cutting modules), Hands-on (5: sandbox exercises; Sandbox master follows every exercise, today's and future ones), Craft (8) and Habit (3: 3, 6 and 10 active weeks). Worked out from existing data each time the trainee opens the app, stored with the date earned, never taken back, never shown to anyone else, and they never change a score. New cards are revealed once with a card flip (no animation when the device asks for reduced motion). "My collection" in the trainee menu; a strip on the programme page. Card art is original, drawn in code: generic symbols, no product logos.

The coaching role is called "your KUDO Trainer" everywhere trainees read it (plan items, lessons, reviews, tour), so the role can change hands without editing the content. Stored plans are rewritten once at start-up.

## Sandbox practice

`public/sandbox.js`: a replica of the KUDO screens, rebuilt from expert screen recordings, with test data, plus generic look-alikes of the client's own tools (a website builder, a video studio, three video-meeting apps (Zoom-like; a Google Meet-like calendar with the event editor, Video call options and the call; a Webex-like site with Schedule a Meeting, Scheduling options, the meeting page and the lobby; each has its own screens, the scoring is shared) and a team-meetings app, no brand). Eleven exercises, each reached from its lesson (Step 2) or `#sandbox-<key>`: 1 Platform (run a meeting, add a language live, find the recordings), 2 Platform (the right link to each person), 4 Teams (move the client's Teams meeting, add KUDO from Apps with the EU data region, set the KUDO tab, admit the bot from the lobby, find the Mobile Link in the chat, then follow as an attendee with Spanish voice and English captions in the KUDO panel), 5 Human Interpretation (set up and book interpreters), 6 Zoom, 7 Google Meet and 8 Webex (the same journey on three platforms: schedule the client's meeting with settings that let the bot in, link it in KUDO as an external meeting with Force close, start the meeting, which starts KUDO by itself, let the bot in, find the Mobile Link it posts in the chat, end the meeting, then download the recordings from KUDO's Content tab; Zoom adds the recording request, Meet the access type and "ask to join", Webex the guest rule and the automatic lock), 10 Widget, 11 RTMP and 12 HLS (4, 6, 7, 8, 10, 11 and 12 start with a client call, see below), 15 RingCentral (the Widget ID). Every click, field, screen, detour, mistake and hint is recorded. Score = outcome 70%, path 20% (detours, mistakes, hints), time 10% (full marks up to 5 minutes); exercises with a client call use outcome 45%, client call 20%, solution 15%, path 10%, time 10%. The report shows the checks, the mistakes, the expert's path and the trainee's own. Runs are saved in `sandbox_runs`; the first is the result of record. A pass (80%) signs the practice off for Scenario 1 only; the others sit next to a written task (decision pending, see `PENDING.md`). Sandbox runs do not move the level yet.

**Virtual coach** (`server/coach.js`, `public/coach.js`). A chat panel on every trainee page ("Ask KUDOG"). The coach is KUDOG, KUDO's dog mascot. It answers from the trainee's own data only (plan and dates, levels, tests, level changes, sandbox runs, cards, group sessions) and from a fixed description of how the Academy works and how scoring works (`KNOWLEDGE`). Two modes: built in (always on, no key): it recognises the common questions (what is next, progress over a period or between two months, next session and how 1:1s are scheduled, the next group session and its topic, scoring, focus areas, gaps, sandbox, cards, where things are) and answers with links; free-form with Claude when `ANTHROPIC_API_KEY` is set in Railway by the owner (never in the repo; `COACH_MODEL` optional, default `claude-sonnet-5-5`): the same data and rules go to the model, which must answer from them alone; if the call fails, the built-in answer is used. Questions are not stored; 40 per hour per trainee.

**Messages to the KUDO Trainer** (table `trainer_messages`). The coach panel has a second tab, "Your KUDO Trainer": the trainee sends a Question, Remark or Observation (10 a day at most). It lands on My board under "Do first" as a Message task; the trainer replies (the trainee sees it in the panel, and the coach button shows a dot) or marks it Noted. When the coach cannot answer, it offers to send the question to the trainer, prefilled. Messages from demo accounts show on the board with a Demo chip and never count in the figures.

Pending items and open decisions: `PENDING.md`.

**Group sessions** (admin Programme page, table `group_sessions`): title, date and time, length, topic and an optional https join link. Trainees see the next one on My courses under "Coming up with your KUDO Trainer", and the coach answers from the list.

**Module steps and the trainee's way through** (`moduleView` in `public/views-programme.js`). A module page has up to five numbered steps in plan order: Learn, Practise, Decide, Explain it, Prove it (the scored check, last). A sticky tracker at the top shows each step's state (done in green, up next in blue, to do, or optional when the step is not in the trainee's plan) and jumps to the step on a click. Each step card carries the same state chip and a coloured edge. Finishing a step refreshes the states in place (no reload, no jump to the top), then a toast and a short scroll lead to the next step; a "next step" bar stays in the finished card. Check results open where the check is, with "Next: step N" or "Finish the module" instead of a way back. When every planned step is done, KUDOG's module recap opens by itself (after a check, once the trainee has scrolled through the answers); closing it moves on to the plan, or "Keep going" opens the next module. Links in the plan open the module on the right step, and leaving a sandbox comes back to the Practise step.

**Step 1 · Learn as a story on slides** (`server/stories.js`, `public/story.js`; every module has one, 9 to 14 slides; the Platform module was the pilot). Modules with a sandbox follow the same fictional event as their exercise, so Step 1 and Step 2 tell one story. Decision options show in a fixed mixed order, so the right answer has no predictable place. Built with two open-source skills used as checklists (90n's Scenario-Based Learning and E-Learning Storyboard; nothing installed or run): one fictional client case carries the lesson in a fixed order (the situation, what is at stake, the expert's steps with a mock of the screen and why each matters, a decision with the consequence of each option, the traps, a four-point recap that leads to Step 2). One idea per slide; the slide's explanation never repeats the mock word for word; decisions are practice and are not scored or sent anywhere. Back / Next, arrow keys, a progress bar, and the last slide is remembered per module in the browser. "One page" shows the original sections, worked example and common mistakes, so nothing is lost; the choice is remembered. Modules without a story keep the one-page view. Every fact in a story comes from the module's own lesson, CASES and the expert recording.

**Client call before the build** (`brief` in a scenario; Scenarios 10 Widget, 11 RTMP and 12 HLS). Each has seven deciding questions, two that are not, four solutions with one right fit, and an in-call hint that suggests the next deciding question (it costs like any hint). The run opens on a call with the client, whose request is incomplete. The trainee picks questions: seven decide the set-up (audience and registration, languages, interaction, video platform, length, access to the page, AI or interpreters) and two do not. A client-confidence meter moves with each one. Then the trainee chooses one of four solutions and builds from their own notes, which hold only the answers they asked for. Score = outcome 45%, client call 20% (share of the deciding questions asked, minus 10 per question that does not change the set-up), solution 15%, path 10%, time 10% (full marks up to 7 minutes). The report lists the questions missed with why they mattered, and the best-fit solution with why.

## Phones and laptops

The app adapts below 860 px wide: the menu becomes a top bar with a menu button (drawer), trainees get a tab bar at the bottom (Home, Courses, Results, Progress, Collection) and the coach button sits above it, grids stack, tables scroll sideways, and charts are redrawn for the screen (the 12-week route turns vertical, one stop per week, and the selected week opens in place; other charts get a narrower drawing so text stays readable). Charts redraw when the screen crosses the phone breakpoint. The guided tour docks its card at the top or bottom on phones and opens the menu drawer for menu steps. Checked at 390 px (iPhone size) and 1400 px.

## Change checklist (every change)

Before shipping any change, check what depends on it and update it in the same change:

- **Guided tour** (`public/tour.js`): does any step describe what changed?
- **Collection** (`server/collectibles.js`): do card rules, texts or counts depend on it (modules, sandbox exercises, tests, phases)?
- **Lessons and tests** (`server/curriculum*.js`): do lesson steps, questions, practice tasks or worked examples still match?
- **Sandbox** (`public/sandbox.js`): scenarios, hints, scoring, and the scripted expert run (must still reach 100%) for every exercise.
- **My Results / My Progress** and the **admin views**: do new results show, and is anything counted twice?
- **Scenario doc and handover pack**: the sandbox scenarios doc and the briefing for the KUDO Trainer.
- **Automated tests** (`npm test`), then deploy and check the deployment.

**Design system (v3, 27 Nov 2026).** Built with the ui-ux-pro-max skill (nextlevelbuilder/ui-ux-pro-max-skill, its search tool run on its own data): "Minimalism & Swiss Style" for a professional SaaS / learning dashboard, Plus Jakarta Sans for headings and Inter for reading, an 8-point spacing scale, hairline borders first and shadows only for what floats. From the brand, only the KUDO logo and the KUDO colours are kept (navy #11374F, blue #1B5C84, sky #48A1D8, coral #DB6539, amber #F8C63F). The system lives in `public/ds.css`, loaded after `app.css`: tokens (`--n-*` neutrals, `--fs-*` type, `--s-*` space, radii, shadows, motion), then shell, controls, chips, tables, tabs, floating layers and page patterns (hero, fact strips, plan rows, module tracker). Use the tokens rather than raw values; keep 44px targets on phones, 16px inputs on phones, visible focus and reduced motion. Page layouts (round 2): Home is a bento grid (`.bento`, `.span-8`/`.span-4`): hero with the Up next card, a progress tile, three stat tiles, this week, then the KUDO Trainer and collection aside. My courses is a phase bar plus a two-column grid (plan on the left; focus, challenge, spaced review and KUDO Trainer on the right). My results shows module tiles (`.mtile`, score bar with the pass mark) and sandbox tiles (`.stile`). My collection groups cards by set with a set navigator and an All / Earned / To earn filter (`.seg`). The guided tour targets `.prog .hero`, `.home-stats`, `.roadmap-card`, `.journey`, `.levels-card`, `.coll-strip`, `.this-week`, `.focus-card` and `.challenge`: keep those classes when changing these pages. KUDO Trainer pages (round 3): every form field shares one style (file pickers included), empty table cells reading "None" are muted automatically by `h()`, My board's suggested week shows one card per day with tasks colour-coded by type and a "Does not fit this week" panel, and Reviews lists key points with covered / unsure / not heard marks (`.kp-*`; avoid the old global `.ok` class). Phones and accessibility (round 4): on screens under 640px every `table.tbl` turns into one card per row; `ui.js` copies each column header into the cells' `data-label`, so new tables get this for free (keep a `<thead>`). Pages pass axe on WCAG 2.1 AA: use `--ink-500` for secondary text and `--ink-400` for the quietest text (both pass 4.5:1), give a labelled icon span `role="img"` (done automatically when it has no text), and underline links inside running text. Trainee Home (Nov 2026, merged 28 Nov): the Welcome card across the top (Take the course, or Continue the course, for the next step), then My Quarter's Program with My Program's completion inside it (ring, steps done, pace: `monthsCard({ completion: true })`), then one card with My Readiness on the left and My Knowledge's breakdown on the right (`readinessLevelsCard`; External shows as External Meeting Platform there). Before any result, My Readiness reads "It starts moving upon your first course's completion." My Readiness (the starting point from the Self Assessment and knowledge test, then one point each time a result moves a level, from `state.progression` in `engine.js`), then My Quarter's Program (`home.js` `monthsCard`: three month cards; the KUDO Trainer sees `weeksCard` on a trainee's page) and My Knowledge's breakdown (one bar per scenario: now, start, target; no label per row since 28 Nov, the bar colour says how close the scenario is to its target, with one colour key: green target reached, sky nearly there, amber developing, coral far from target; the readiness chart is a rounded step line over a soft gradient with the start dashed and today's level in a bubble). Copy conventions that stay: `metaRow([...])` for meta lines, ticks and crosses through `mark(ok)`, decorative icons hidden from screen readers by `svg()`, empty values read "None".

**Accessibility and touch (UI/UX Pro Max pass, Nov 2026).** `modal()` keeps keyboard focus inside, closes on Escape and returns focus to the opener; error toasts (`toast(msg, true)`) stay until dismissed and are announced; a skip link and `aria-current` on the menu; focus moves to the page title after navigation; phones get 44px targets and 16px form fields; every floating layer uses the `--z-*` scale in `:root` (the coach sits below dialogs). Colours and fonts were not changed.

**Brag to the team** (`server/collectibles.js`, `bragPanel` in `public/collectibles.js`). On the new-card pop-up and on earned cards in My collection, a trainee can post the card to the team's Slack channel: first name, card and tier, one of six playful lines, an optional line of their own (140 characters, escaped so it cannot ping the channel), what it was earned for and a link to the Academy. They see the exact message first; one brag per card; test accounts and admins in test mode never post. Needs `SLACK_WEBHOOK_URL` (a hooks.slack.com incoming webhook, added by the owner in Railway); `SLACK_CHANNEL_NAME` labels the button; `ACADEMY_URL` sets the link (default: the Railway address).

**My courses, month by month (28 Nov).** Every week is a raised card (`.mp-week`, layered shadow) on a timeline down the left (`.mp-node`): a tick for a finished week, the week number ahead, coral when steps are left behind. The current week has a larger node in the month colour reading "Now", a tinted header and a "You are here" tag. Inside a week, KUDO Trainer sessions come first, then one row per course (`courseList`, `.cl-course`): a state icon (done, in progress, not started), the course name, its steps as a short track (green done, dashed blue next, grey to do, scores inline), what is next and about how long it takes, and one button (Take the course, or Continue the course in amber). Step names are the same everywhere: Learn, Practise, Decide, Explain it, Prove it.

**My Activities** (`server/activity.js`, `public/views-activity.js`). A trainee page in the left menu (not in the phone tab bar) and an Activity tab on each person's admin page, both reading the same log: `GET /api/me/activity` and `GET /api/admin/trainees/:id/activity`. Connections are stored as visits in `user_visits` by the `trackVisit` middleware: a visit starts with the first request after 30 minutes without any, and its last-seen time moves forward at most once a minute. Only the kind of device (computer, phone, tablet) is kept, no IP address. An admin taking the courses as a test trainee is not counted. The page shows the last connection, total time logged in (and this week), days active and the number of activities, a bar chart of time per week over twelve weeks, then the log day by day: connections, course steps, course tests (record, retake, spaced review), walkthroughs, recordings, sandbox runs, weekly challenges and cards, with times and scores, filterable by type. My results no longer has the Sandbox exercises and My attempts cards: sandbox scores show on the Practise step of their course in My results per course, and every attempt is in My Activities.

**Weekly challenge page** (`challengeView` in `public/assess-ui.js`, route `#challenge`). The Weekly challenge card on My courses opens a page with this week's four questions, then Questions to review (moved from My results): the questions missed in the initial assessment with the correct answer, to go through regularly. Once the week's challenge is done, the card links to the same page for the questions to review.

**KUDOG, redesigned (28 Nov 2026)** (`public/coach.js`, `client-src/kudog3d.js`). The virtual coach panel follows current assistant patterns: a welcome screen with KUDOG in 3D, a greeting by first name and six suggestion cards; once the chat starts KUDOG moves to the header as a live avatar; answers stream in word by word (instantly with reduced motion), with links as buttons, a copy button, the time, and up to three follow-up suggestions; a composer that grows with the text (Enter sends, Shift and Enter adds a line); a scroll-to-latest arrow; New conversation, Larger window and Close in the header; a KUDO Trainer tab shown as a thread (your messages, their replies) with Question, Remark or Observation; full screen on phones. KUDOG in 3D was first a procedural three.js model (since replaced by the rigged dog, see "KUDOG made realistic" below): tan puppy, big eyes behind grey goggles, lime headset with a microphone, floppy ears, a gold necklace with a medal bearing his name (KUDOG), which swings as he moves. He breathes, blinks, wags, his ears follow through, his head follows the pointer, and each mood has its pose (listening, thinking, happy with hops, excited with a jump and spin, concerned, sleepy with a floating z); clicking him is a pet (five pets in a row: excited). The model is bundled with three.js by esbuild into `public/kudog3d.bundle.js` (`npm run build:kudog` after changing `client-src/kudog3d.js`; three and esbuild are dev dependencies, the bundle is committed), loaded only when the panel first opens, about 150 KB compressed (`compression` middleware). Rendering pauses when the panel is closed or the tab hidden. Without WebGL, KUDOG falls back to the 2D puppet (`kudog.js`), which the tour and the card reveals still use.

**KUDOG as a real dog (28 Nov 2026)** (`client-src/kudog3d.js`). The model was rebuilt as a four-legged dog, seen at three-quarters: a tan coat with a brown saddle, crown, brows, ears and tail, cream muzzle, blaze, chest, paws and tail tip, a longer snout with the nose at its tip, long drop ears, big eyes (no glasses), a complete lime headset (band from cup to cup, cushions, microphone boom to the mouth) and his gold KUDOG medal. He is rigged (hips, body pitch, four legs that reach the ground, a head that stays level, jaw, ears, tail) and has poses: sit, stand, lie down, play bow, walk, sniff, bark (three snaps and a Woof! bubble), scratch (hind leg behind the ear), listen, think, sad, sleep. Left alone he lives his life: he sits and looks around, then scratches, barks, sniffs, stretches or walks a circle and lies down, at random. Moods map to routines: listening (head tilt, ears up), thinking (scratches while he thinks), happy (play bow then hops), excited (spin jump then bark), concerned (lies down, ears low), sleepy (asleep with a z). Clicking him: he wiggles and barks. Reduced motion: still poses, no routines. `kudogPuppet()` in `kudog.js` now returns the 3D dog (the 2D puppet, `kudog2D`, shows while it loads and stays without WebGL), so he is in 3D in the guided tour, the card reveals, the course recap and the brag window, as well as in the chat. A 3D view removed from the page frees its WebGL context after about three seconds.

**KUDOG made realistic (28 Nov 2026)** (`client-src/kudog3d.js`, `public/kudog/kudog.glb`). KUDOG is now a real rigged dog model: a Shiba Inu by Quaternius (low poly, CC0 public domain, see `public/kudog/LICENSE-model.txt`), 46 bones, quantized to about 560 KB and loaded once per page, with smoothed normals and KUDO's coat colours (tan, cream, dark nose and eyes). His motion comes from the model's motion-captured clips (idle, look around, sniff, eat/dig, walk, gallop, jump, shake) blended with an AnimationMixer, plus poses layered on the skeleton by quaternion: sit, lie down, scratch (hind leg kicking behind the ear), listen and think (head tilts), sad (lying, ears back) and sleep (curled, chin down, eyes closed, slow breathing, a floating z). On top, every frame: tail wag (fast when happy, slow when asleep), soft floppy ears with a twitch now and then, blinks, head following the pointer, three head snaps and a Woof! when he barks, a wiggle when petted. An invisible floor hides anything below the ground. Left alone he sits and looks around, scratches, barks, sniffs, digs, shakes himself or walks a circle and lies down, at random; moods: listening, thinking (thinks, then scratches), happy (jump, wag), excited (gallops a circle, jumps, barks), concerned (lies down, ears back), sleepy (falls asleep). The headset and the gold KUDOG medal are attached to his head and neck bones, so they follow every move. Three framings by size: face close-up (under 90 px), head and chest, full dog. `ready` resolves once the model is on screen: `kudogPuppet()` and the coach keep the 2D stand-in until then. The 2D stand-in (`kudog2D`) and the round faces (chat button, toasts, recap) are stills rendered from the 3D model (`public/kudog-sit.webp`, `public/kudog-face.webp`); the old cartoon picture is gone.

**KUDOG's gear and quips (28 Nov 2026)** (`client-src/kudog3d.js`, `kudogQuips` in `public/kudog.js`). He wears a conferencing headset, the core of KUDO's business: padded navy headband with a lime stripe, large over-ear cups with cushions, a boom microphone with a foam windscreen at his mouth and a lime "live" light. Around his neck, a lime dog collar with KUDOG written along it (fitted at start-up to the neck's own shape) and, hanging from its gold ring, his gold KUDOG medal, which swings as he moves. On the coach's welcome screen he cracks a joke about dogs and multilingual meetings in a speech bubble a few seconds after the panel opens, then every 30 seconds, and whenever he is petted (never once the chat has started). The first one: "Want me to say Woof in 5 languages?", then he barks and bubbles pop up around him: Japanese ワンワン (wan wan), French Wouf wouf, German Wau wau, Spanish Guau guau, Italian Bau bau, ending with "Live interpretation, dog edition." The bubbles are decorative and hidden from screen readers; with reduced motion they appear without animation.

**Halfway test trainee** (`server/demo-halfway.js`). `demo.halfway@kudo.ai`, "Test Trainee (Halfway)", is created once at start-up (flag `demo_halfway_2026` in `app_settings`): a test trainee at week 6 of 12 with weeks 1 to 5 done and the first step of week 6 started. It has course tests of record (one below the pass mark, then retaken as practice), decision walkthroughs, explain-it recordings (one reviewed by the KUDO Trainer), practice signed off, sandbox runs, spaced reviews, weekly challenges, course recaps already shown and the cards that follow. Test dates stay after the knowledge test the plan starts from, so they move levels like a real trainee's. It is `is_demo`: never counted in team figures. Open it from Admin, Test trainees, Take the courses; Reset to start puts it back to halfway, dated from that day.

**Card rarity** (`rarityCounts`/`rarityOf` in `server/collectibles.js`, `rarityLine` in `public/collectibles.js`). Every card shows how many real trainees hold it (active, not test accounts; anonymous counts, never names): Legendary up to 5%, Epic up to 15%, Rare up to 35%, Uncommon up to 65%, then Common; Unclaimed when nobody has it. Earned cards get a cheer ("Only 8% of trainees have this one. Good job!"), locked ones a nudge ("Be the first." next to the Unclaimed tag). The three month cards keep their month colour even when locked. Card "How to earn" lines are one short sentence; the rule shared by a set is in the set's intro. Shown on My collection and the new-card pop-up; a brag about a card held by 35% or fewer adds it to the Slack message. A card counts once the trainee has opened the Academy since earning it.

**KUDOG** (`public/kudog.js`, picture `public/kudog-sit.webp`). The coach's 2D stand-in, shown while the 3D dog loads or when WebGL is missing: one still of the 3D dog that breathes, hops, tilts and wiggles. Motion follows the 12 animation principles at 50% intensity (taken from the image-to-3d-rebuild skill): each mood is a pure function of time with anticipation, squash on landing and follow-through. Moods: idle (breathes), listening (head tilt while you type), thinking (while he looks it up), happy, excited (good progress, new cards, brags), concerned (gaps, a drop), tilt (a question he cannot answer), sleepy (75 s without activity; wakes with a start) and pet (click him; five quick pets make him excited). The server sends a `mood` with each answer (`moodFor` in `server/coach.js`); other pages cheer him on with `window.dispatchEvent(new CustomEvent('kudog', { detail: 'excited' }))`, which makes the closed button hop. Reduced motion: he stays still.

**Module recap, told by KUDOG** (`server/recaps.js`, `public/recap.js`). When every step of a module in the trainee's plan is done, KUDOG opens a pop-up with the score of each task (module check, Decide walkthrough, explain-it, practice task, sandbox exercises; the lesson shows Done) and the module score (average of the scored tasks), compared with where the trainee started on that scenario. Scores are the system's own (first attempt, automatic review): nothing waits for the KUDO Trainer, whose review still replaces an automatic score if they give one, and My courses shows each step's score instead of "Waiting for sign-off". At or above the 80% mark and the starting level, he celebrates; below either, he is supportive and gives a training plan built from the weak tasks (retake the check as practice, replay the walkthrough, record again with the missed points, the next scored chance). Shown once (`module_recaps`), after any recording has been scored; the module page keeps a "Module complete" line with See my recap.

**KUDOG speaks** (`kudogSays` in `public/kudog.js`). Every pop-up that talks to a trainee comes from KUDOG: the module recap, the new-card reveal, the brag, the guided tour (he introduces himself, then reacts to each step) and the short confirmations on trainee pages (his face leads the message). The KUDO replica screens in the sandbox keep the product's own dialogs.

**KUDOG with Claude** (`server/knowledge.js`, `claudeAnswer` in `server/coach.js`). With `ANTHROPIC_API_KEY` set, KUDOG answers anything: the trainee's programme and scores (from their own data), KUDO itself (from the Academy's lessons: sections, hand-over rules, stories, key points, worked examples, check questions and the KUDO Trainer's published FAQ, the most relevant passages picked per question) and work help around it (explaining to a client, a short email). KUDO facts come only from those passages; otherwise he says he is not sure and offers the KUDO Trainer. His last line carries his mood and the hand-off, which the page turns into his reaction and an "Ask your KUDO Trainer" link. If Claude does not answer, the built-in answer is used. At start-up the log says "KUDOG AI: ready (model)" or why not. `COACH_MODEL` overrides the model.

**Test trainees start fresh**: only the October results, plan starting the day they are created, exactly like a real first connection. Test trainees created earlier with pretend progress were reset once at start-up.
