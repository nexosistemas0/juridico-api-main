import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { pool } from "../src/portal/db.js";
import app from "../src/app.js";
const db = new PGlite();
const migration = new URL(
  "../supabase/migrations/20261112180705_portal_cliente_datajud.sql",
  import.meta.url,
);
before(async () => {
  await db.exec(
    await readFile(
      new URL("./fixtures/existing-schema.sql", import.meta.url),
      "utf8",
    ),
  );
  await db.exec(await readFile(migration, "utf8"));
  const query = async (sql: string, params?: any[]) => {
    const r = await db.query(sql, params);
    return { rows: r.rows, rowCount: r.affectedRows || r.rows.length };
  };
  pool.query = query as any;
  pool.connect = (async () => ({ query, release() {} })) as any;
});
after(async () => {
  await db.close();
  await pool.end();
});
const post = (agent: any, url: string, data: any) =>
  agent
    .post("/api" + url)
    .set("X-Requested-With", "juridico-app")
    .send(data);
const patch = (agent: any, url: string, data: any) =>
  agent
    .patch("/api" + url)
    .set("X-Requested-With", "juridico-app")
    .send(data);
const del = (agent: any, url: string) =>
  agent.delete("/api" + url).set("X-Requested-With", "juridico-app");
let lawyer: any,
  other: any,
  customer: any,
  caseId: number,
  clientId: number,
  hearingId: number,
  documentId: number,
  invitation: string;
