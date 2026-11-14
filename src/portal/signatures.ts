import { Router } from 'express';
import { randomBytes, createHash } from 'node:crypto';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as yup from 'yup';
import rateLimit from 'express-rate-limit';
import {pool,transaction} from './db.js';
import {ApiError} from './datajud.js';
export const signatureTerms='Declaro que li integralmente esta procuração, confirmo minha identidade e concordo em assiná-la eletronicamente. Autorizo o registro de data, hora, IP e dispositivo como evidências deste ato.';
const hash=(s:string|Uint8Array)=>createHash('sha256').update(s).digest('hex');
const tokenOf=(req:any)=>{const t=req.headers['x-signature-token'];if(typeof t!=='string'||!/^[a-f0-9]{64}$/.test(t))throw new ApiError(404,'Link inválido.');return hash(t)};
const columns="id,id_costumer,title,expires_at,signed_at,created_at,original_hash,signed_hash,CASE WHEN signed_at IS NOT NULL THEN 'assinada' WHEN expires_at<=now() THEN 'expirada' ELSE 'pendente' END AS status";
async function audit(db:any,req:any,action:string,resource:number,userId?:number){await db.query('INSERT INTO portal_access_logs(id_user,action,resource_id,ip,device) VALUES($1,$2,$3,$4,$5)',[userId||null,action,resource,String(req.ip||'').slice(0,64),String(req.headers['user-agent']||'').slice(0,500)])}
export async function makePdf(title:string,body:string,evidence?:any,original?:Uint8Array){
 const pdf=original?await PDFDocument.load(original):await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.Helvetica);
 let page=original?pdf.getPages()[0]:pdf.addPage([595,842]),y=790;
 const line=(s:string)=>{if(y<60){page=pdf.addPage([595,842]);y=790}page.drawText(s,{x:45,y,size:11,font});y-=17};
 // Reject unsupported glyphs instead of silently changing the signed text.
 try{font.encodeText(title+body+(evidence?.name||''))}catch{throw new ApiError(400,'O texto contém caracteres não suportados no PDF. Use letras, números e pontuação comum.');}
 for(const paragraph of (original?[]:(title+'\n\n'+body).split('\n'))){let current='';for(const word of paragraph.split(/\s+/)){for(const char of (current?' ':'')+word){if(font.widthOfTextAtSize(current+char,11)>505){line(current);current=''}current+=char}}line(current)}
 if(evidence){page=pdf.addPage([595,842]);y=790;line('Registro de assinatura eletrônica simples');line('');
 for(const s of [evidence.name,evidence.time,'Método: '+evidence.mode,'IP: '+evidence.ip,'Documento original SHA-256:',evidence.originalHash,'Termos: versão 1'])line(s);
 for(const s of signatureTerms.match(/.{1,80}(?:\s|$)|.{1,80}/g)||[])line(s.trim());
 line('Dispositivo:');for(const s of evidence.device.match(/.{1,75}/g)||[])line(s.replace(/[^\x20-\x7e]/g,'?'));
 if(evidence.mode==='draw'){for(const stroke of evidence.strokes)for(let i=1;i<stroke.length;i++)page.drawLine({start:{x:45+stroke[i-1][0]*.8,y:180-stroke[i-1][1]*.8},end:{x:45+stroke[i][0]*.8,y:180-stroke[i][1]*.8},thickness:1.5,color:rgb(.1,.2,.2)})}
 else page.drawText(evidence.name,{x:45,y:130,size:18,font});
 }
 return Buffer.from(await pdf.save());
}
export const publicSignatures=Router();
publicSignatures.use('/signature',rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-7',legacyHeaders:false}));
publicSignatures.get('/signature',async(req,res)=>{const {rows:[s]}=await pool.query(`SELECT ${columns},body FROM portal_signatures WHERE token_hash=$1`,[tokenOf(req)]);if(!s)throw new ApiError(404,'Link inválido.');if(s.status!=='pendente')throw new ApiError(410,`Procuração ${s.status}.`);await audit(pool,req,'signature.view',s.id);res.json({...s,terms:signatureTerms,termsVersion:1})});
publicSignatures.get('/signature/original',async(req,res)=>{const {rows:[s]}=await pool.query('SELECT id,original_pdf FROM portal_signatures WHERE token_hash=$1 AND signed_at IS NULL AND expires_at>now()',[tokenOf(req)]);if(!s)throw new ApiError(410,'Link inválido ou expirado.');await audit(pool,req,'signature.original',s.id);res.type('pdf').send(s.original_pdf)});
publicSignatures.post('/signature',async(req,res)=>{
 const d=await yup.object({name:yup.string().trim().min(3).max(150).required(),accepted:yup.boolean().oneOf([true]).required(),termsVersion:yup.number().oneOf([1]).required(),originalHash:yup.string().matches(/^[a-f0-9]{64}$/).required(),mode:yup.string().oneOf(['typed','draw']).required(),strokes:yup.array().max(100).of(yup.array().min(2).max(400).of(yup.array().length(2).of(yup.number().min(0).max(600).required()).required()).required()).default([])}).validate(req.body,{stripUnknown:true});
 if(d.mode==='draw'&&(!d.strokes.some(stroke=>stroke.some(point=>Math.hypot(point[0]-stroke[0][0],point[1]-stroke[0][1])>5))||!d.strokes.length||JSON.stringify(d.strokes).length>45000))throw new ApiError(400,'Desenhe sua assinatura.');
 for(const stroke of d.strokes)for(const point of stroke)if(point[1]>180)throw new ApiError(400,'Assinatura fora da área.');
 const result=await transaction(async db=>{
 const {rows:[s]}=await db.query('SELECT * FROM portal_signatures WHERE token_hash=$1 FOR UPDATE',[tokenOf(req)]);
 if(!s||s.signed_at||new Date(s.expires_at).getTime()<=Date.now())throw new ApiError(410,'Link inválido, já utilizado ou expirado.');
 if(s.original_hash!==d.originalHash)throw new ApiError(409,'O documento foi alterado. Abra o link novamente.');
 const evidence={name:d.name,mode:d.mode,strokes:d.strokes,time:new Date().toISOString(),ip:String(req.ip||''),device:String(req.headers['user-agent']||'').slice(0,500),originalHash:s.original_hash,termsVersion:1,terms:signatureTerms};
 const pdf=await makePdf(s.title,s.body,evidence,s.original_pdf),signedHash=hash(pdf);
 await db.query('UPDATE portal_signatures SET signed_at=$1,evidence=$2,signed_pdf=$3,signed_hash=$4 WHERE id=$5',[evidence.time,JSON.stringify(evidence),pdf,signedHash,s.id]);await audit(db,req,'signature.signed',s.id);return {id:s.id,signedHash,signedAt:evidence.time};
 });res.json(result);
});
publicSignatures.get('/signature/signed',async(req,res)=>{const {rows:[s]}=await pool.query('SELECT id,signed_pdf FROM portal_signatures WHERE token_hash=$1 AND signed_at IS NOT NULL AND expires_at>now()',[tokenOf(req)]);if(!s)throw new ApiError(410,'Link indisponível. Solicite a cópia ao advogado.');await audit(pool,req,'signature.download',s.id);res.setHeader('Content-Disposition','attachment; filename="procuracao-assinada.pdf"');res.type('pdf').send(s.signed_pdf)});
export const signatures=Router();
signatures.param('id',(_req,_res,next,value)=>{if(!/^[1-9]\d*$/.test(value)||Number(value)>2147483647)return next(new ApiError(400,'Identificador inválido.'));next()});
signatures.get('/signatures',async(_req,res)=>{const u=res.locals.user;const {rows}=await pool.query(`SELECT ${columns} FROM portal_signatures WHERE id_lawyer=$1 OR id_costumer=$2 ORDER BY id DESC`,[u.lawyer_id||null,u.client_id||null]);res.json(rows)});
signatures.post('/signatures',async(req,res)=>{
 const u=res.locals.user;if(u.type!=='adv')throw new ApiError(403,'Acesso exclusivo do advogado.');
 const d=await yup.object({id_costumer:yup.number().integer().positive().required(),title:yup.string().trim().min(3).max(150).required(),body:yup.string().trim().min(30).max(15000).required(),expiresDays:yup.number().integer().min(1).max(30).default(7)}).validate(req.body,{stripUnknown:true});
 const {rows:[c]}=await pool.query('SELECT 1 FROM portal_lawyer_clients WHERE id_lawyer=$1 AND id_costumer=$2',[u.lawyer_id,d.id_costumer]);if(!c)throw new ApiError(404,'Cliente não encontrado.');
 const base=new URL(process.env.PUBLIC_WEB_URL||'http://localhost:5173');if(process.env.NODE_ENV==='production'&&base.protocol!=='https:')throw new ApiError(503,'Configure PUBLIC_WEB_URL com HTTPS.');
 const token=randomBytes(32).toString('hex'),pdf=await makePdf(d.title,d.body);
 const result=await transaction(async db=>{const {rows:[s]}=await db.query(`INSERT INTO portal_signatures(id_lawyer,id_costumer,title,body,token_hash,expires_at,original_pdf,original_hash) VALUES($1,$2,$3,$4,$5,now()+$6*interval '1 day',$7,$8) RETURNING ${columns}`,[u.lawyer_id,d.id_costumer,d.title,d.body,hash(token),d.expiresDays,pdf,hash(pdf)]);await audit(db,req,'signature.created',s.id,u.id);return s});
 res.status(201).json({...result,url:new URL('/assinar',base).href+'#'+token});
});
signatures.get('/signatures/:id/download',async(req,res)=>{const u=res.locals.user;const {rows:[s]}=await pool.query('SELECT id,signed_pdf FROM portal_signatures WHERE id=$1 AND (id_lawyer=$2 OR id_costumer=$3) AND signed_at IS NOT NULL',[req.params.id,u.lawyer_id||null,u.client_id||null]);if(!s)throw new ApiError(404,'Documento não encontrado.');await audit(pool,req,'signature.download',s.id,u.id);res.setHeader('Content-Disposition','attachment; filename="procuracao-assinada.pdf"');res.type('pdf').send(s.signed_pdf)});
