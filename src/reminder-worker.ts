import 'dotenv/config';
import {sendReminders} from './portal/reminders.js';
import {pool} from './portal/db.js';
try{console.log(await sendReminders())}catch{console.error('Falha ao executar lembretes. Confira banco e configuração do provedor.');process.exitCode=1}finally{await pool.end()}
