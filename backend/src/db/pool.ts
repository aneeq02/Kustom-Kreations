import { Pool, PoolConfig } from 'pg';

const dbUrl = process.env.DATABASE_URL || '';
const isSupabase =
  dbUrl.includes('supabase') || (process.env.DB_HOST || '').includes('supabase');

const ssl = isSupabase || process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false;

// Prefer individual DB_* vars (avoids URL-encoding issues with special chars in passwords)
const config: PoolConfig = process.env.DB_HOST
  ? {
      host:     process.env.DB_HOST,
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    }
  : {
      connectionString: dbUrl,
      ssl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    };

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
