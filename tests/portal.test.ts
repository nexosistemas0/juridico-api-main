process.env.DATAJUD_API_KEY='test-only-key';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
import {pool} from '../src/portal/db.js';
import app from '../src/app.js';
const db=new PGlite();
const migration=new URL('../supabase/migrations/20261112180705_portal_cliente_datajud.sql',import.meta.url);
before(async()=>{
 await db.exec(await readFile(new URL('./fixtures/existing-schema.sql',import.meta.url),'utf8'));
 await db.exec(await readFile(migration,'utf8'));
 await db.exec(await readFile(new URL('../supabase/migrations/20261114013314_assinaturas_agenda_busca.sql',import.meta.url),'utf8'));
 const query=async(sql:string,params?:any[])=>{const r=await db.query(sql,params);return {rows:r.rows,rowCount:r.affectedRows||r.rows.length}};
 pool.query=query as any;pool.connect=(async()=>({query,release(){}})) as any;
});
after(async()=>{await db.close();await pool.end()});
const post=(agent:any,url:string,data:any)=>agent.post('/api'+url).set('X-Requested-With','juridico-app').send(data);
const patch=(agent:any,url:string,data:any)=>agent.patch('/api'+url).set('X-Requested-With','juridico-app').send(data);
const del=(agent:any,url:string)=>agent.delete('/api'+url).set('X-Requested-With','juridico-app');
let lawyer:any,other:any,customer:any,caseId:number,clientId:number,hearingId:number,documentId:number,invitation:string;
test('registers isolated lawyers and rejects unknown origins/CSRF',async()=>{
 lawyer=request.agent(app);other=request.agent(app);customer=request.agent(app);
 const a=await post(lawyer,'/auth/register',{name:'Advogada Teste',email:'lawyer@example.test',phone:'51999999999',password:'Test-only-123!',oab:'12345/RS'});assert.equal(a.status,201);assert.equal(a.body.password,undefined);
 assert.match(a.headers['set-cookie'][0],/HttpOnly/);
 assert.equal((await post(other,'/auth/register',{name:'Outro Advogado',email:'other@example.test',password:'Test-only-123!',oab:'67890/RS'})).status,201);
 assert.equal((await request(app).post('/api/auth/login').send({})).status,403);
 assert.equal((await post(lawyer,'/clients',{}).set('Origin','https://evil.test')).status,403);
 assert.equal((await request(app).get('/api/processes')).status,401);
});
test('creates invited client atomically and activates a single-use link',async()=>{
 const r=await post(lawyer,'/clients',{name:'Cliente Teste',email:'client@example.test',cpf:'12345678901',date:'1990-05-10',address:'Rua Teste'});assert.equal(r.status,201,JSON.stringify(r.body));clientId=r.body.client.id;invitation=r.body.activationPath.split('#')[1];
 assert.equal((await other.get('/api/clients')).body.length,0);
 assert.equal((await post(other,`/clients/${clientId}/invite`,{})).status,404);
 const a=await post(customer,'/auth/activate',{token:invitation,password:'Customer-123!'});assert.equal(a.status,200);assert.equal(a.body.type,'costumer');
 assert.equal((await post(request.agent(app),'/auth/activate',{token:invitation,password:'Override-123!'})).status,400);
 assert.equal((await post(lawyer,`/clients/${clientId}/invite`,{})).status,409);
 assert.equal((await customer.get('/api/clients')).status,403);
});
test('case ownership cannot be forged; users cannot elevate role',async()=>{
 const d={process_num:'00008323520184013202',title:'Processo de teste',id_costumer:clientId};
 assert.equal((await post(other,'/processes',d)).status,404);
 const r=await post(lawyer,'/processes',{...d,id_lawyer:999});assert.equal(r.status,201,JSON.stringify(r.body));caseId=r.body.id;
 assert.equal((await customer.get('/api/processes')).body.length,1);
 assert.equal((await other.get('/api/processes')).body.length,0);
 assert.equal((await other.get(`/api/processes/${caseId}`)).status,404);
 assert.equal((await post(customer,'/processes',d)).status,403);
 assert.equal((await patch(customer,'/account',{name:'Cliente',type:'adv'})).body.type,'costumer');
});
test('hearing includes date/time; messages and files remain private',async()=>{
 const h=await post(lawyer,`/processes/${caseId}/hearings`,{type:'Conciliação',date:'2027-01-20',hour:'14:30',place:'Fórum',room:'12',meeting_link:'https://example.org/sala',guidelines:'Chegar 15 minutos antes.'});assert.equal(h.status,201,JSON.stringify(h.body));hearingId=h.body.id;assert.equal(h.body.hour,'14:30:00');
 assert.equal((await other.get('/api/hearings')).body.length,0);assert.equal((await customer.get('/api/hearings')).body.length,1);
 assert.equal((await post(customer,`/processes/${caseId}/messages`,{body:'Olá, doutora.'})).status,201);
 assert.equal((await post(other,`/processes/${caseId}/messages`,{body:'Intrusão'})).status,404);
 assert.equal((await lawyer.get(`/api/processes/${caseId}/messages`)).body[0].body,'Olá, doutora.');
 const f=await lawyer.post(`/api/processes/${caseId}/documents`).set('X-Requested-With','juridico-app').field('name','orientacao.pdf').attach('file',Buffer.from('%PDF-1.7\nTest'),{filename:'test.pdf',contentType:'application/pdf'});assert.equal(f.status,201,JSON.stringify(f.body));documentId=f.body.id;
 assert.equal((await customer.get(`/api/documents/${documentId}/download`)).status,200);
 assert.equal((await other.get(`/api/documents/${documentId}/download`)).status,404);
 const invalid=await lawyer.post(`/api/processes/${caseId}/documents`).set('X-Requested-With','juridico-app').attach('file',Buffer.from('<script>alert(1)</script>'),{filename:'fake.pdf',contentType:'application/pdf'});assert.equal(invalid.status,400);
});
test('manual edits/deletion authorized; DataJud sync is idempotent and official rows immutable',async()=>{
 const m=await post(lawyer,`/processes/${caseId}/movements`,{date:'2026-11-12',title:'Análise',description:'Em análise.'});assert.equal(m.status,201);
 assert.equal((await patch(other,`/movements/${m.body.id}`,{date:'2026-11-12',title:'X',description:'X'})).status,404);
 assert.equal((await patch(lawyer,`/movements/${m.body.id}`,{date:'2026-11-13',title:'Revisão',description:'Revisado.'})).status,200);
 assert.equal((await del(lawyer,`/movements/${m.body.id}`)).status,204);
 const original=globalThis.fetch;
 globalThis.fetch=(async()=>new Response(JSON.stringify({hits:{hits:[{_source:{numeroProcesso:'00008323520184013202',grau:'G1',dataHoraUltimaAtualizacao:'2026-11-12T12:00:00Z',movimentos:[{codigo:1,nome:'Conclusão',dataHora:'2026-11-01T12:00:00Z'}]}}]}}))) as any;
 try {
   const sync=await post(lawyer,`/processes/${caseId}/sync`,{});assert.equal(sync.status,200,JSON.stringify(sync.body));assert.equal(sync.body.inserted,1);
   await db.query("UPDATE process SET datajud_checked_at=now()-interval '2 minutes' WHERE id=$1",[caseId]);
   assert.equal((await post(lawyer,`/processes/${caseId}/sync`,{})).body.inserted,0);
   const official=(await lawyer.get(`/api/processes/${caseId}`)).body.movements[0];
   assert.equal((await del(lawyer,`/movements/${official.id}`)).status,409);
 }finally{globalThis.fetch=original;}
});
test('notifications scoped to user; cancellations and logout persist',async()=>{
 const n=(await customer.get('/api/notifications')).body[0];assert.ok(n);
 assert.equal((await patch(other,`/notifications/${n.id}/read`,{})).status,404);
 assert.equal((await patch(customer,`/notifications/${n.id}/read`,{})).body.read,true);
 assert.equal((await del(customer,`/hearings/${hearingId}`)).status,403);
 assert.equal((await del(lawyer,`/hearings/${hearingId}`)).status,204);
 assert.equal((await del(lawyer,`/documents/${documentId}`)).status,204);
 assert.equal((await post(customer,'/auth/logout',{})).status,204);
 assert.equal((await customer.get('/api/auth/me')).status,401);
 assert.equal((await post(customer,'/auth/login',{email:'CLIENT@EXAMPLE.TEST',password:'Customer-123!'})).status,200);
});

