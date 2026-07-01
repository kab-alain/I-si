import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

let pool: Pool;

if (process.env.NODE_ENV === 'production') {
  pool = new Pool({
    connectionString,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
} else {
  // In development, preserve pool across Hot Module Replacement (HMR)
  if (!(global as any).pgPool) {
    (global as any).pgPool = new Pool({
      connectionString,
    });
  }
  pool = (global as any).pgPool;
}

let dbInitialized = false;

export async function initDb() {
  if (dbInitialized) return;

  console.log('[Postgres] Initializing database schema...');
  try {
    // Enable uuid-ossp if not already enabled (for older PG versions, gen_random_uuid() is built-in in PG 13+)
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";').catch(() => {
      console.log('[Postgres] uuid-ossp extension already exists or is not supported. Relying on built-ins.');
    });

    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_email_role UNIQUE (email, role)
      );
    `);

    // Create otps table
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

export async function query(text: string, params?: any[]) {
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
