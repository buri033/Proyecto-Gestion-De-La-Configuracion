import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

let pgliteInstance: PGlite | null = null;
let pgPoolInstance: pg.Pool | null = null;

const dbUrl = process.env['DATABASE_URL'];

export async function getDb() {
  if (dbUrl) {
    if (!pgPoolInstance) {
      pgPoolInstance = new pg.Pool({ connectionString: dbUrl });
    }
    return { type: 'pg' as const, client: pgPoolInstance };
  } else {
    if (!pgliteInstance) {
      const dataDir = path.resolve('db_data');
      pgliteInstance = new PGlite(dataDir);
    }
    return { type: 'pglite' as const, client: pgliteInstance };
  }
}

export async function query<T = any>(sql: string, params?: any[]): Promise<{ rows: T[] }> {
  const db = await getDb();
  if (db.type === 'pg') {
    const res = await db.client.query(sql, params);
    return { rows: res.rows as T[] };
  } else {
    const res = await db.client.query(sql, params);
    return { rows: res.rows as T[] };
  }
}

export async function initDb(): Promise<void> {
  const db = await getDb();
  
  // Check if tables already initialized
  try {
    const test = await query(`SELECT 1 FROM accounts LIMIT 1;`);
    if (test.rows) {
      console.log('BD local ya inicializada');
      return;
    }
  } catch (_e) {
    // Tables do not exist yet, proceed with initialization
  }

  console.log('Inicializando esquemas y funciones en la BD local...');
  const dbDir = path.resolve('../db');

  const schemaSql = fs.readFileSync(path.join(dbDir, '01_schema.sql'), 'utf-8');
  const functionsSql = fs.readFileSync(path.join(dbDir, '02_functions.sql'), 'utf-8');
  const seedSql = fs.readFileSync(path.join(dbDir, '04_seed.sql'), 'utf-8');
  const cajitasSql = fs.readFileSync(path.join(dbDir, '05_cajitas_retiros.sql'), 'utf-8');

  const initAuthSchema = `
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text UNIQUE NOT NULL,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
  `;

  if (db.type === 'pglite') {
    await db.client.exec(initAuthSchema);
    await db.client.exec(schemaSql);
    await db.client.exec(functionsSql);
    await db.client.exec(seedSql);
    await db.client.exec(cajitasSql);
  } else {
    await db.client.query(initAuthSchema);
    await db.client.query(schemaSql);
    await db.client.query(functionsSql);
    await db.client.query(seedSql);
    await db.client.query(cajitasSql);
  }

  console.log('BD local inicializada con exito');
}