test('native bearer sessions work without cookies, rotate passwords and revoke on logout',async()=>{
 const mobile=request(app);
 const login=await post(mobile,'/auth/login',{email:'lawyer@example.test',password:'Test-only-123!'}).set('X-Client-Type','mobile');
 assert.equal(login.status,200);assert.match(login.body.sessionToken,/^[a-f0-9]{64}$/);assert.equal(login.headers['set-cookie'],undefined);
 const token=login.body.sessionToken;
 assert.equal((await mobile.get('/api/auth/me').set('Authorization',`Bearer ${token}`)).status,200);
 assert.equal((await mobile.get('/api/clients').set('Authorization',`Bearer ${token}`)).status,200);
 assert.equal((await lawyer.get('/api/auth/me').set('Authorization','Bearer invalid')).status,401);
 const change=await post(mobile,'/account/password',{currentPassword:'Test-only-123!',password:'Native-new-123!'}).set('X-Client-Type','mobile').set('Authorization',`Bearer ${token}`);
 assert.equal(change.status,200);assert.notEqual(change.body.sessionToken,token);
 assert.equal((await mobile.get('/api/auth/me').set('Authorization',`Bearer ${token}`)).status,401);
 const rotated=change.body.sessionToken;
 assert.equal((await post(mobile,'/auth/logout',{}).set('Authorization',`Bearer ${rotated}`)).status,204);
 assert.equal((await mobile.get('/api/auth/me').set('Authorization',`Bearer ${rotated}`)).status,401);
 const web=await post(request.agent(app),'/auth/login',{email:'lawyer@example.test',password:'Native-new-123!'});
 assert.equal(web.status,200);assert.equal(web.body.sessionToken,undefined);assert.ok(web.headers['set-cookie']);
});
test('native registration and client activation return isolated bearer sessions',async()=>{
 const mobile=request(app);
 const registration=await post(mobile,'/auth/register',{name:'Advogada Mobile',email:'native@example.test',password:'Native-register-123!',oab:'99999/RS'}).set('X-Client-Type','mobile');
 assert.equal(registration.status,201);const token=registration.body.sessionToken;assert.match(token,/^[a-f0-9]{64}$/);
 const invitation=await post(mobile,'/clients',{name:'Cliente Mobile',email:'native-client@example.test',cpf:'99999999999',date:'1992-01-01'}).set('Authorization',`Bearer ${token}`);
 assert.equal(invitation.status,201);
 const activate=await post(mobile,'/auth/activate',{token:invitation.body.activationPath.split('#')[1],password:'Native-client-123!'}).set('X-Client-Type','mobile');
 assert.equal(activate.status,200);assert.match(activate.body.sessionToken,/^[a-f0-9]{64}$/);assert.equal(activate.headers['set-cookie'],undefined);
 const clientToken=activate.body.sessionToken;
 assert.equal((await mobile.get('/api/clients').set('Authorization',`Bearer ${clientToken}`)).status,403);
 assert.equal((await mobile.get(`/api/processes/${caseId}`).set('Authorization',`Bearer ${clientToken}`)).status,404);
 assert.equal((await mobile.get(`/api/processes/${caseId}`).set('Authorization',`Bearer ${token}`)).status,404);
 assert.equal((await mobile.get('/api/auth/me').set('Authorization',`Bearer ${clientToken}`)).body.type,'costumer');
});

