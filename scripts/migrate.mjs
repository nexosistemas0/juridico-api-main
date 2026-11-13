import 'dotenv/config';
import {Pool} from 'pg';
import {readFile,readdir} from 'node:fs/promises';
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL é obrigatória.');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const db=await pool.connect();
try {
 await db.query('BEGIN');
 await db.query("SELECT pg_advisory_xact_lock(72910317)");
 await db.query('CREATE SCHEMA IF NOT EXISTS juridico_internal');
 await db.query('CREATE TABLE IF NOT EXISTS juridico_internal.migrations(name text primary key,applied_at timestamptz default now())');
 for(const file of (await readdir(new URL('../supabase/migrations/',import.meta.url))).filter(f=>f.endsWith('.sql')).sort()){
   const version=file.split('_')[0];
   let applied=(await db.query('SELECT 1 FROM juridico_internal.migrations WHERE name=$1',[file])).rowCount;
   if(!applied&&(await db.query("SELECT to_regclass('supabase_migrations.schema_migrations') AS name")).rows[0].name){
     applied=(await db.query('SELECT 1 FROM supabase_migrations.schema_migrations WHERE version=$1',[version])).rowCount;
   }
   if(applied){console.log('Already applied:',file);continue;}
   await db.query(await readFile(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
   await db.query('INSERT INTO juridico_internal.migrations(name) VALUES($1)',[file]);
   console.log('Applied:',file);
 }
 await db.query('COMMIT');
}catch(e){await db.query('ROLLBACK');throw e;}finally{db.release();await pool.end();}
