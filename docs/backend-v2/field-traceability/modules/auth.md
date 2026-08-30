# Módulo: auth (Autenticação / Sessão / Tenant / RBAC)

Fase 2 do Prompt 100. Escopo: `apps/web/src/app/providers/AuthContext.tsx` (hub central),
`apps/web/src/modules/auth/**` (6 páginas), `apps/web/src/lib/supabase.ts`,
`apps/web/src/shared/lib/api-client.ts`, `apps/web/src/shared/lib/ws-client.ts`+`useWebSocket.ts`,
`apps/api/src/modules/auth/**` completo, `apps/api/src/core/guards/{auth,tenant}.guard.ts`,
`apps/api/src/core/interceptors/request-tenant-context.interceptor.ts`,
`apps/api/src/core/rbac/**` (enumeração, não reauditoria completa do RBAC como sistema — fora de
escopo, mas suas fronteiras com auth foram verificadas). Fecha a pendência registrada em
`artist.md` (`ArtistaSignupPublic.tsx`).

Read-only. `DATABASE_WRITES: 0`. Nenhum `.ts`/`.tsx` alterado. `SUPABASE_CHANGED: NÃO`.

## 1. Achado crítico: `ArtistaSignupPublic.tsx` chama um endpoint que não existe

Fecha a pendência do `artist.md`. `ArtistaSignupPublic.tsx` (rota pública `/cadastro/:orgSlug`,
sem autenticação) — fluxo de 393 linhas, wizard multi-etapa, comentário explícito no código:
*"Cadastro público cria DIRETAMENTE um artista (sem Lead/CRM/status intermediário)"* — envia, ao
final:

```ts
publicApi.post("/public/artists", { workspaceSlug: orgSlug, ...artistaPayload, acceptedTerms, companyWebsite })
```

**Confirmado por busca exaustiva em todo `apps/api/src`** (grep por `Controller('public`,
`Post('artists'`, `'public/artists'`): **não existe nenhuma rota `POST /public/artists` em lugar
nenhum do backend.** O único endpoint público relacionado a artistas é
`POST /public/artist-registration` (`PublicRegistrationController`,
`modules/leads/public-registration.controller.ts`), que cria um **Lead** (via `LeadsService`), não
um artista — um modelo de dados e um controller inteiramente diferentes. `GET /public/workspaces/
:slug` (usado no mesmo componente para resolver o workspace pelo slug, linha 194) **existe e
funciona** — confirmado no mesmo controller.

Resultado real: **todo envio deste formulário retorna erro** (rota inexistente → 404), capturado
pelo `catch` genérico do componente, que mostra apenas "Erro ao enviar cadastro. Tente novamente."
— nenhum artista é criado, nenhum dado é persistido, em nenhuma circunstância. Confirmado por
leitura direta do código-fonte de ambos os lados, não inferência.

Achado adicional (mesmo que o endpoint existisse): os nomes de campo enviados no payload
divergem tanto do `CreateArtistDto` (auditado em `artist.md`) quanto das colunas reais de
`artists` — `spotify_artist_url`/`youtube_channel_url` (vs. `spotify_url`/`youtube_url` reais) e
`instagram`/`tiktok` (vs. `instagram_url`/`tiktok_url` reais, o mesmo par que
`artists.service.ts` já precisou corrigir uma vez no fluxo autenticado — ver `artist.md` §4). Isso
sugere que este componente foi escrito contra um contrato de API planejado e nunca sincronizado
com a implementação real, não apenas "esquecido de implementar".

**Classificação: `PUBLIC_SIGNUP_GAP` — severidade máxima, confirmado, não corrigido nesta etapa.**

## 2. `AuthContext.tsx` — hub real, bem implementado

Lido por completo (370 linhas). Autenticação 100% via Supabase Auth (SDK gerencia tokens/refresh/
persistência) — sem "modo mock" (comentário do próprio arquivo confirma). Achados:

- **Resolução de sessão**: `sb.auth.getSession()` no boot + `onAuthStateChange` como fonte única de
  verdade para mudanças de sessão (login, logout, refresh, recovery).
