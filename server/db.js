import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 10,
});

export const q = (text, params) => pool.query(text, params);

export async function migrate() {
  const sql = fs.readFileSync(path.join(here, 'schema.sql'), 'utf8');
  await pool.query(sql);
  await pool.query(`CREATE TABLE IF NOT EXISTS scenario_settings (
    key TEXT PRIMARY KEY, critical_steps INT NOT NULL DEFAULT 0
  )`);
}

export async function audit(req, action, target, detail) {
  try {
    const u = req?.user;
    await q('INSERT INTO audit_log (actor_id, actor_email, action, target, detail) VALUES ($1,$2,$3,$4,$5)',
      [u?.id ?? null, u?.email ?? null, action, target ?? null, detail ?? null]);
  } catch (e) { console.error('audit failed', e.message); }
}
