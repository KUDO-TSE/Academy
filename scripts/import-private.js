// Loads the real roster and results from a PRIVATE folder that is not in Git.
// Usage:  PRIVATE_SEED_DIR=/path/to/private-seed npm run import:private
// Needs DATABASE_URL and INITIAL_PASSWORD (new accounts start with it and must change it at first sign-in). Safe to run again.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { migrate, pool } from '../server/db.js';
import { ensureAdmins } from '../server/auth.js';
import * as imp from '../server/importers.js';

const dir = path.resolve(process.env.PRIVATE_SEED_DIR || './private-seed');
const read = (f) => (fs.existsSync(path.join(dir, f)) ? parse(fs.readFileSync(path.join(dir, f), 'utf8'), { columns: true, skip_empty_lines: true, trim: true, bom: true }) : null);
const show = (label, r) => { console.log(label.padEnd(28), JSON.stringify({ ...r, errors: r.errors?.length ? r.errors : undefined })); };

if (!process.env.INITIAL_PASSWORD) { console.error('INITIAL_PASSWORD is not set.'); process.exit(1); }
await migrate();
const SELF = { key: 'oct-2026-self', label: 'Oct 2026 Self Assessment', taken_on: '2026-10-21', sort: 1 };
const LIVE = { key: 'oct-2026-live', label: 'Oct 2026 Knowledge Test', taken_on: '2026-11-09', sort: 1 };

const roster = read('roster.csv'); if (roster) show('roster', await imp.importRoster(roster));
await ensureAdmins(); // admins who are also on the team keep their own trainee data
const profile = read('profile.csv'); if (profile) show('profile', await imp.importProfile(profile));
const self = read('self_assessment.csv'); if (self) show('self assessment', await imp.importSelf(SELF, self));
const qs = read('questions.csv'); if (qs) show('question bank', await imp.importQuestions(LIVE, qs));
const live = read('live_scores.csv'); if (live) show('knowledge test scores', await imp.importLiveScores(LIVE, live));
const qr = read('question_results.csv'); if (qr) show('question results', await imp.importQuestionResults(LIVE, qr));
await pool.end();
