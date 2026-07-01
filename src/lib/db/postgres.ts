import { Pool, PoolConfig } from 'pg';
import { parse } from 'pg-connection-string';

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      'DATABASE_URL is not set. Add it to .env.local, e.g. postgresql://postgres@localhost:5432/isi_climate'
    );
  }
  return url;
}

function createPool(): Pool {
  const connectionString = getDatabaseUrl();
  const parsed = parse(connectionString);

  const config: PoolConfig = {
    user: parsed.user || 'postgres',
    host: parsed.host || 'localhost',
    port: parsed.port ? parseInt(String(parsed.port), 10) : 5432,
    database: parsed.database || 'isi_climate',
    // Explicit empty string for no-password local Postgres (node-pg requires string type)
    password: parsed.password ?? process.env.PGPASSWORD ?? '',
    ssl:
      connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
  };

  return new Pool(config);
}

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = createPool();
} else {
  if (!(global as any).pgPool) {
    (global as any).pgPool = createPool();
  }
  pool = (global as any).pgPool;
}

let dbInitialized = false;

export async function initDb() {
  if (dbInitialized) return;

  console.log('[Postgres] Initializing database schema...');
  try {
    // Ensure target database exists (connect to postgres db first if needed)
    try {
      await pool.query('SELECT 1');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('database') && message.includes('does not exist')) {
        const parsed = parse(getDatabaseUrl());
        const adminPool = new Pool({
          user: parsed.user || 'postgres',
          host: parsed.host || 'localhost',
          port: parsed.port ? parseInt(String(parsed.port), 10) : 5432,
          database: 'postgres',
          password: parsed.password ?? process.env.PGPASSWORD ?? '',
          ssl: false,
        });
        await adminPool.query(`CREATE DATABASE ${parsed.database || 'isi_climate'}`);
        await adminPool.end();
      } else {
        throw err;
      }
    }

    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";').catch(() => {
      console.log('[Postgres] uuid-ossp extension already exists or is not supported. Relying on built-ins.');
    });

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        password_hash VARCHAR(255),
        organization VARCHAR(255),
        approval_status VARCHAR(50) DEFAULT 'approved',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_email_role UNIQUE (email, role)
      );
    `);

    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(255);`);
    await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved';`);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS otps (
        email VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        otp VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        PRIMARY KEY (email, role)
      );
    `);

    dbInitialized = true;
    console.log('[Postgres] Database schema initialized successfully');
  } catch (error) {
    console.error('[Postgres] Database initialization failed:', error);
    throw error;
  }
}

export async function query(text: string, params?: unknown[]) {
  if (!dbInitialized) {
    await initDb();
  }
  const start = Date.now();
  const res = await pool.query(text, params);
  const duration = Date.now() - start;
  console.log('[Postgres Query] Executed query:', { text, duration, rows: res.rowCount });
  return res;
}

export { pool };