- **Claims JWT decodificados apenas para log de DEV** (`decodeJwtClaims`/`logJwtClaims`, gated por
  `IS_DEV`) — nunca usados para autorização real no frontend (correto).
- **`org_id`/`role`**: extraídos de `app_metadata` do JWT (claims confiáveis, assinados pelo
  Supabase — presumivelmente injetados por um Auth Hook customizado), com fallback para
  `user_metadata`. Nunca vêm de um campo editável pelo usuário.
- **Auto-provisionamento de workspace**: `needsWorkspaceProvisioning()` detecta sessão sem
  `org_id` mas com `user_metadata.workspace_slug` (= acabou de se cadastrar) → chama
  `PATCH /auth/provision-workspace` automaticamente → `refreshSession()` para obter JWT com o
  `org_id` recém-criado. Mecanismo real, testado via `activeProvisioning` (deduplica chamadas
  concorrentes). **Sem gap.**
- **`AUTH_DISABLED`**: usuário sintético fixo (`AUTH_DISABLED_USER`, UUID fixo, role `owner`) —
  gate por `import.meta.env.VITE_AUTH_DISABLED === "true"` (frontend); nunca chama Supabase Auth
  quando ativo (comentário explícito no código). Espelha `DEV_TENANT`/`DEV_MEMBER` do backend
  (`core/auth-disabled.ts`) — mesmo UUID, confirmado consistente nos dois lados.
- **`changeRequiredPassword`**: chama `POST /auth/change-required-password` (troca atômica +
  limpeza de `must_change_password` no mesmo request no backend), depois `refreshSession()` para
  que o novo JWT (sem a flag) chegue ao app. Bem documentado, sem gap.

## 3. Backend — JWT / Guards / Tenant isolation (achado positivo: bem protegido)

`JwtAuthGuard` (`core/guards/auth.guard.ts`, lido em detalhe): verificação real via **JWKS**
(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, algoritmo `ES256`, `issuer`=URL do projeto
Supabase, `audience`='authenticated') em produção; fallback **HS256** com segredo de dev e
`issuer: 'music-os-360-dev'` apenas em ambiente de desenvolvimento — caminhos claramente
separados.

`TenantGuard` (`core/guards/tenant.guard.ts`, lido por completo) — **achado de segurança
positivo, confirmado**: o header `X-Tenant-ID` (enviado pelo `api-client.ts` do frontend) **nunca
é usado como autoridade**. O tenant real é resolvido a partir de `auth.orgId` (claim do JWT,
verificado), e o header é usado **apenas como checagem de consistência** — se
`X-Tenant-ID` não bater com o `id`/`org_id`/`external_auth_org_id` do tenant já resolvido pelo
JWT, a requisição é rejeitada (`ForbiddenException`). Também resolve e valida a
**membership real** (`resolveMembership(tenant.id, auth.userId)`) — rejeita se o usuário não for
membro ativo. `TENANT_ISOLATION_GAP: 0`.

`DevAuthController` — duplamente protegido: (a) só é **registrado como rota** quando
`!isProdLike(NODE_ENV)` (a rota não existe fisicamente em produção, não é só um 403), e (b) checa
`isProdLike` de novo no próprio `OnModuleInit`. `AUTHORIZATION_GAP: 0` para este ponto.

`@Public()` e `@AuthBootstrap()` (decorators) — usados corretamente: `@Public()` em rotas
verdadeiramente sem sessão (`/public/*`, health, alguns webhooks); `@AuthBootstrap()` só em
`PATCH /auth/provision-workspace` (usuário autenticado mas ainda sem tenant) — escopo mínimo e
correto, não usado indevidamente em nenhuma outra rota do módulo.

## 4. `AuthContextService.build()` — `GET /auth/context`, resolução completa

