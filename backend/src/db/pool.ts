import { Pool, PoolConfig } from 'pg';

const dbUrl = process.env.DATABASE_URL || '';
const isSupabase =
  dbUrl.includes('supabase') || (process.env.DB_HOST || '').includes('supabase');

const ssl = isSupabase || process.env.NODE_ENV === 'production'
  ? { rejectUnauthorized: false }
  : false;

// Supabase's free-tier connection pooler (PgBouncer, transaction mode) already
// multiplexes connections server-side — a large client-side pool just competes
// for a limited number of pooler slots, which is what causes the "works
// sometimes" timeouts. Keep max modest, release idle connections quickly, and
// give the handshake more room before giving up.
const poolTuning = {
  max: 10,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 20000,
  keepAlive: true,
};

// Prefer individual DB_* vars (avoids URL-encoding issues with special chars in passwords)
const config: PoolConfig = process.env.DB_HOST
  ? {
      host:     process.env.DB_HOST,
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'postgres',
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl,
      ...poolTuning,
    }
  : {
      connectionString: dbUrl,
      ssl,
      ...poolTuning,
    };

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