test('client search normalizes accents and phones, paginates and isolates owners',async()=>{
 await post(lawyer,'/auth/login',{email:'lawyer@example.test',password:'Native-new-123!'});
 await patch(lawyer,`/clients/${clientId}`,{name:'José Ávila',phone:'(51) 99999-1234',address:'Rua'});
 for(const q of ['JOSE','ávila','9999912','(51) 99999','client@']){const r=await lawyer.get('/api/clients/search').query({q,limit:1,page:1});assert.equal(r.status,200,JSON.stringify(r.body));assert.equal(r.body.items[0].id,clientId)}
 assert.equal((await other.get('/api/clients/search?q=jose')).body.total,0);
 assert.equal((await lawyer.get('/api/clients/search?q=jose&page=2&limit=1')).body.items.length,0);
 assert.equal((await lawyer.get('/api/clients/search?limit=999')).status,400);
 assert.equal((await lawyer.get('/api/clients/search?q=%25')).body.total,0);
});
test('signatures require consent and exact document hash, expire, and cannot be signed twice',async()=>{
 const data={id_costumer:clientId,title:'Procuração de teste',body:'Eu, José Ávila, concedo os poderes descritos neste documento de teste ao advogado.',expiresDays:7};
 assert.equal((await post(other,'/signatures',data)).status,404);
 const create=await post(lawyer,'/signatures',data);assert.equal(create.status,201,JSON.stringify(create.body));const id=create.body.id,token=create.body.url.split('#')[1];
 const get=await request(app).get('/api/signature').set('X-Signature-Token',token);assert.equal(get.status,200);assert.equal(get.body.termsVersion,1);assert.equal(get.body.token_hash,undefined);
 const payload={name:'José Ávila',mode:'typed',accepted:true,termsVersion:1,originalHash:get.body.original_hash};
 assert.equal((await post(request(app),'/signature',{...payload,accepted:false}).set('X-Signature-Token',token)).status,400);
 assert.equal((await post(request(app),'/signature',{...payload,originalHash:'0'.repeat(64)}).set('X-Signature-Token',token)).status,409);
 const signed=await post(request(app),'/signature',payload).set('X-Signature-Token',token);assert.equal(signed.status,200,JSON.stringify(signed.body));assert.match(signed.body.signedHash,/^[a-f0-9]{64}$/);
 assert.equal((await post(request(app),'/signature',payload).set('X-Signature-Token',token)).status,410);
 assert.equal((await other.get(`/api/signatures/${id}/download`)).status,404);
 const download=await lawyer.get(`/api/signatures/${id}/download`);assert.equal(download.status,200);assert.equal(download.body.subarray(0,5).toString(),'%PDF-');
 const {createHash}=await import('node:crypto');assert.equal(createHash('sha256').update(download.body).digest('hex'),signed.body.signedHash);
 const {rows:[stored]}=await db.query<any>('SELECT evidence FROM portal_signatures WHERE id=$1',[id]);assert.equal(stored.evidence.name,'José Ávila');assert.ok(stored.evidence.ip);assert.ok(stored.evidence.time);
 const expired=await post(lawyer,'/signatures',data);await db.query("UPDATE portal_signatures SET expires_at=now()-interval '1 minute' WHERE id=$1",[expired.body.id]);
 assert.equal((await request(app).get('/api/signature').set('X-Signature-Token',expired.body.url.split('#')[1])).status,410);
 assert.equal((await lawyer.get('/api/signatures')).body.find((s:any)=>s.id===expired.body.id).status,'expirada');
});
test('drawn signatures reject empty strokes and accept bounded coordinates',async()=>{
 const r=await post(lawyer,'/signatures',{id_costumer:clientId,title:'Procuração desenhada',body:'Texto integral aprovado pelo advogado para este teste de desenho.'});const token=r.body.url.split('#')[1];
 const d={name:'José Ávila',mode:'draw',accepted:true,termsVersion:1,originalHash:r.body.original_hash,strokes:[]};
 assert.equal((await post(request(app),'/signature',d).set('X-Signature-Token',token)).status,400);
 assert.equal((await post(request(app),'/signature',{...d,strokes:[[[10,20],[30,900]]]}).set('X-Signature-Token',token)).status,400);
 assert.equal((await post(request(app),'/signature',{...d,strokes:[[[10,20],[30,40],[100,70]]]}).set('X-Signature-Token',token)).status,200);
});
test('standalone hearings enforce overlaps, ownership, dates and soft cancellation',async()=>{
 const d={id_costumer:clientId,type:'Conciliação',date:'2027-04-02',hour:'10:00',place:'Fórum',duration_minutes:90};
 const h=await post(lawyer,'/hearings',d);assert.equal(h.status,201,JSON.stringify(h.body));assert.equal(h.body.id_process,null);
 assert.equal((await post(lawyer,'/hearings',{...d,hour:'11:00'})).status,409);
 const adjacent=await post(lawyer,'/hearings',{...d,hour:'11:30'});assert.equal(adjacent.status,201);
 assert.equal((await patch(lawyer,`/hearings/${adjacent.body.id}`,{...d,hour:'10:45'})).status,409);
 assert.equal((await post(other,'/hearings',d)).status,404);
 assert.equal((await post(lawyer,'/hearings',{...d,date:'2027-02-30'})).status,400);
 assert.equal((await post(lawyer,'/hearings',{...d,id_process:999999})).status,400);
 assert.equal((await del(lawyer,`/hearings/${h.body.id}`)).status,204);
 assert.equal((await post(lawyer,'/hearings',d)).status,201);
 assert.ok((await lawyer.get('/api/hearings')).body.find((r:any)=>r.id===h.body.id).cancelled_at);
});
test('reminders send both recipients once, retry failures and ignore cancelled revisions',async()=>{
 const {sendReminders}=await import('../src/portal/reminders.js');process.env.RESEND_API_KEY='test-only';process.env.MAIL_FROM='test@example.test';
 const r=await post(lawyer,'/hearings',{id_costumer:clientId,type:'Teste de lembrete',date:'2029-01-02',hour:'10:00',place:'Fórum'});assert.equal(r.status,201);
 await db.query("UPDATE hearings SET date=(now() AT TIME ZONE 'America/Sao_Paulo')::date,hour=((now() AT TIME ZONE 'America/Sao_Paulo')+interval '1 hour')::time WHERE id=$1",[r.body.id]);
 let calls=0;const sentTo:string[]=[];const mock=(async(_url:any,options:any)=>{calls++;sentTo.push(JSON.parse(options.body).to[0]);assert.match(options.headers['Idempotency-Key'],/^martins-hearing-/);return new Response('{}',{status:200})}) as any;
 assert.equal((await sendReminders(mock)).sent,2);assert.equal((await sendReminders(mock)).sent,0);assert.equal(calls,2);assert.equal(new Set(sentTo).size,2);
 await db.query('UPDATE portal_hearing_reminders SET sent_at=NULL WHERE id_hearing=$1',[r.body.id]);
 await sendReminders((async()=>{throw new Error('offline')}) as any);
 const failures=await db.query<any>('SELECT attempts,last_error FROM portal_hearing_reminders WHERE id_hearing=$1',[r.body.id]);assert.ok(failures.rows.every(x=>x.attempts===2&&x.last_error));
 await del(lawyer,`/hearings/${r.body.id}`);await db.query("UPDATE portal_hearing_reminders SET next_attempt_at=now()-interval '1 minute' WHERE id_hearing=$1",[r.body.id]);assert.equal((await sendReminders(mock)).sent,0);
});