Lido por completo. Constrói `{ user, workspace, membership, claims }` a partir de
`(auth, tenant, member)` já resolvidos pelo `TenantGuard`/interceptor — nunca confia em dado vindo
do cliente para os campos de segurança. **Efeito colateral real encontrado**: a cada chamada,
executa um `UPDATE tenant_invitations SET status='accepted' WHERE tenant_id=$1 AND
auth_user_id=$2 AND status='pending'` — auto-aceite de convite pendente na primeira vez que o
usuário convidado carrega o contexto autenticado. Mecanismo real e funcional, não documentado
antes nesta série de auditorias — acrescenta um consumidor real a mais para `tenant_invitations`
(já confirmada `MATCH`/`DIRECT_RAW_SQL` na Fase 1).

Permissões: `RbacService.getEffectivePermissions({role, role_id, tenant_id})` — "DUAL-SOURCE
(FASE 5)": usa permissões do banco quando `role_id` existe (RBAC dinâmico), cai para matriz de
roles legada (`role-hierarchy.ts`, 14 identificadores: `super_admin`(100), `tenant_owner`/
`owner`(90), `admin`(80), `manager`(70), `editor`/`financial`/`accounting`(60), `juridico`(55),
`marketing_manager`/`rh_manager`(55), `marketing`(50), `comercial`(45), `produtor`/`radio`/`tv`(40),
`artist`/`artista`(30), `colaborador`(20), `viewer`(10)) quando não. Sistema RBAC completo em si
não foi reauditado (fora de escopo desta passada — pertence à sua própria fronteira, mas a
integração com `auth` foi verificada e é coerente).

## 5. Internal user — distinção `auth.users` / `public.users` / `app.users`

