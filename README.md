# Martins Advogados — API

API Express/TypeScript para o portal de advogados e clientes. Frontend: https://github.com/nexosistemas0/juridico-app (branch `feat/portal-cliente-datajud`). Node.js 24.

## Executar

```bash
npm ci
cp .env.example .env
# Preencha DATABASE_URL com a conexão PostgreSQL/Supavisor do seu Supabase.
npm run migrate
npm run dev
```

API em http://localhost:3333/api. Frontend em http://localhost:5173. A conexão PostgreSQL fica somente no servidor; nunca coloque senha do banco ou service_role no frontend. Configure TLS com certificado válido.

O projeto Supabase `juridico` tem a migração `20261112180705_portal_cliente_datajud` aplicada. O comando migrate verifica o histórico para não reaplicá-la. A migração pressupõe as oito tabelas preexistentes; o SQL em tests/fixtures é exclusivamente para testes isolados, não para restaurar produção.

## Fluxo

1. Advogado cria conta com nome, e-mail, senha e OAB (informada, sem validação profissional externa).
2. Cadastra cliente e compartilha o link de ativação pessoal, válido por sete dias. Não há envio automático de e-mail.
3. Cliente define a própria senha. O advogado não pode reutilizar o convite para redefinir uma conta ativada.
4. Advogado consulta o número CNJ, vincula o processo ao cliente e aciona a sincronização do DataJud.
5. Cliente acompanha seus processos, movimentações, audiências, documentos e mensagens.

Autenticação própria com bcrypt e sessões revogáveis em PostgreSQL; não usa Supabase Auth. Cookies HttpOnly, SameSite=Lax e Secure em produção. RLS ativada e acesso anon/authenticated revogado nas tabelas; autorização feita pela API com vínculo advogado/cliente/processo. Rotas antigas não são expostas pelo novo app.

## Rotas principais

Todas sob `/api`. Escritas exigem `X-Requested-With: juridico-app` e origem autorizada em APP_ORIGIN.

| Recurso | Operações |
| --- | --- |
| /auth/register, /auth/login, /auth/activate, /auth/logout | POST |
| /auth/me | GET |
| /account, /account/password | PATCH perfil, POST senha |
| /clients, /clients/:id, /clients/:id/invite | GET/POST, PATCH, POST |
| /processes/search | POST consulta CNJ |
| /processes, /processes/:id, /processes/:id/sync | GET/POST, GET/PATCH, POST |
| /processes/:id/movements, /movements/:id | POST, PATCH/DELETE |
| /hearings, /processes/:id/hearings, /hearings/:id | GET, POST, PATCH/DELETE |
| /processes/:id/documents, /documents/:id/download, /documents/:id | POST, GET, DELETE |
| /processes/:id/messages | GET/POST; paginação com before |
| /notifications, /notifications/:id/read, /notifications/:id | GET, PATCH, DELETE |

Documentos privados PDF/PNG/JPEG até 5 MiB ficam no PostgreSQL, preservando file_path legado. Assinatura eletrônica não está implementada. Processos são arquivados por status, sem exclusão destrutiva.

## DataJud

Consulta HTTPS por número CNJ validado, tribunal permitido e timeout. Movimentações deduplicadas e oficiais não editáveis; complementos manuais permanecem separados. A sincronização é manual pelo advogado, não um monitoramento periódico automático. A ausência de resultado não significa inexistência do processo. Audiências e documentos são cadastrados pelo advogado.

A chave pública CNJ pode ser substituída por DATAJUD_API_KEY. A consulta real externa ficou pendente: o ambiente não obteve resposta do CNJ. Os testes usam respostas controladas, sem afirmar cobertura real dos tribunais.

## Produção e validação

```bash
npm test
npm run build
npm start
```

Compile o frontend e configure FRONTEND_DIST para seu diretório dist. Sirva frontend e /api na mesma origem HTTPS; APP_ORIGIN deve conter essa origem. Configure TRUST_PROXY_HOPS somente conforme o proxy usado. Não execute scripts/preview-api.ts em produção: é uma demonstração local com sessão fictícia automática, exige LOCAL_QA=1 e escuta somente localhost.

Testes cobrem autorização entre contas, convite de uso único, mensagens/documentos privados, CRUD de audiências/movimentações, notificações e sincronização idempotente. CI executa testes e build. Falta validar o fluxo completo com DATABASE_URL real no servidor de destino e uma consulta DataJud real. Recuperação de senha por e-mail, verificação de e-mail e notificações push não estão implementadas.


## Aplicativo React Native Martins Advogados

O app nativo está na raiz de `juridico-app`, branch `feat/martins-react-native`. O portal web anterior foi movido para `web/`; se utilizado, ajuste FRONTEND_DIST para `../juridico-app/web/dist`.

Login, cadastro, ativação e troca de senha com `X-Client-Type: mobile` retornam `sessionToken` opaco. O app guarda esse valor no SecureStore e envia `Authorization: Bearer <token>`. A validade continua em 24 horas, com hash no banco; logout e troca de senha revogam sessões. Um header Authorization inválido nunca recorre ao cookie. Clientes web continuam recebendo somente cookie HttpOnly e o formato anterior da resposta. `X-Client-Type` escolhe apenas o transporte da sessão, não concede privilégios.

Sem nova migração Supabase. Para testar celular na mesma rede, use o IP LAN do computador no EXPO_PUBLIC_API_URL do app. Produção exige HTTPS. Não coloque DATABASE_URL nem credenciais do banco no aplicativo. Os testes adicionais cobrem sessão bearer, token inválido com cookie válido, rotação e revogação, preservando login web.
