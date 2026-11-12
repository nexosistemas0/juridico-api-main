import { Router, type Request, type Response, type NextFunction } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import bcrypt from 'bcrypt';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import * as yup from 'yup';
import { pool, transaction } from './db.js';
import { ApiError, lookup, normalizeNumber, inferTribunal, tribunals } from './datajud.js';

const router = Router();
const digest = (s:string) => createHash('sha256').update(s).digest('hex');
const id = (v:unknown) => { const n=Number(v); if (!Number.isSafeInteger(n)||n<1||n>2147483647) throw new ApiError(400,'Identificador inválido.'); return n; };
const field = () => yup.string().trim().max(100);
const email = () => yup.string().trim().lowercase().email().max(150).required();
const password = () => yup.string().min(10).max(72).test('bytes','A senha pode ter até 72 bytes.',v=>!v||Buffer.byteLength(v,'utf8')<=72).required();
async function validate(shape: Record<string,any>, body:unknown) { return yup.object(shape).noUnknown().validate(body,{abortEarly:false,stripUnknown:true}); }
const safeUser = 'id, name, email, phone, type';
const authLimit = rateLimit({windowMs:15*60*1000,limit:30,standardHeaders:'draft-7',legacyHeaders:false,message:{message:'Muitas tentativas. Aguarde alguns minutos.'}});
const queryLimit = rateLimit({windowMs:60*1000,limit:15,standardHeaders:'draft-7',legacyHeaders:false,message:{message:'Aguarde um minuto antes de consultar novamente.'}});
const cookieName = 'juridico_session';
function cookieToken(req:Request) { return req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith(`${cookieName}=`))?.slice(cookieName.length+1) || ''; }
function cookie(res:Response, value:string, clear=false) { res.cookie(cookieName,value,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax',path:'/api',maxAge:clear ? 0 : 86400000}); }
async function session(userId:number,res:Response) {
  const token=randomBytes(32).toString('hex');
  await pool.query("INSERT INTO portal_sessions(token_hash,id_user,expires_at) VALUES($1,$2,now()+interval '1 day')",[digest(token),userId]);
  cookie(res,token);
}
router.use((req,res,next)=>{
  res.setHeader('Cache-Control','no-store');
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers['x-requested-with'] !== 'juridico-app') return next(new ApiError(403,'Origem da requisição inválida.'));
  next();
});
router.get('/health',async (_req,res)=>{ await pool.query('select 1'); res.json({status:'ok'}); });
router.post('/auth/register',authLimit,async(req,res)=>{
  const d=await validate({name:field().min(2).required(),email:email(),password:password(),phone:field().max(20).default(''),oab:field().max(30).min(3).required()},req.body);
  const hash=await bcrypt.hash(d.password,12);
  const user=await transaction(async db=>{
    const {rows:[u]}=await db.query(`INSERT INTO users(name,email,phone,password,type) VALUES($1,$2,$3,$4,'adv') RETURNING ${safeUser}`,[d.name,d.email,d.phone,hash]);
    await db.query("INSERT INTO lawyers(id_user,oab,position,whatsapp,photo) VALUES($1,$2,'Advogado',$3,'')",[u.id,d.oab,d.phone]);
    return u;
  });
  await session(user.id,res); res.status(201).json(user);
});
router.post('/auth/login',authLimit,async(req,res)=>{
  const d=await validate({email:email(),password:yup.string().max(72).required()},req.body);
  const {rows:[user]}=await pool.query('SELECT * FROM users WHERE lower(email)=$1',[d.email]);
  if (!user || !await bcrypt.compare(d.password,user.password || '')) throw new ApiError(401,'E-mail ou senha incorretos.');
  await session(user.id,res); const {password:_,...safe}=user; res.json(safe);
});
router.post('/auth/activate',authLimit,async(req,res)=>{
  const d=await validate({token:yup.string().matches(/^[a-f0-9]{64}$/).required(),password:password()},req.body);
  const hash=await bcrypt.hash(d.password,12);
  const user=await transaction(async db=>{
    const {rows:[invite]}=await db.query('SELECT * FROM portal_invites WHERE token_hash=$1 AND used_at IS NULL AND expires_at>now() FOR UPDATE',[digest(d.token)]);
    if (!invite) throw new ApiError(400,'Convite inválido ou expirado. Solicite outro ao advogado.');
    const {rows:[u]}=await db.query(`UPDATE users SET password=$1 WHERE id=$2 RETURNING ${safeUser}`,[hash,invite.id_user]);
    await db.query('UPDATE portal_invites SET used_at=now() WHERE id_user=$1',[u.id]);
    await db.query('DELETE FROM portal_sessions WHERE id_user=$1',[u.id]);
    return u;
  });
  await session(user.id,res); res.json(user);
});
router.use(async(req,res,next)=>{
  const token=cookieToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) throw new ApiError(401,'Faça login para continuar.');
  const {rows:[user]}=await pool.query(`SELECT u.id,u.name,u.email,u.phone,u.type,l.id as lawyer_id,c.id as client_id
    FROM portal_sessions s JOIN users u ON u.id=s.id_user LEFT JOIN lawyers l ON l.id_user=u.id LEFT JOIN costumers c ON c.id_user=u.id
    WHERE s.token_hash=$1 AND s.expires_at>now()`,[digest(token)]);
  if (!user) throw new ApiError(401,'Sua sessão expirou. Entre novamente.');
  res.locals.user=user; next();
});
router.get('/auth/me',(_req,res)=>res.json(res.locals.user));
router.post('/auth/logout',async(req,res)=>{ await pool.query('DELETE FROM portal_sessions WHERE token_hash=$1',[digest(cookieToken(req))]);cookie(res,'',true);res.status(204).end(); });
router.patch('/account',async(req,res)=>{
  const d=await validate({name:field().min(2).required(),phone:field().max(20).default('')},req.body);
  const {rows:[u]}=await pool.query(`UPDATE users SET name=$1,phone=$2 WHERE id=$3 RETURNING ${safeUser}`,[d.name,d.phone,res.locals.user.id]);res.json(u);
});
router.post('/account/password',authLimit,async(req,res)=>{
  const d=await validate({currentPassword:yup.string().required(),password:password()},req.body);
  const {rows:[u]}=await pool.query('SELECT password FROM users WHERE id=$1',[res.locals.user.id]);
  if (!await bcrypt.compare(d.currentPassword,u.password)) throw new ApiError(400,'Senha atual incorreta.');
  const hash=await bcrypt.hash(d.password,12);
  await transaction(async db=>{await db.query('UPDATE users SET password=$1 WHERE id=$2',[hash,res.locals.user.id]);await db.query('DELETE FROM portal_sessions WHERE id_user=$1',[res.locals.user.id]);});
  await session(res.locals.user.id,res);res.status(204).end();
});
function lawyer(_req:Request,res:Response,next:NextFunction) { if (res.locals.user.type!=='adv'||!res.locals.user.lawyer_id) throw new ApiError(403,'Acesso exclusivo do advogado.'); next(); }
async function accessibleProcess(processId:number,user:any,write=false) {
  const {rows:[p]}=await pool.query(`SELECT p.*,c.id_user as client_user_id,l.id_user as lawyer_user_id FROM process p JOIN costumers c ON c.id=p.id_costumer JOIN lawyers l ON l.id=p.id_lawyer
    WHERE p.id=$1 AND (l.id_user=$2 ${write?'':'OR c.id_user=$2'})`,[processId,user.id]);
  if (!p) throw new ApiError(404,'Processo não encontrado.'); return p;
}
async function ownedClient(clientId:number,lawyerId:number) {
  const {rows:[c]}=await pool.query('SELECT c.* FROM costumers c JOIN portal_lawyer_clients lc ON lc.id_costumer=c.id WHERE c.id=$1 AND lc.id_lawyer=$2',[clientId,lawyerId]);
  if (!c) throw new ApiError(404,'Cliente não encontrado.'); return c;
}
async function notify(db:any,userId:number,title:string,description:string) { await db.query('INSERT INTO notifications(id_user,title,description) VALUES($1,$2,$3)',[userId,title,description]); }
router.get('/clients',lawyer,async(_req,res)=>{
  const {rows}=await pool.query(`SELECT c.*,u.name,u.email,u.phone,EXISTS(SELECT 1 FROM portal_invites i WHERE i.id_user=u.id AND i.used_at IS NOT NULL) AS activated
    FROM costumers c JOIN users u ON u.id=c.id_user JOIN portal_lawyer_clients lc ON lc.id_costumer=c.id WHERE lc.id_lawyer=$1 ORDER BY u.name`,[res.locals.user.lawyer_id]);res.json(rows);
});
const clientShape={name:field().min(2).required(),email:email(),phone:field().max(20).default(''),cpf:yup.string().matches(/^\d{11}$/,'CPF deve ter 11 dígitos.').required(),date:yup.string().matches(/^\d{4}-\d{2}-\d{2}$/).required(),address:field().default('')};
router.post('/clients',lawyer,async(req,res)=>{
  const d=await validate(clientShape,req.body),token=randomBytes(32).toString('hex');
  const hash=await bcrypt.hash(randomBytes(48).toString('hex'),12);
  const client=await transaction(async db=>{
    const {rows:[u]}=await db.query("INSERT INTO users(name,email,phone,password,type) VALUES($1,$2,$3,$4,'costumer') RETURNING id",[d.name,d.email,d.phone,hash]);
    const {rows:[c]}=await db.query('INSERT INTO costumers(id_user,cpf,date,address) VALUES($1,$2,$3,$4) RETURNING *',[u.id,d.cpf,d.date,d.address]);
    await db.query('INSERT INTO portal_lawyer_clients(id_lawyer,id_costumer) VALUES($1,$2)',[res.locals.user.lawyer_id,c.id]);
    await db.query("INSERT INTO portal_invites(id_user,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')",[u.id,digest(token)]);
    return {...c,name:d.name,email:d.email,phone:d.phone};
  });
  res.status(201).json({client,activationPath:`/ativar#${token}`});
});
router.patch('/clients/:id',lawyer,async(req,res)=>{
  const c=await ownedClient(id(req.params.id),res.locals.user.lawyer_id);
  const d=await validate({name:field().min(2).required(),phone:field().max(20).default(''),address:field().default('')},req.body);
  await transaction(async db=>{await db.query('UPDATE users SET name=$1,phone=$2 WHERE id=$3',[d.name,d.phone,c.id_user]);await db.query('UPDATE costumers SET address=$1 WHERE id=$2',[d.address,c.id]);});res.json({id:c.id,...d});
});
router.post('/clients/:id/invite',lawyer,async(req,res)=>{
  const c=await ownedClient(id(req.params.id),res.locals.user.lawyer_id),token=randomBytes(32).toString('hex');
  await transaction(async db=>{
    const {rows:[u]}=await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[c.id_user]);
    const {rows}=await db.query('SELECT id FROM portal_invites WHERE id_user=$1 AND used_at IS NOT NULL LIMIT 1',[u.id]);
    if (rows.length) throw new ApiError(409,'O cliente já ativou a conta. Não é possível redefinir a senha pelo advogado.');
    await db.query('DELETE FROM portal_invites WHERE id_user=$1',[u.id]);
    await db.query("INSERT INTO portal_invites(id_user,token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')",[u.id,digest(token)]);
  });res.json({activationPath:`/ativar#${token}`});
});
router.get('/tribunals',(_req,res)=>res.json(tribunals));
router.post('/processes/search',lawyer,queryLimit,async(req,res)=>res.json(await lookup(req.body.number,req.body.tribunal)));
const processShape={process_num:yup.string().required(),title:field().min(2).required(),id_costumer:yup.number().integer().positive().required(),status:field().default('Em andamento'),area:field().default(''),court:field().default(''),observations:yup.string().max(10000).default(''),tribunal:yup.string().oneOf(tribunals).optional()};
router.get('/processes',async(req,res)=>{
  const {rows}=await pool.query(`SELECT p.*,u.name as client_name,lu.name as lawyer_name FROM process p JOIN costumers c ON c.id=p.id_costumer JOIN users u ON u.id=c.id_user JOIN lawyers l ON l.id=p.id_lawyer JOIN users lu ON lu.id=l.id_user WHERE (c.id_user=$1 OR l.id_user=$1) ORDER BY p.last_update DESC NULLS LAST,p.id DESC`,[res.locals.user.id]);res.json(rows);
});
router.post('/processes',lawyer,async(req,res)=>{
  const d=await validate(processShape,req.body),n=normalizeNumber(d.process_num); await ownedClient(d.id_costumer,res.locals.user.lawyer_id);
  const {rows:[p]}=await pool.query(`INSERT INTO process(process_num,title,id_costumer,id_lawyer,status,area,last_update,court,observations,datajud_tribunal) VALUES($1,$2,$3,$4,$5,$6,now(),$7,$8,$9) RETURNING *`,[n,d.title,d.id_costumer,res.locals.user.lawyer_id,d.status,d.area,d.court,d.observations,d.tribunal||inferTribunal(n)||null]);res.status(201).json(p);
});
router.get('/processes/:id',async(req,res)=>{
  const p=await accessibleProcess(id(req.params.id),res.locals.user);
  const [movements,hearings,documents]=await Promise.all([
    pool.query('SELECT * FROM movements WHERE id_process=$1 ORDER BY date DESC,id DESC',[p.id]),
    pool.query('SELECT * FROM hearings WHERE id_process=$1 ORDER BY date,hour',[p.id]),
    pool.query('SELECT id,id_process,name,status,date_sed,date_ass,mime_type FROM documents WHERE id_process=$1 ORDER BY id DESC',[p.id])]);
  res.json({...p,movements:movements.rows,hearings:hearings.rows,documents:documents.rows});
});
router.patch('/processes/:id',lawyer,async(req,res)=>{
  const p=await accessibleProcess(id(req.params.id),res.locals.user,true);
  const d=await validate({title:field().min(2).required(),status:field().required(),area:field().default(''),court:field().default(''),observations:yup.string().max(10000).default('')},req.body);
  const {rows:[result]}=await pool.query('UPDATE process SET title=$1,status=$2,area=$3,court=$4,observations=$5,last_update=now() WHERE id=$6 RETURNING *',[d.title,d.status,d.area,d.court,d.observations,p.id]);res.json(result);
});
router.post('/processes/:id/sync',lawyer,queryLimit,async(req,res)=>{
  const p=await accessibleProcess(id(req.params.id),res.locals.user,true);
  if(p.datajud_checked_at && Date.now()-new Date(p.datajud_checked_at).getTime()<60000) throw new ApiError(429,'Aguarde um minuto entre atualizações deste processo.');
  const data=await lookup(p.process_num,p.datajud_tribunal);
  const inserted=await transaction(async db=>{
    await db.query('SELECT id FROM process WHERE id=$1 FOR UPDATE',[p.id]);
    let count=0;
    for(const m of data.movements) {const r=await db.query("INSERT INTO movements(id_process,date,title,description,source,external_key,source_occurred_at) VALUES($1,$2,$3,$4,'datajud',$5,$6) ON CONFLICT(id_process,external_key) DO NOTHING",[p.id,m.date,m.title,m.description,m.key,m.date]);count+=r.rowCount||0;}
    await db.query('UPDATE process SET datajud_checked_at=now(),datajud_updated_at=$1,last_update=now() WHERE id=$2',[data.updatedAt,p.id]);
    if(count) await notify(db,p.client_user_id,'Atualizações no seu processo',`${count} movimentação(ões) importada(s) do CNJ / DataJud: ${p.title}`);
    return count;
  });res.json({inserted,source:data.source,checkedAt:new Date().toISOString(),sourceUpdatedAt:data.updatedAt});
});
const movementShape={title:field().required(),description:yup.string().max(10000).required(),date:yup.date().required()};
router.post('/processes/:id/movements',lawyer,async(req,res)=>{
  const p=await accessibleProcess(id(req.params.id),res.locals.user,true),d=await validate(movementShape,req.body);
  const result=await transaction(async db=>{const {rows:[m]}=await db.query("INSERT INTO movements(id_process,date,title,description,source) VALUES($1,$2,$3,$4,'manual') RETURNING *",[p.id,d.date,d.title,d.description]);await notify(db,p.client_user_id,'Nova atualização do advogado',d.title);return m;});res.status(201).json(result);
});
router.patch('/movements/:id',lawyer,async(req,res)=>{
  const {rows:[m]}=await pool.query('SELECT * FROM movements WHERE id=$1',[id(req.params.id)]);if(!m)throw new ApiError(404,'Movimentação não encontrada.');await accessibleProcess(m.id_process,res.locals.user,true);
  if(m.source==='datajud')throw new ApiError(409,'Movimentações oficiais não podem ser editadas.');const d=await validate(movementShape,req.body);
  const {rows:[result]}=await pool.query('UPDATE movements SET title=$1,description=$2,date=$3 WHERE id=$4 RETURNING *',[d.title,d.description,d.date,m.id]);res.json(result);
});
router.delete('/movements/:id',lawyer,async(req,res)=>{
  const {rows:[m]}=await pool.query('SELECT * FROM movements WHERE id=$1',[id(req.params.id)]);if(!m)throw new ApiError(404,'Movimentação não encontrada.');await accessibleProcess(m.id_process,res.locals.user,true);if(m.source==='datajud')throw new ApiError(409,'Movimentações oficiais não podem ser removidas.');await pool.query('DELETE FROM movements WHERE id=$1',[m.id]);res.status(204).end();
});
const hearingShape={type:field().required(),date:yup.string().matches(/^\d{4}-\d{2}-\d{2}$/).required(),hour:yup.string().matches(/^([01]\d|2[0-3]):[0-5]\d$/).required(),place:field().default(''),room:field().default(''),meeting_link:yup.string().max(255).test('url','Use um link HTTPS.',v=>!v||/^https:\/\//i.test(v)).default(''),guidelines:yup.string().max(10000).default('')};
router.get('/hearings',async(_req,res)=>{const {rows}=await pool.query('SELECT h.*,p.title as process_title,p.process_num FROM hearings h JOIN process p ON p.id=h.id_process JOIN lawyers l ON l.id=p.id_lawyer JOIN costumers c ON c.id=p.id_costumer WHERE l.id_user=$1 OR c.id_user=$1 ORDER BY h.date,h.hour',[res.locals.user.id]);res.json(rows);});
router.post('/processes/:id/hearings',lawyer,async(req,res)=>{
  const p=await accessibleProcess(id(req.params.id),res.locals.user,true),d=await validate(hearingShape,req.body);
  const result=await transaction(async db=>{const {rows:[h]}=await db.query('INSERT INTO hearings(id_process,type,date,hour,place,room,meeting_link,guidelines) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[p.id,d.type,d.date,d.hour,d.place,d.room,d.meeting_link,d.guidelines]);await notify(db,p.client_user_id,'Audiência agendada',`${d.type} — ${d.date} às ${d.hour} (Brasília).`);return h;});res.status(201).json(result);
});
router.patch('/hearings/:id',lawyer,async(req,res)=>{
  const {rows:[h]}=await pool.query('SELECT * FROM hearings WHERE id=$1',[id(req.params.id)]);if(!h)throw new ApiError(404,'Audiência não encontrada.');const p=await accessibleProcess(h.id_process,res.locals.user,true),d=await validate(hearingShape,req.body);
  const result=await transaction(async db=>{const {rows:[r]}=await db.query('UPDATE hearings SET type=$1,date=$2,hour=$3,place=$4,room=$5,meeting_link=$6,guidelines=$7 WHERE id=$8 RETURNING *',[d.type,d.date,d.hour,d.place,d.room,d.meeting_link,d.guidelines,h.id]);await notify(db,p.client_user_id,'Audiência atualizada',`${d.type} — ${d.date} às ${d.hour} (Brasília).`);return r;});res.json(result);
});
router.delete('/hearings/:id',lawyer,async(req,res)=>{const {rows:[h]}=await pool.query('SELECT * FROM hearings WHERE id=$1',[id(req.params.id)]);if(!h)throw new ApiError(404,'Audiência não encontrada.');const p=await accessibleProcess(h.id_process,res.locals.user,true);await transaction(async db=>{await db.query('DELETE FROM hearings WHERE id=$1',[h.id]);await notify(db,p.client_user_id,'Audiência cancelada',h.type);});res.status(204).end();});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1,fields:5}});
router.post('/processes/:id/documents',lawyer,upload.single('file'),async(req,res)=>{
  const p=await accessibleProcess(id(req.params.id),res.locals.user,true),f=req.file;
  if(!f)throw new ApiError(400,'Selecione um arquivo PDF, PNG ou JPEG (até 5 MB).');
  const signature=f.buffer.subarray(0,8).toString('hex');
  const mime=f.buffer.subarray(0,5).toString()==='%PDF-'?'application/pdf':signature==='89504e470d0a1a0a'?'image/png':signature.startsWith('ffd8ff')?'image/jpeg':null;
  if(!mime)throw new ApiError(400,'Arquivo não permitido. Use PDF, PNG ou JPEG.');
  const name=String(req.body.name||f.originalname).slice(0,100);
  const result=await transaction(async db=>{const {rows:[d]}=await db.query("INSERT INTO documents(id_process,name,file,status,date_sed,date_ass,mime_type) VALUES($1,$2,$3,'Disponível',now(),NULL,$4) RETURNING id,name,status",[p.id,name,f.buffer,mime]);await notify(db,p.client_user_id,'Novo documento',name);return d;});res.status(201).json(result);
});
router.get('/documents/:id/download',async(req,res)=>{
  const {rows:[d]}=await pool.query('SELECT * FROM documents WHERE id=$1',[id(req.params.id)]);if(!d)throw new ApiError(404,'Documento não encontrado.');await accessibleProcess(d.id_process,res.locals.user);
  res.setHeader('Content-Type',d.mime_type||'application/octet-stream');res.setHeader('X-Content-Type-Options','nosniff');res.attachment(d.name.replace(/[\r\n"\\/]/g,'_'));if(!d.file)throw new ApiError(404,'Conteúdo indisponível. Solicite novo envio ao advogado.');res.send(d.file);
});
router.delete('/documents/:id',lawyer,async(req,res)=>{const {rows:[d]}=await pool.query('SELECT id_process FROM documents WHERE id=$1',[id(req.params.id)]);if(!d)throw new ApiError(404,'Documento não encontrado.');await accessibleProcess(d.id_process,res.locals.user,true);await pool.query('DELETE FROM documents WHERE id=$1',[id(req.params.id)]);res.status(204).end();});
router.get('/processes/:id/messages',async(req,res)=>{const p=await accessibleProcess(id(req.params.id),res.locals.user);const before=req.query.before?id(req.query.before):2147483647;const {rows}=await pool.query('SELECT m.*,u.name as sender_name FROM portal_messages m JOIN users u ON u.id=m.id_sender WHERE m.id_process=$1 AND m.id<$2 ORDER BY m.id DESC LIMIT 100',[p.id,before]);res.json(rows.reverse());});
router.post('/processes/:id/messages',async(req,res)=>{
  const p=await accessibleProcess(id(req.params.id),res.locals.user),d=await validate({body:yup.string().trim().min(1).max(5000).required()},req.body);
  const result=await transaction(async db=>{const {rows:[m]}=await db.query('INSERT INTO portal_messages(id_process,id_sender,body) VALUES($1,$2,$3) RETURNING *',[p.id,res.locals.user.id,d.body]);await notify(db,p.client_user_id===res.locals.user.id?p.lawyer_user_id:p.client_user_id,'Nova mensagem',`Você recebeu uma mensagem em ${p.title}.`);return m;});res.status(201).json(result);
});
router.get('/notifications',async(_req,res)=>{const {rows}=await pool.query('SELECT *,date as created_at FROM notifications WHERE id_user=$1 ORDER BY id DESC LIMIT 100',[res.locals.user.id]);res.json(rows);});
router.patch('/notifications/:id/read',async(req,res)=>{const {rows:[n]}=await pool.query('UPDATE notifications SET read=true WHERE id=$1 AND id_user=$2 RETURNING *',[id(req.params.id),res.locals.user.id]);if(!n)throw new ApiError(404,'Notificação não encontrada.');res.json(n);});
router.delete('/notifications/:id',async(req,res)=>{const r=await pool.query('DELETE FROM notifications WHERE id=$1 AND id_user=$2',[id(req.params.id),res.locals.user.id]);if(!r.rowCount)throw new ApiError(404,'Notificação não encontrada.');res.status(204).end();});
router.use((_req,_res,next)=>next(new ApiError(404,'Rota não encontrada.')));
router.use((error:any,_req:Request,res:Response,_next:NextFunction)=>{
  if(error instanceof ApiError)return res.status(error.status).json({message:error.message});
  if(error instanceof yup.ValidationError)return res.status(400).json({message:error.errors.join(' ')});
  if(error instanceof multer.MulterError)return res.status(400).json({message:'Arquivo inválido ou maior que 5 MB.'});
  if(error.code==='23505')return res.status(409).json({message:'Já existe um cadastro com estes dados.'});
  if(error.code==='23503')return res.status(409).json({message:'Este registro está vinculado a outros dados.'});
  if(error.code==='22007'||error.code==='22008')return res.status(400).json({message:'Data ou horário inválido.'});
  console.error('Portal request failed:',error.code||error.name);return res.status(500).json({message:'Não foi possível concluir a operação. Tente novamente.'});
});
export default router;