Confirmado, sem mistura: `auth.users` (Supabase-managed, nunca tocado diretamente por código de
aplicação além do SDK) é a fonte de identidade/credenciais. `org_members` (não `public.users`) é
a tabela real de **membership** consultada por `TenantGuard`/`AuthContextService` (`member.id`,
`member.role`, `member.role_id`, `member.email`, `member.full_name`, `member.is_active`) —
mesma tabela já identificada no doc80 (`ENTITY_TABLE_MAP`'s `user: 'org_members'`). `public.users`
(perfil de aplicação, `UserEntity`, já confirmado `MATCH` na Fase 1) não aparece em nenhum ponto do
fluxo de auth/tenant-context lido nesta auditoria — seu uso real fica para a auditoria do módulo
`settings`/perfil de usuário (fora de escopo aqui). `app.users` (futuro namespace v2) não existe e
não é referenciado — consistente com doc73/doc84.

## 6. Login / Logout / Signup / Reset — campo a campo

| Fluxo | Componente | Rota | Campos | Backend/Supabase |
|---|---|---|---|---|
| Login | `Auth.tsx` | `/auth`, `/login` | email, password | `supabase.auth.signInWithPassword` |
| Esqueci a senha (solicitar) | `Auth.tsx` (mesma página, outro modo) | `/forgot-password` | email | `supabase.auth.resetPasswordForEmail(email, {redirectTo: origin+"/reset-password"})` |
| Atualizar senha (pós-link) | `ResetPassword.tsx` | `/reset-password` | password, confirmPassword | `supabase.auth.updateUser({password})`, depende da sessão de recovery já ativa via `onAuthStateChange` |
| Troca de senha obrigatória (1º login) | `ChangeRequiredPassword.tsx` | `/change-required-password` | newPassword, confirmPassword | `POST /auth/change-required-password` (real, atômico) |
| Signup completo (empresa) | `Register.tsx` (wizard 3 passos) | `/register`, `/signup` | email, password, fullName, tradeName, segment (enum: gravadora/editora/produtora/escritorio), corporateEmail, workspaceName, slug (derivado), phone, address, city, state, requestedPlan, acceptedTerms, acceptedLgpd | `supabase.auth.signUp()` com `options.data` = todos os campos acima como `user_metadata`, seguido do auto-provisionamento (§2) |
| Onboarding pós-signup | `Onboarding.tsx` | `/onboarding` (protegida) | via `CompleteOnboardingDto` (não expandido campo-a-campo — formulário de finalização, papel secundário face ao Register) | `PATCH /auth/onboarding`, `RequireRole('owner')` |
| Cadastro público de artista | `ArtistaSignupPublic.tsx` | `/cadastro/:orgSlug` | ~30 campos (mesmo shape de `ArtistaFormModal`, ver `artist.md`) | **`POST /public/artists` — INEXISTENTE (§1)** |
| Logout | botão em `AdminLayout`/menu de usuário (não um componente próprio) | — | — | `supabase.auth.signOut()` + `clearApiSessionState()` + `queryClient.clear()` — **não chama `disconnectRealtimeChannels()`** (ver §8) |

Todos os campos de `Register.tsx` batem exatamente com os parâmetros que
`provisionWorkspaceForSession()` envia para `PATCH /auth/provision-workspace` — mapeamento
verificado, sem gap.

## 7. API client — Authorization / X-Tenant-ID / 401

`api-client.ts`: injeta `Authorization: Bearer <token>` e `X-Tenant-ID` a partir de variáveis em
memória (`_accessToken`/`_tenantId`, setadas exclusivamente por `AuthContext` via
`setAccessToken`/`setTenantId` — nunca lidas diretamente de `localStorage` pelo client HTTP; a
persistência de sessão em si é gerida pelo SDK do Supabase, não pelo `api-client`). Em `401`:
`setAccessToken(null)` + circuit-breaker de backoff (evita tempestade de requisições após sessão
inválida). Evento customizado `musicos360:auth:tokenRefreshed` disparado em `TOKEN_REFRESHED` —
consumido por quem precisar reagir a um novo token (não mapeado em detalhe — nenhum consumidor
crítico de segurança depende dele além do próprio fluxo de refresh do SDK).

## 8. Realtime — integração com Auth

`ws-client.ts`: 2 canais privados por sessão (`tenant:${orgId}`, `user:${userId}`), Supabase
Realtime nativo — autorização via **RLS** (migration `20260801000001_RealtimeBroadcastAuthorization`,
citada no comentário do arquivo), não por lógica própria — o client Supabase já encaminha o JWT da
sessão atual automaticamente. `ensureRealtimeChannels()` (chamado por `useWebSocket()`, único
consumidor confirmado via grep) re-vincula os canais quando `orgId`/`userId` mudam (ex.: troca de
usuário sem reload de página).

**Gap confirmado**: `AuthContext.signOut()` **não chama `disconnectRealtimeChannels()`**
(verificado lendo o corpo completo de `signOut()`) — os canais realtime da sessão anterior não são
explicitamente fechados no logout. Como `ensureRealtimeChannels()` retorna cedo quando
`orgId`/`userId` são `null` (linha `if (!orgId || !userId) return;`, antes de chegar à lógica que
reconectaria/desconectaria), um canal já aberto pode permanecer inscrito após o logout até um
reload completo de página. `REALTIME_AUTH_GAP` — moderado (não é vazamento de dados entre tenants,
já que RLS continua aplicando; é um canal potencialmente obsoleto sem limpeza explícita).

## 9. Site URL / Redirect paths (inventário, sem configurar)

```text
FLOW: password reset request → REDIRECT_PATH: {window.location.origin}/reset-password
  (calculado dinamicamente — funciona em qualquer ambiente sem configuração adicional do lado
  frontend; a allowlist de Redirect URLs no painel do Supabase ainda precisa conter cada origem
  real, ponto já registrado como pendente/não resolvido no doc75 desta série — não reinvestigado
  aqui, apenas referenciado).
FLOW: signup / email confirmation → nenhum emailRedirectTo explícito encontrado em signUp() —
  usa o comportamento padrão do Supabase (Site URL do projeto). Requer confirmação futura de qual
  é o Site URL configurado — mesma pendência do doc75.
```

`DEVELOPMENT_REDIRECTS_REQUIRED`: 1 (`/reset-password`, resolvido dinamicamente, funciona já).
`STAGING_REDIRECTS_REQUIRED`/`PRODUCTION_REDIRECTS_REQUIRED`: `UNRESOLVED` — depende da allowlist
real do Supabase Dashboard, fora do alcance de leitura de código (mesma conclusão do doc75, não
reaberta aqui).

## 10. SMTP

Fluxos que dependem de email transacional, confirmados pelo código: **password reset**
(`resetPasswordForEmail`) e, condicionalmente, **confirmação de signup** (depende do toggle
"Confirm email" do projeto Supabase, não inspecionável via código — mesma pendência do doc75).
Nenhum fluxo de "convite por email" explícito foi encontrado neste módulo (o auto-aceite de
`tenant_invitations`, §4, pressupõe que o convite já foi criado/enviado por outro fluxo — não
mapeado aqui, pertence a `settings`/gestão de usuários do tenant). `SMTP_REQUIRED: SIM` (para os 2
fluxos listados). **Não solicitado nem configurado nesta etapa**, conforme instrução.

## 11. Erros / Status de usuário

Estados de erro tratados de forma real, confirmados no código: credenciais inválidas (mensagem do
Supabase repassada), sessão ausente (`Navigate to /auth`), tenant não encontrado/inativo
(`UnauthorizedException` no `TenantGuard`), usuário sem membership ativa
(`ForbiddenException`), token/tenant divergente (`ForbiddenException`), `must_change_password`
(redireciona para `/change-required-password` — verificado no `Home()` de `App.tsx`, já
referenciado em prompts anteriores desta série). Não foi encontrado nenhum estado explícito de
usuário "suspended"/"deleted" tratado neste módulo especificamente — apenas `is_active` da
membership (booleano simples).

## 12. Auth storage local

`api-client.ts` não persiste token em `localStorage` diretamente (mantém em memória, repassado
pelo AuthContext a cada mudança de sessão). A persistência real de sessão (refresh token, etc.) é
inteiramente delegada ao SDK do Supabase (`@supabase/supabase-js`), que gerencia sua própria chave
em `localStorage` internamente — não lida/escrita diretamente por código da aplicação, portanto
não haveria valor a reportar mesmo que fosse necessário (e não é, por instrução explícita de nunca
imprimir valores). `CONTENT_TYPE`: token de sessão (sensível); `OWNER`: SDK Supabase;
`CLEAR_BEHAVIOR`: `supabase.auth.signOut()` limpa a própria persistência do SDK.

## Resumo

```text
STATUS: CONCLUÍDO (módulo auth)
MODULE_STATUS: COMPLETE
UNMAPPED_AUTH_FIELDS: 0
UNMAPPED_SIGNUP_FIELDS: 0
UNMAPPED_PUBLIC_SIGNUP_FIELDS: 0
UNMAPPED_RESET_FIELDS: 0
UNMAPPED_SESSION_FIELDS: 0
UNMAPPED_ROLE_PERMISSION_REFERENCES: 0
UNMAPPED_TENANT_REFERENCES: 0
UNKNOWN_AUTH_CLASSIFICATIONS: 0
REAL_MAPPING_GAPS: 2 (ArtistaSignupPublic->POST /public/artists inexistente, severidade máxima;
  nomes de campo de plataforma divergentes no mesmo payload, mesmo se o endpoint existisse)
PUBLIC_SIGNUP_GAPS: 1 (o mesmo achado do §1 — fluxo público de cadastro de artista 100% quebrado)
REALTIME_AUTH_GAPS: 1 (signOut() não chama disconnectRealtimeChannels() — canais podem persistir
  além do logout até reload completo; não é vazamento entre tenants, RLS continua aplicando)
AUTHORIZATION_GAPS: 0
AUTHENTICATION_GAPS: 0
TENANT_ISOLATION_GAPS: 0
SESSION_GAPS: 0
REDIRECT_GAPS: 0 (dentro do que o código controla; Site URL/allowlist real do Supabase permanece
  UNRESOLVED, mesma pendência do doc75, não reaberta aqui)
EMAIL_FLOW_GAPS: 0
```
