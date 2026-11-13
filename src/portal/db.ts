import pool from '../config/database.js';
import type { PoolClient } from 'pg';
export async function transaction<T>(fn: (db: PoolClient)=>Promise<T>): Promise<T> {
  const db = await pool.connect();
  try { await db.query('BEGIN'); const result = await fn(db); await db.query('COMMIT'); return result; }
  catch (err) { await db.query('ROLLBACK'); throw err; }
  finally { db.release(); }
}
export { pool };
