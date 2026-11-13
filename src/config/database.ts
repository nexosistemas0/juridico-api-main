import { Pool, types } from 'pg';
// Keep date-only values date-only (avoid shifting a hearing to the previous day).
types.setTypeParser(1082, value => value);
import 'dotenv/config';
export const pool=new Pool({connectionString:process.env.DATABASE_URL,max:10,connectionTimeoutMillis:10000,idleTimeoutMillis:30000});
pool.on('error',err=>console.error('PostgreSQL pool error:',err.name));
export default pool;
