import {Router} from 'express';
import * as yup from 'yup';
import {pool,transaction} from './db.js';
import {ApiError} from './datajud.js';
const text=(n=100)=>yup.string().trim().max(n).default('');
const shape=yup.object({id_costumer:yup.number().integer().positive().required(),id_process:yup.number().integer().positive().nullable().default(null),type:text().required(),date:yup.string().matches(/^\d{4}-\d{2}-\d{2}$/).required(),hour:yup.string().matches(/^([01]\d|2[0-3]):[0-5]\d$/).required(),place:text(),room:text(),meeting_link:text(255).test('https','Informe um link HTTPS válido.',v=>{if(!v)return true;try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password}catch{return false}}),guidelines:text(10000),duration_minutes:yup.number().integer().min(5).max(480).default(60),reminder_minutes:yup.number().integer().min(5).max(10080).default(1440)});
export const agenda=Router();
agenda.param('id',(_req,_res,next,value)=>{if(!/^[1-9]\d*$/.test(value)||Number(value)>2147483647)return next(new ApiError(400,'Identificador inválido.'));next()});
agenda.get('/hearings',async(_req,res)=>{const {rows}=await pool.query('SELECT h.*,p.title as process_title,p.process_num,u.name as client_name FROM hearings h LEFT JOIN process p ON p.id=h.id_process JOIN lawyers l ON l.id=h.id_lawyer JOIN costumers c ON c.id=h.id_costumer JOIN users u ON u.id=c.id_user WHERE (l.id_user=$1 OR c.id_user=$1) ORDER BY h.date,h.hour',[res.locals.user.id]);res.json(rows)});
async function save(req:any,res:any){
 const u=res.locals.user;if(u.type!=='adv'||!u.lawyer_id)throw new ApiError(403,'Acesso exclusivo do advogado.');
 const editing=req.method==='PATCH',routeProcess=req.params.processId?Number(req.params.processId):null;
 let body={...req.body};
 if(routeProcess){const {rows:[p]}=await pool.query('SELECT * FROM process WHERE id=$1 AND id_lawyer=$2',[routeProcess,u.lawyer_id]);if(!p)throw new ApiError(404,'Processo não encontrado.');body={...body,id_process:p.id,id_costumer:p.id_costumer}}
 if(editing){const {rows:[h]}=await pool.query('SELECT * FROM hearings WHERE id=$1 AND id_lawyer=$2',[req.params.id,u.lawyer_id]);if(!h)throw new ApiError(404,'Audiência não encontrada.');body={id_process:h.id_process,id_costumer:h.id_costumer,duration_minutes:h.duration_minutes,reminder_minutes:h.reminder_minutes,...body}}
 const d=await shape.validate(body,{stripUnknown:true});
 const start=new Date(`${d.date}T${d.hour}:00-03:00`);
 if(!Number.isFinite(start.getTime())||new Date(`${d.date}T12:00:00Z`).toISOString().slice(0,10)!==d.date)throw new ApiError(400,'Data inválida.');
 if(!d.place&&!d.meeting_link)throw new ApiError(400,'Informe o local ou o link da audiência.');
 const result=await transaction(async db=>{
 // Locks serialize scheduling for the same lawyer and the same client, including concurrent requests.
 await db.query('SELECT id FROM lawyers WHERE id=$1 FOR UPDATE',[u.lawyer_id]);
 const {rows:[client]}=await db.query('SELECT c.* FROM costumers c JOIN portal_lawyer_clients lc ON lc.id_costumer=c.id WHERE c.id=$1 AND lc.id_lawyer=$2 FOR UPDATE OF c',[d.id_costumer,u.lawyer_id]);if(!client)throw new ApiError(404,'Cliente não encontrado.');
 if(d.id_process){const {rows:[p]}=await db.query('SELECT id FROM process WHERE id=$1 AND id_lawyer=$2 AND id_costumer=$3',[d.id_process,u.lawyer_id,d.id_costumer]);if(!p)throw new ApiError(400,'O processo não pertence a este cliente.');}
 if(editing){const {rows:[h]}=await db.query('SELECT cancelled_at FROM hearings WHERE id=$1 AND id_lawyer=$2 FOR UPDATE',[req.params.id,u.lawyer_id]);if(!h||h.cancelled_at)throw new ApiError(409,'Audiência cancelada ou indisponível.');}
 const {rows:conflicts}=await db.query(`SELECT id FROM hearings WHERE cancelled_at IS NULL AND (id_lawyer=$1 OR id_costumer=$2) AND id<>$3 AND (date+hour) < $4::timestamp + $5*interval '1 minute' AND (date+hour)+duration_minutes*interval '1 minute' > $4::timestamp LIMIT 1`,[u.lawyer_id,d.id_costumer,editing?Number(req.params.id):0,`${d.date} ${d.hour}`,d.duration_minutes]);
 if(conflicts.length)throw new ApiError(409,'Conflito de horário na agenda do advogado ou do cliente.');
 const values=[d.id_process,u.lawyer_id,d.id_costumer,d.type,d.date,d.hour,d.place,d.room,d.meeting_link,d.guidelines,d.duration_minutes,d.reminder_minutes];
 const {rows:[h]}=editing?await db.query('UPDATE hearings SET id_process=$1,id_lawyer=$2,id_costumer=$3,type=$4,date=$5,hour=$6,place=$7,room=$8,meeting_link=$9,guidelines=$10,duration_minutes=$11,reminder_minutes=$12,revision=revision+1 WHERE id=$13 RETURNING *',[...values,req.params.id]):await db.query('INSERT INTO hearings(id_process,id_lawyer,id_costumer,type,date,hour,place,room,meeting_link,guidelines,duration_minutes,reminder_minutes) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *',values);
 for(const recipient of [u.id,client.id_user])await db.query('INSERT INTO portal_hearing_reminders(id_hearing,revision,id_user) VALUES($1,$2,$3)',[h.id,h.revision,recipient]);
 await db.query('INSERT INTO notifications(id_user,title,description) VALUES($1,$2,$3)',[client.id_user,editing?'Audiência atualizada':'Audiência agendada',`${d.type} — ${d.date} às ${d.hour} (Brasília).`]);return h;
 });res.status(editing?200:201).json(result);
}
agenda.post('/hearings',save);agenda.post('/processes/:processId/hearings',save);agenda.patch('/hearings/:id',save);
agenda.delete('/hearings/:id',async(req,res)=>{const u=res.locals.user;if(u.type!=='adv')throw new ApiError(403,'Acesso exclusivo do advogado.');await transaction(async db=>{await db.query('SELECT id FROM lawyers WHERE id=$1 FOR UPDATE',[u.lawyer_id]);const {rows:[h]}=await db.query('UPDATE hearings SET cancelled_at=now(),revision=revision+1 WHERE id=$1 AND id_lawyer=$2 AND cancelled_at IS NULL RETURNING *',[req.params.id,u.lawyer_id]);if(!h)throw new ApiError(404,'Audiência não encontrada.');await db.query("INSERT INTO notifications(id_user,title,description) SELECT id_user,'Audiência cancelada',$1 FROM costumers WHERE id=$2",[h.type,h.id_costumer])});res.status(204).end()});
