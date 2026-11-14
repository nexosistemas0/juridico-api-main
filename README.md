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

Documentos privados PDF/PNG/JPEG até 5 MiB ficam no PostgreSQL, preservando file_path legado. Procurações eletrônicas simples são geradas e assinadas no portal, com PDF privado e evidências. Processos são arquivados por status, sem exclusão destrutiva.

## DataJud

Consulta HTTPS por número CNJ validado, tribunal permitido e timeout. Movimentações deduplicadas e oficiais não editáveis; complementos manuais permanecem separados. A sincronização é manual pelo advogado, não um monitoramento periódico automático. A ausência de resultado não significa inexistência do processo. Audiências e documentos são cadastrados pelo advogado.

Configure obrigatoriamente DATAJUD_API_KEY com a chave pública vigente do CNJ. A consulta real externa ficou pendente: o ambiente não obteve resposta do CNJ. Os testes usam respostas controladas, sem afirmar cobertura real dos tribunais.

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


## Atualização: assinatura, agenda e busca

Execute `npm ci` e `npm run migrate` antes de iniciar esta versão. A migration `20261114013314_assinaturas_agenda_busca.sql` é aditiva; preserva os dados e os vínculos existentes. Cria tabelas privadas para procurações, evidências, auditoria, histórico DataJud e controle de lembretes. Audiências existentes recebem os vínculos do processo. Não foi aplicada ao banco hospedado nesta entrega. Faça backup antes de aplicar em produção.

### Procurações

O advogado prepara título e texto integral em Procurações, escolhe cliente e validade (1–30 dias) e copia o link mostrado uma única vez. Configure `PUBLIC_WEB_URL` para a origem pública do portal; localhost só funciona no próprio computador. Para assinatura pelo celular, publique o portal em HTTPS acessível ao cliente. Abra `/assinar#TOKEN` no navegador: o cliente confere o texto/PDF original, digita o nome ou desenha com o dedo, aceita os termos e confirma. O token fica no fragmento e no cabeçalho X-Signature-Token, nunca na query da API; só seu hash é armazenado. A assinatura é atômica com bloqueio de linha e expiração verificada no servidor. GET não consome o link. O link permite baixar a cópia assinada até sua validade; depois, cliente e advogado podem baixá-la autenticados pelo portal.

O PDF original é preservado e recebe uma página de assinatura. Original e assinado têm SHA-256, e a evidência registra nome declarado, método, data UTC, IP, user-agent e texto/versão do aceite. O hash do PDF final é guardado no banco e exibido ao cliente (não é embutido no próprio arquivo, evitando circularidade). Arquivos ficam em bytea privado, vinculados ao cliente/advogado, sem bucket público. O texto não pode ser editado depois de gerar o link; para corrigir, crie outra procuração. Caracteres fora da fonte PDF são rejeitados explicitamente.

É assinatura eletrônica simples: posse do link e nome declarado, sem verificação documental, biometria, OTP ou certificado ICP-Brasil. O desenho não transforma a assinatura em qualificada. O advogado deve revisar os poderes e adequação ao ato antes de compartilhar. Integração com certificação/provedor é etapa separada.

### DataJud

`DATAJUD_API_KEY` fica só no servidor. Obtenha a chave atual em https://datajud-wiki.cnj.jus.br/api-publica/acesso/ (informe apenas o valor, sem prefixo APIKey). Consulta por número CNJ validado e tribunal permitido. A sincronização salva tribunal, classe/código, assuntos/códigos, órgão/código, ajuizamento, atualização da fonte e movimentações; cada consulta concluída gera snapshot, sem duplicar movimentos oficiais. O portal exibe até 100 consultas recentes, mantendo todo o histórico no banco. Use Consultar DataJud após vincular o processo.

Partes não são expostas pela API pública: `parties=null` e `partiesAvailable=false`, nunca inferidas do cliente cadastrado. Referência: https://datajud-wiki.cnj.jus.br/api-publica/glossario/. Sem chave: 503; inexistente na base pública: 404; limite: 429; falha/timeout da fonte: 502. As respostas são mensagens seguras. O cadastro manual continua disponível.

### Agenda e lembretes

`POST /api/hearings` agenda por id_costumer e id_process opcional. As rotas antigas por processo continuam aceitas pelo aplicativo. Duração 5–480 minutos (padrão 60); lembrete 5–10080 minutos antes (padrão 1440). Horários interpretados em America/Sao_Paulo. Bloqueios transacionais no advogado e cliente evitam conflitos concorrentes via API; intervalos adjacentes são permitidos. Edição gera revisão, invalidando lembretes anteriores. Cancelamento conserva o registro, marca cancelled_at e impede envio posterior. Não grave audiências diretamente no banco, pois os conflitos são verificados pela API.

Configure `RESEND_API_KEY` e `MAIL_FROM` (domínio verificado no Resend). Execute a cada minuto via cron/worker:

```bash
npm run build
npm run reminders:production
```

Em desenvolvimento: `npm run reminders`. O processo roda uma vez e encerra; precisa ser agendado. Cron Linux, a cada minuto: `* * * * * cd /caminho/juridico-api-main && npm run reminders:production`. No Windows, use Agendador de Tarefas com a pasta da API como diretório de trabalho. Não execute ambos para o mesmo ambiente sem necessidade. No Render, use um cron/worker e forneça as mesmas variáveis de banco/e-mail.

Destinatários: advogado e cliente. Mensagem mínima, sem número de processo, poderes ou documentos. Provedor chamado com chave de idempotência; registros individuais, SKIP LOCKED, cinco tentativas com cinco minutos de intervalo. Nenhum e-mail real foi enviado nos testes. Se o agendador ficar indisponível até a hora da audiência, não envia lembrete atrasado. Acompanhe portal_hearing_reminders para tentativas esgotadas; dados de e-mail não entram nos logs de erro. Configure e valide o serviço antes de depender dos lembretes.

### Busca e segurança

`GET /api/clients/search?q=...&page=1&limit=12`: busca parcial por nome/e-mail/telefone, acentos portugueses, sem diferença de caixa, telefone normalizado, consulta parametrizada e escopo obrigatório do advogado. Mantida `/clients` por compatibilidade com seletores e app. Portal usa debounce de 300 ms e ignora respostas obsoletas.

Auditoria em portal_access_logs: usuário, categoria da operação, recurso de assinatura, data, IP e dispositivo; nunca senha, token, texto do documento ou corpo da requisição. As tabelas novas têm RLS habilitada e sem grants anon/authenticated. O acesso usa autorização da API, com conexão PostgreSQL privilegiada apenas no servidor. Configure TRUST_PROXY_HOPS somente para proxies conhecidos, para não falsificar evidência de IP. Restrinja acesso administrativo e backups. Defina com o responsável pelo escritório política de retenção, atendimento a titulares e base de tratamento; a implementação técnica não certifica conformidade LGPD. Logs não são apagados automaticamente: defina retenção e purga conforme política do escritório; evidências assinadas devem seguir prazo de guarda específico. Mantenha API e portal na mesma origem em produção para cookies HttpOnly.

### Testes desta entrega

16 testes da API (PostgreSQL isolado via PGlite) e 3 do aplicativo; build TypeScript API, typecheck do aplicativo e build Vite web. Incluem autorização cruzada, links expirados/reutilizados, hash, PDF, consentimento, desenho, pesquisa, conflitos, cancelamento e reenvio. DataJud/e-mail usam respostas controladas. Homologar com PostgreSQL real, DataJud real, remetente e dispositivos antes de produção. A validação visual automatizada do navegador neste ambiente ficou bloqueada pela restrição de inicialização do Chromium.
