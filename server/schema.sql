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
