import app from './app.js';
import {pool} from './config/database.js';
if(!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL com a conexão PostgreSQL do Supabase.');
const server=app.listen(Number(process.env.PORT||3333),'0.0.0.0',()=>console.log('API jurídica iniciada.'));
async function shutdown(){server.close(async()=>{await pool.end();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