test("registers isolated lawyers and rejects unknown origins/CSRF", async () => {
  lawyer = request.agent(app);
  other = request.agent(app);
  customer = request.agent(app);
  const a = await post(lawyer, "/auth/register", {
    name: "Advogada Teste",
    email: "lawyer@example.test",
    phone: "51999999999",
    password: "Test-only-123!",
    oab: "12345/RS",
  });
  assert.equal(a.status, 201);
  assert.equal(a.body.password, undefined);
  assert.match(a.headers["set-cookie"][0], /HttpOnly/);
  assert.equal(
    (
      await post(other, "/auth/register", {
        name: "Outro Advogado",
        email: "other@example.test",
        password: "Test-only-123!",
        oab: "67890/RS",
      })
    ).status,
    201,
  );
  assert.equal(
    (await request(app).post("/api/auth/login").send({})).status,
    403,
  );
  assert.equal(
    (await post(lawyer, "/clients", {}).set("Origin", "https://evil.test"))
      .status,
    403,
  );
  assert.equal((await request(app).get("/api/processes")).status, 401);
});
test("creates invited client atomically and activates a single-use link", async () => {
  const r = await post(lawyer, "/clients", {
    name: "Cliente Teste",
    email: "client@example.test",
    cpf: "12345678901",
    date: "1990-05-10",
    address: "Rua Teste",
  });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  clientId = r.body.client.id;
  invitation = r.body.activationPath.split("#")[1];
  assert.equal((await other.get("/api/clients")).body.length, 0);
  assert.equal(
    (await post(other, `/clients/${clientId}/invite`, {})).status,
    404,
  );
  const a = await post(customer, "/auth/activate", {
    token: invitation,
    password: "Customer-123!",
  });
  assert.equal(a.status, 200);
  assert.equal(a.body.type, "costumer");
  assert.equal(
    (
      await post(request.agent(app), "/auth/activate", {
        token: invitation,
        password: "Override-123!",
      })
    ).status,
    400,
  );
  assert.equal(
    (await post(lawyer, `/clients/${clientId}/invite`, {})).status,
    409,
  );
  assert.equal((await customer.get("/api/clients")).status, 403);
});
test("case ownership cannot be forged; users cannot elevate role", async () => {
  const d = {
    process_num: "00008323520184013202",
    title: "Processo de teste",
    id_costumer: clientId,
  };
  assert.equal((await post(other, "/processes", d)).status, 404);
  const r = await post(lawyer, "/processes", { ...d, id_lawyer: 999 });
  assert.equal(r.status, 201, JSON.stringify(r.body));
  caseId = r.body.id;
  assert.equal((await customer.get("/api/processes")).body.length, 1);
  assert.equal((await other.get("/api/processes")).body.length, 0);
  assert.equal((await other.get(`/api/processes/${caseId}`)).status, 404);
  assert.equal((await post(customer, "/processes", d)).status, 403);
  assert.equal(
    (await patch(customer, "/account", { name: "Cliente", type: "adv" })).body
      .type,
    "costumer",
  );
});
test("hearing includes date/time; messages and files remain private", async () => {
  const h = await post(lawyer, `/processes/${caseId}/hearings`, {
    type: "Conciliação",
    date: "2027-01-20",
    hour: "14:30",
    place: "Fórum",
    room: "12",
    meeting_link: "https://example.org/sala",
    guidelines: "Chegar 15 minutos antes.",
  });
  assert.equal(h.status, 201, JSON.stringify(h.body));
  hearingId = h.body.id;
  assert.equal(h.body.hour, "14:30:00");
  assert.equal((await other.get("/api/hearings")).body.length, 0);
  assert.equal((await customer.get("/api/hearings")).body.length, 1);
  assert.equal(
    (
      await post(customer, `/processes/${caseId}/messages`, {
        body: "Olá, doutora.",
      })
    ).status,
    201,
  );
  assert.equal(
    (await post(other, `/processes/${caseId}/messages`, { body: "Intrusão" }))
      .status,
    404,
  );
  assert.equal(
    (await lawyer.get(`/api/processes/${caseId}/messages`)).body[0].body,
    "Olá, doutora.",
  );
  const f = await lawyer
    .post(`/api/processes/${caseId}/documents`)
    .set("X-Requested-With", "juridico-app")
    .field("name", "orientacao.pdf")
    .attach("file", Buffer.from("%PDF-1.7\nTest"), {
      filename: "test.pdf",
      contentType: "application/pdf",
    });
  assert.equal(f.status, 201, JSON.stringify(f.body));
  documentId = f.body.id;
  assert.equal(
    (await customer.get(`/api/documents/${documentId}/download`)).status,
    200,
  );
  assert.equal(
    (await other.get(`/api/documents/${documentId}/download`)).status,
    404,
  );
  const invalid = await lawyer
    .post(`/api/processes/${caseId}/documents`)
    .set("X-Requested-With", "juridico-app")
    .attach("file", Buffer.from("<script>alert(1)</script>"), {
      filename: "fake.pdf",
      contentType: "application/pdf",
    });
  assert.equal(invalid.status, 400);
});
test("manual edits/deletion authorized; DataJud sync is idempotent and official rows immutable", async () => {
  const m = await post(lawyer, `/processes/${caseId}/movements`, {
    date: "2026-11-12",
    title: "Análise",
    description: "Em análise.",
  });
  assert.equal(m.status, 201);
  assert.equal(
    (
      await patch(other, `/movements/${m.body.id}`, {
        date: "2026-11-12",
        title: "X",
        description: "X",
      })
    ).status,
    404,
  );
  assert.equal(
    (
      await patch(lawyer, `/movements/${m.body.id}`, {
        date: "2026-11-13",
        title: "Revisão",
        description: "Revisado.",
      })
    ).status,
    200,
  );
  assert.equal((await del(lawyer, `/movements/${m.body.id}`)).status, 204);
  const original = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response(
      JSON.stringify({
        hits: {
          hits: [
            {
              _source: {
                numeroProcesso: "00008323520184013202",
                grau: "G1",
                dataHoraUltimaAtualizacao: "2026-11-12T12:00:00Z",
                movimentos: [
                  {
                    codigo: 1,
                    nome: "Conclusão",
                    dataHora: "2026-11-01T12:00:00Z",
                  },
                ],
              },
            },
          ],
        },
      }),
    )) as any;
  try {
    const sync = await post(lawyer, `/processes/${caseId}/sync`, {});
    assert.equal(sync.status, 200, JSON.stringify(sync.body));
    assert.equal(sync.body.inserted, 1);
    await db.query(
      "UPDATE process SET datajud_checked_at=now()-interval '2 minutes' WHERE id=$1",
      [caseId],
    );
    assert.equal(
      (await post(lawyer, `/processes/${caseId}/sync`, {})).body.inserted,
      0,
    );
    const official = (await lawyer.get(`/api/processes/${caseId}`)).body
      .movements[0];
    assert.equal((await del(lawyer, `/movements/${official.id}`)).status, 409);
  } finally {
    globalThis.fetch = original;
  }
});
test("notifications scoped to user; cancellations and logout persist", async () => {
  const n = (await customer.get("/api/notifications")).body[0];
  assert.ok(n);
  assert.equal(
    (await patch(other, `/notifications/${n.id}/read`, {})).status,
    404,
  );
  assert.equal(
    (await patch(customer, `/notifications/${n.id}/read`, {})).body.read,
    true,
  );
  assert.equal((await del(customer, `/hearings/${hearingId}`)).status, 403);
  assert.equal((await del(lawyer, `/hearings/${hearingId}`)).status, 204);
  assert.equal((await del(lawyer, `/documents/${documentId}`)).status, 204);
  assert.equal((await post(customer, "/auth/logout", {})).status, 204);
  assert.equal((await customer.get("/api/auth/me")).status, 401);
  assert.equal(
    (
      await post(customer, "/auth/login", {
        email: "CLIENT@EXAMPLE.TEST",
        password: "Customer-123!",
      })
    ).status,
    200,
  );
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
