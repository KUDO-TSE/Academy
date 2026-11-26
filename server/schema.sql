CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'trainee' CHECK (role IN ('admin','trainee')),
  region TEXT,
  team TEXT,
  weight NUMERIC NOT NULL DEFAULT 1,
  demand_scenario TEXT,
  struggle_scenarios TEXT[] NOT NULL DEFAULT '{}',
  struggle_text TEXT,
  profile JSONB NOT NULL DEFAULT '{}',
  password_hash TEXT NOT NULL,
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_logins INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower ON users (lower(email));

CREATE TABLE IF NOT EXISTS rounds (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('self','live')),
  taken_on DATE,
  sort INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS scores (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_id INT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  pct NUMERIC NOT NULL,
  correct INT,
  total INT,
  PRIMARY KEY (user_id, round_id, scenario)
);

CREATE TABLE IF NOT EXISTS questions (
  round_id INT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  qnum INT NOT NULL,
  scenario TEXT NOT NULL,
  level TEXT,
  question TEXT NOT NULL,
  answer TEXT,
  PRIMARY KEY (round_id, qnum)
);

CREATE TABLE IF NOT EXISTS question_results (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round_id INT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  qnum INT NOT NULL,
  correct BOOLEAN NOT NULL,
  PRIMARY KEY (user_id, round_id, qnum)
);

CREATE TABLE IF NOT EXISTS plan_items (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month INT NOT NULL DEFAULT 1 CHECK (month BETWEEN 1 AND 3),
  title TEXT NOT NULL,
  description TEXT,
  scenario TEXT,
  kind TEXT NOT NULL DEFAULT 'resource' CHECK (kind IN ('session','resource','one_to_one','practice','checkpoint')),
  delivery TEXT NOT NULL DEFAULT 'both' CHECK (delivery IN ('both','hi','ai')),
  due_date DATE,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  completed_at TIMESTAMPTZ,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS plan_items_user ON plan_items (user_id);

CREATE TABLE IF NOT EXISTS targets (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  target_pct NUMERIC NOT NULL,
  due_date DATE,
  PRIMARY KEY (user_id, scenario)
);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  shared BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notes_user ON notes (user_id);

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_id INT REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trainee BOOLEAN NOT NULL DEFAULT FALSE;

-- ---- Programme (v2): plans are built automatically from inputs and approved by the Academy owner
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_demo BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_overrides JSONB NOT NULL DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS tour_seen_at TIMESTAMPTZ;
-- A role changed by hand (Users & access, or a correction below) is never overridden by ADMIN_EMAILS at start-up.
ALTER TABLE users ADD COLUMN IF NOT EXISTS role_locked BOOLEAN NOT NULL DEFAULT FALSE;
-- 2026-11-25 correction: Bayardo is a trainee, not an admin. Runs once (role_locked), keeps his data.
UPDATE users SET role='trainee', is_trainee=FALSE, role_locked=TRUE,
       team = CASE WHEN team IS NULL OR team='Admin' THEN 'Technical Solutions / Support' ELSE team END,
       weight = CASE WHEN team IS NULL OR team='Admin' THEN 0.5 ELSE weight END
 WHERE lower(email)='bayardo@kudo.ai' AND role='admin' AND NOT role_locked;

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS plans (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  version INT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft','approved','superseded')),
  data JSONB NOT NULL,
  signature TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  started_on DATE
);
CREATE INDEX IF NOT EXISTS plans_user ON plans (user_id, version DESC);

CREATE TABLE IF NOT EXISTS plan_progress (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('done')),
  note TEXT,
  signed_off_by INT REFERENCES users(id) ON DELETE SET NULL,
  signed_off_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_key)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  item_key TEXT,
  correct INT NOT NULL,
  total INT NOT NULL,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS quiz_attempts_user ON quiz_attempts (user_id, created_at);

-- Inputs added by the Academy team: 1:1 sessions, call or video reviews, observations
CREATE TABLE IF NOT EXISTS inputs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  author_id INT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('one_to_one','recording','observation','other')),
  happened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  title TEXT NOT NULL,
  link TEXT,
  body TEXT,
  signals JSONB NOT NULL DEFAULT '[]',
  item_key TEXT,
  shared_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS inputs_user ON inputs (user_id, happened_on);

-- ---- Assessment v3: mixed formats, certainty, walkthroughs, explain-it, feedback
ALTER TABLE quiz_attempts ALTER COLUMN correct TYPE NUMERIC;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS knowledge NUMERIC;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS cbm NUMERIC;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'check';

CREATE TABLE IF NOT EXISTS module_feedback (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  clear INT NOT NULL CHECK (clear BETWEEN 1 AND 5),
  relevant INT NOT NULL CHECK (relevant BETWEEN 1 AND 5),
  confidence INT NOT NULL CHECK (confidence BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module_key)
);

