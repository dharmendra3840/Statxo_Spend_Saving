// Applies supabase/migrations/*.sql in filename order, then prints the
// verification row. Run with: node scripts/migrate.mjs
//
// Uses DATABASE_URL (the Session pooler string) from .env.local. This is a
// local dev convenience only -- the deployed app never opens a raw Postgres
// connection, it goes through PostgREST with the publishable key and RLS.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL missing from .env.local');
  process.exit(1);
}

const dir = 'supabase/migrations';
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log('connected to', new URL(url).hostname, '\n');

for (const file of files) {
  const sql = readFileSync(join(dir, file), 'utf8');
  process.stdout.write(`${file} ... `);
  try {
    const result = await client.query(sql);
    // A multi-statement query returns an array of results; the seed file ends
    // with the verification SELECT, so surface the last one that has rows.
    const rows = (Array.isArray(result) ? result : [result])
      .filter((r) => r.rows?.length)
      .pop();
    console.log('ok');
    if (rows) console.table(rows.rows);
  } catch (err) {
    console.log('FAILED');
    console.error(`  ${err.message}`);
    if (err.position) console.error(`  at character ${err.position}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
