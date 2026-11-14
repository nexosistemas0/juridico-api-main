import {pool,transaction} from './db.js';
// Run periodically in a separate worker/cron; never from browser requests.
export async function sendReminders(fetcher:typeof fetch=fetch){
 if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)throw new Error('Configure RESEND_API_KEY e MAIL_FROM.');
 let sent=0;
 for(let i=0;i<100;i++){
 const handled=await transaction(async db=>{
 const {rows:[r]}=await db.query(`SELECT r.*,u.email FROM portal_hearing_reminders r JOIN hearings h ON h.id=r.id_hearing JOIN users u ON u.id=r.id_user WHERE r.sent_at IS NULL AND r.attempts<5 AND r.next_attempt_at<=now() AND r.revision=h.revision AND h.cancelled_at IS NULL AND ((h.date+h.hour) AT TIME ZONE 'America/Sao_Paulo')>now() AND ((h.date+h.hour) AT TIME ZONE 'America/Sao_Paulo')-h.reminder_minutes*interval '1 minute'<=now() ORDER BY r.id FOR UPDATE OF r SKIP LOCKED LIMIT 1`);
 if(!r)return false;
 // Lock the hearing too: cancellation/edit cannot race with dispatch.
 const {rows:[h]}=await db.query('SELECT * FROM hearings WHERE id=$1 FOR UPDATE',[r.id_hearing]);
 if(h.cancelled_at||h.revision!==r.revision)return false;
 try{
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':`martins-hearing-${r.id}`},body:JSON.stringify({from:process.env.MAIL_FROM,to:[r.email],subject:'Lembrete de audiência — Martins Advogados',text:`Você tem uma audiência em ${(h.date instanceof Date?h.date.toISOString():String(h.date)).slice(0,10)} às ${String(h.hour).slice(0,5)} (Brasília). Entre no portal Martins Advogados para conferir os detalhes. Em caso de dúvida, contate seu advogado.`})});
 if(!response.ok)throw new Error(`HTTP ${response.status}`);
 await db.query('UPDATE portal_hearing_reminders SET sent_at=now(),attempts=attempts+1,last_error=NULL WHERE id=$1',[r.id]);sent++;
 }catch{await db.query("UPDATE portal_hearing_reminders SET attempts=attempts+1,next_attempt_at=now()+interval '5 minutes',last_error='Falha no provedor de e-mail' WHERE id=$1",[r.id])}
 return true;
 });if(!handled)break;
 }return {sent};
}
