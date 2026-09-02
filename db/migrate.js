import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import pg from 'pg';
import 'dotenv/config';

const MIGRATIONS_DIR = path.join(process.cwd(), 'db', 'migrations');

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM schema_migrations WHERE name = $1', [file]);
    if (rows.length) {
      console.log(`skip  ${file} (already applied)`);
      continue;
    }

    console.log(`apply ${file}`);
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  await pool.end();
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
