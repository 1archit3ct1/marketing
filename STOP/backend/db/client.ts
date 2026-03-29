/**
 * AURA Database Client
 * PostgreSQL connection with connection pooling
 */

import { Pool, PoolClient, QueryResult } from 'pg';

// Environment variables
const DATABASE_URL = process.env.DATABASE_URL!;
const POOL_SIZE = parseInt(process.env.DATABASE_POOL_SIZE || '10');
const POOL_IDLE_TIMEOUT = parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000');
const POOL_CONNECTION_TIMEOUT = parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000');

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: POOL_SIZE,
  idleTimeoutMillis: POOL_IDLE_TIMEOUT,
  connectionTimeoutMillis: POOL_CONNECTION_TIMEOUT,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Pool event handlers
pool.on('connect', () => {
  console.log('Database client connected');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

/**
 * Execute a query with parameters
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  const start = Date.now();
  
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Executed query', { text: text.substring(0, 100), duration, rows: result.rowCount });
    }
    
    return result;
  } catch (error) {
    console.error('Query error:', { text: text.substring(0, 100), error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Close all connections in the pool
 */
export async function closePool(): Promise<void> {
  await pool.end();
  console.log('Database pool closed');
}

/**
 * Health check
 */
export async function healthCheck(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

export default {
  query,
  getClient,
  transaction,
  closePool,
  healthCheck
};