CREATE TABLE IF NOT EXISTS survey_responses (
  user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  answers JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS submissions (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  text_answer TEXT,
  audio BYTEA,
  audio_mime TEXT,
  audio_seconds INT,
  self_points JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','reviewed')),
  rubric JSONB,
  review_comment TEXT,
  reviewer_id INT REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS submissions_user ON submissions (user_id, module_key);

-- ---- Action board: snoozed or handled board tasks
CREATE TABLE IF NOT EXISTS board_tasks (
  task_key TEXT PRIMARY KEY,
  snoozed_until DATE,
  handled_at TIMESTAMPTZ,
  handled_by INT REFERENCES users(id) ON DELETE SET NULL,
  note TEXT
);

-- ---- Automatic review of explain-it recordings
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS transcript TEXT;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS auto JSONB;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS needs_human BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS human_requested BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_status_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_status_check CHECK (status IN ('processing','submitted','auto','reviewed'));

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'explain';

-- ---- First attempt is the score of record (per assessment cycle); retakes are practice
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS counts BOOLEAN;
ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS cycle INT NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS counts BOOLEAN;
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS cycle INT NOT NULL DEFAULT 0;
UPDATE quiz_attempts a SET counts = (x.rn = 1) FROM (
  SELECT id, row_number() OVER (PARTITION BY user_id, module_key, kind, CASE WHEN item_key LIKE 'review.%' THEN item_key ELSE '' END, cycle ORDER BY created_at, id) rn FROM quiz_attempts) x
  WHERE a.id = x.id AND a.counts IS NULL;
UPDATE submissions s SET counts = (x.rn = 1) FROM (
  SELECT id, row_number() OVER (PARTITION BY user_id, module_key, kind, cycle ORDER BY created_at, id) rn FROM submissions) x
  WHERE s.id = x.id AND s.counts IS NULL;

-- ---- Sessions (v5): recordings or transcripts of 1:1 and group sessions, and what the Academy learns from them
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('one_to_one','group')),
  title TEXT NOT NULL,
  happened_on DATE NOT NULL DEFAULT CURRENT_DATE,
  host_name TEXT,
  user_ids INT[] NOT NULL DEFAULT '{}',
  filename TEXT,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded','processing','ready','failed')),
  progress INT NOT NULL DEFAULT 0,
  error TEXT,
  duration_s INT,
  transcript TEXT,
  utterances JSONB,
  findings JSONB NOT NULL DEFAULT '[]',
  signals JSONB NOT NULL DEFAULT '[]',
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS field_notes (
  id SERIAL PRIMARY KEY,
  module_key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('faq','item')),
  question TEXT NOT NULL,
  answer TEXT,
  item JSONB,
  session_id INT REFERENCES sessions(id) ON DELETE SET NULL,
  finding_id INT,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','withdrawn')),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS field_notes_module ON field_notes (module_key, status);

-- ---- Collectibles (v6): cards trainees earn at milestones. Never taken back.
CREATE TABLE IF NOT EXISTS collectibles (
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  seen_at TIMESTAMPTZ,
  PRIMARY KEY (user_id, key)
);

-- ---- Release notes (v7): imported KUDO release notes, what they change in the Academy, and the edits applied.
CREATE TABLE IF NOT EXISTS releases (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  released_on DATE NOT NULL DEFAULT CURRENT_DATE,
  raw TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('review','applied')),
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  applied_at TIMESTAMPTZ
);
ALTER TABLE field_notes ADD COLUMN IF NOT EXISTS release_id INT REFERENCES releases(id) ON DELETE SET NULL;
ALTER TABLE field_notes DROP CONSTRAINT IF EXISTS field_notes_kind_check;
ALTER TABLE field_notes ADD CONSTRAINT field_notes_kind_check CHECK (kind IN ('faq','item','update'));
CREATE TABLE IF NOT EXISTS content_edits (
  id SERIAL PRIMARY KEY,
  ref TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('line','retire')),
  text TEXT,
  original TEXT,
  release_id INT REFERENCES releases(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS content_edits_active ON content_edits (active, ref);

-- ---- One-off (v8): the coaching role is "your KUDO Trainer", not a named person. Rewrites stored plan texts.
UPDATE plans SET data = replace(replace(replace(replace(data::text, ' with Jack', ' with your KUDO Trainer'), 'Jack plays the client', 'Your KUDO Trainer plays the client'), 'Jack reviews it', 'Your KUDO Trainer reviews it'), 'chosen by Jack', 'chosen by your KUDO Trainer')::jsonb
  WHERE data::text ~ '( with Jack|Jack plays the client|Jack reviews it|chosen by Jack)';
UPDATE inputs SET title = replace(title, ' with Jack', ' with your KUDO Trainer') WHERE title LIKE '% with Jack%';
UPDATE plan_items SET title = replace(title, ' with Jack', ' with your KUDO Trainer') WHERE title LIKE '% with Jack%';
UPDATE plans SET data = replace(data::text, 'Your KUDO Trainer reviews it and it counts towards your level.', 'It is reviewed automatically and your KUDO Trainer spot-checks it.')::jsonb
  WHERE data::text LIKE '%it counts towards your level%';

-- ---- Sandbox practice (v9): runs on a replica of the KUDO screens. The first run is the result of record.
CREATE TABLE IF NOT EXISTS sandbox_runs (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scenario TEXT NOT NULL,
  score INT NOT NULL,
  result JSONB NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  record BOOLEAN NOT NULL DEFAULT false,
  seconds INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sandbox_runs_user ON sandbox_runs (user_id, scenario, created_at);
