# MUSIC OS 360 — Guia de Provisionamento Real

> **Objetivo**: Transformar o código em plataforma operacional conectada ao Supabase real.  
> **Status**: Ativo — execute na ordem abaixo.  
> **Última atualização**: 2026-05-21

---

## Pré-requisitos

Antes de começar:
- [ ] Conta Supabase criada em [supabase.com](https://supabase.com)
- [ ] Projeto Supabase criado (Free tier aceite para dev/staging)
- [ ] Node.js 20+ instalado
- [ ] pnpm instalado (`npm i -g pnpm`)
- [ ] Dependências instaladas: `pnpm install`

---

## Fase 16 — Provisionamento do Banco de Dados

### Passo 1: Criar projeto Supabase

1. Acesse [app.supabase.com](https://app.supabase.com)
2. Clique em **New Project**
3. Escolha uma região próxima (ex: São Paulo - `sa-east-1`)
4. Anote a senha do banco — você precisará dela
5. Aguarde o projeto inicializar (~2 minutos)

### Passo 2: Obter credenciais

No painel Supabase:
- **Settings → API** → copie:
  - `Project URL` → `SUPABASE_URL`
  - `anon public` → `SUPABASE_ANON_KEY`
  - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
- **Settings → Database** → Connection String → `URI` mode → copie para `DATABASE_URL`

### Passo 3: Configurar variáveis de ambiente

```bash
# Edite com suas credenciais reais (arquivo já existe na raiz, fora do Git)
nano .env.development  # ou use seu editor preferido
```

Variáveis obrigatórias:
```
DATABASE_URL=postgres://postgres:SENHA@db.REF.supabase.co:5432/postgres
SUPABASE_URL=https://REF.supabase.co
SUPABASE_ANON_KEY=eyJ...
ENCRYPTION_KEY=<64-hex-chars>  # gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
CORS_ORIGINS=http://localhost:5173
```

### Passo 4: Executar migrations

```bash
cd apps/api
npm run db:migrate
```

Resultado esperado:
```
[db:migrate] Aplicando migrations…
[db:migrate] Migrations aplicadas com sucesso.
```

### Passo 5: Verificar provisionamento

```bash
npm run verify:supabase
```

Este script verifica automaticamente:
- ✓ Variáveis de ambiente presentes
- ✓ Conectividade com PostgreSQL
- ✓ Migrations executadas
- ✓ Todas as tabelas existem (~60 tabelas)
- ✓ RLS habilitado em tabelas multi-tenant
- ✓ Políticas RLS existentes
- ✓ Coluna `tenant_id` presente

Se algum item falhar, o script reporta o problema e sai com código 1.

**Para corrigir RLS automaticamente:**
```bash
npm run verify:rls -- --fix
```

### Passo 6: Aplicar JWT Hook do Supabase

Este hook garante que `app.current_tenant_id` seja definido automaticamente por cada request:

```bash
# Execute o SQL no Supabase SQL Editor:
# apps/api/supabase-jwt-hook.sql
```

Ou via CLI Supabase:
```bash
supabase db execute --file apps/api/supabase-jwt-hook.sql
```

---

## Fase 17 — Seed Operacional

### Passo 7: Criar usuário no Supabase Auth

1. Supabase Dashboard → **Authentication → Users**
2. Clique em **Invite User** ou **Create User**
3. Email: `admin@musicos360.dev` (ou seu email real)
4. Copie o UUID do usuário criado

### Passo 8: Configurar seed

```bash
# No .env.development, defina:
SEED_ADMIN_SUB=<uuid-do-usuario-supabase>
SEED_ADMIN_EMAIL=admin@musicos360.dev
```

### Passo 9: Executar seed operacional

```bash
npm run db:seed:operational
```

Cria:
- Organization + Tenant
- Admin member (owner)
- Billing subscription enterprise
- Artista demo
- CRM Contact + Company + Tag
- Pipeline com 3 stages + 1 opportunity
- Campanha + task
- Formulário de captura
- Contrato rascunho
- Transação financeira

---

## Fase 18 — Validar Tenant Isolation

```bash
npm run verify:tenant-isolation
```

Este script:
1. Cria 2 tenants temporários
2. Insere dados em cada tenant
3. Tenta leitura, update e delete cross-tenant
4. Confirma que RLS bloqueia todos os acessos cruzados
5. Remove dados de teste (cleanup automático)

**Critério de aceite**: 7/7 testes passam.

---

## Fase 19 — Integrações Reais

### Status por integração

| Integração | Variável | Status | Notas |
|-----------|---------|--------|-------|
| Supabase Auth | `SUPABASE_URL` + `SUPABASE_ANON_KEY` | **OBRIGATÓRIO** | JWT validation |
| Supabase DB | `DATABASE_URL` | **OBRIGATÓRIO** | Todas as operações |
| Redis/BullMQ | `REDIS_URL` | OPCIONAL | Degrada graciosamente |
| Stripe | `STRIPE_SECRET_KEY` | OPCIONAL (billing) | Planos pagos |
| Sentry | `SENTRY_DSN` | RECOMENDADO | Observabilidade |
| Cloudflare R2 | `R2_ACCESS_KEY_ID` | OPCIONAL (uploads) | Armazenamento de ficheiros |
| Anthropic | `ANTHROPIC_API_KEY` | OPCIONAL (AI) | Funcionalidades IA |
| ACRCloud | `ACRCLOUD_ACCESS_KEY` | OPCIONAL | Detecção de conteúdo |
| Spotify | `SPOTIFY_CLIENT_ID` | OPCIONAL | Integração streaming |
| Email | `RESEND_API_KEY` | RECOMENDADO | Notificações |

**Para cada integração, teste conectividade:**
```bash
GET /api/v1/health
```

Resposta completa:
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "redis":    { "status": "up" },
    "storage":  { "status": "up" }
  }
}
```

Se Redis estiver `down`, a API continua em modo degradado — aceitável.  
Se Database estiver `down`, a API falha completamente — critical.

---

## Fase 20 — Smoke Test Ponta a Ponta

### Passo 10: Obter JWT real

1. Frontend: faça login com o usuário criado no Passo 7
2. No browser DevTools → Network → qualquer request à API → copie o `Authorization: Bearer ...` header
3. Ou via Supabase SDK:
```javascript
const { data } = await supabase.auth.signInWithPassword({ email, password });
const token = data.session.access_token;
```

### Passo 11: Executar smoke test

```bash
API_URL=http://localhost:3001 \
SMOKE_TOKEN=<jwt-real> \
SMOKE_TENANT=10000000-0000-0000-0000-000000000002 \
npm run smoke-test
```

O smoke test verifica:
1. Health check 200
2. Endpoint protegido sem token → 401
3. Analytics dashboard
4. Listar artistas
5. Criar artista
6. Listar pipelines
7. Listar CRM contacts
8. Listar campanhas
9. Analytics revenue
10. Submit formulário público
11. Cross-tenant bloqueado (RLS)
12. Audit trail
13. Conversations
14. Cleanup automático

**Critério de aceite**: todos os testes passam (testes com `SKIP` são aceitáveis se sem credenciais).

### Passo 12: Verificar provisionamento completo

```bash
npm run provision
```

Executa em sequência: `verify:supabase` → `verify:rls` → `verify:tenant-isolation`

---

## Frontend — Configuração

### apps/web/.env.development

```bash
cp apps/web/.env.production apps/web/.env.development
# Edite com suas variáveis VITE_* reais de DEV
```

Variáveis obrigatórias para o frontend:
```
VITE_API_URL=http://localhost:3001/api/v1
VITE_SUPABASE_URL=https://REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### Iniciar frontend

```bash
cd apps/web
npm run dev
```

O frontend irá autenticar via Supabase Auth, obter um JWT, e enviá-lo para a API nos headers `Authorization: Bearer <jwt>` e `X-Tenant-ID: <tenant-uuid>`.

---

## Checklist Final de Provisionamento

```
FASE 16 — Banco de Dados
  [ ] Projeto Supabase criado
  [ ] DATABASE_URL configurado
  [ ] SUPABASE_URL + SUPABASE_ANON_KEY configurados
  [ ] ENCRYPTION_KEY gerado (64 hex)
  [ ] npm run db:migrate → sem erros
  [ ] npm run verify:supabase → ✓ tudo verde
  [ ] npm run verify:rls → ✓ todas as tabelas com RLS
  [ ] JWT Hook aplicado (supabase-jwt-hook.sql)

FASE 17 — Dados Operacionais
  [ ] Usuário criado no Supabase Auth
  [ ] SEED_ADMIN_SUB configurado
  [ ] npm run db:seed:operational → dados criados
  [ ] Login real funciona no frontend
  [ ] Dashboard carrega dados reais

FASE 18 — Tenant Isolation
  [ ] npm run verify:tenant-isolation → 7/7 testes passam
  [ ] Cross-tenant bloqueado confirmado

FASE 19 — Integrações
  [ ] Supabase Auth: CONECTADO
  [ ] PostgreSQL: CONECTADO
  [ ] Redis: CONECTADO ou OPCIONAL
  [ ] Stripe: CONFIGURADO ou PENDENTE (billing)
  [ ] Storage: CONFIGURADO ou PENDENTE
  [ ] Email: CONFIGURADO ou PENDENTE
  [ ] IA providers: CONFIGURADO ou PENDENTE
  [ ] GET /api/v1/health → status: ok

FASE 20 — Smoke Test
  [ ] API inicia sem erros
  [ ] npm run smoke-test → todos os testes passam
  [ ] Login real funciona
  [ ] CRUD artista funciona
  [ ] Pipeline kanban funciona
  [ ] CRM contacts funciona
  [ ] Formulário submit público funciona
  [ ] RLS bloqueia cross-tenant
  [ ] Logs aparecem no Sentry (se configurado)
```

---

## Status de Classificação por Componente

| Componente | IMPLEMENTADO | PROVISIONADO | CONECTADO | TESTADO | VALIDADO |
|-----------|:---:|:---:|:---:|:---:|:---:|
| Auth (Supabase JWT) | ✓ | Depende de .env.development | Depende de .env.development | ✓ | Após smoke test |
| Database (PostgreSQL) | ✓ | Após db:migrate | Após verify | ✓ | Após verify:supabase |
| RLS / Tenant Isolation | ✓ | Após db:migrate | ✓ | Após verify:rls | Após verify:tenant-isolation |
| BullMQ / Redis | ✓ | OPCIONAL | OPCIONAL | ✓ | Após health check |
| Billing / Stripe | ✓ | Após .env.development config | Após .env.development config | Parcial | Após webhook test |
| CRM Canonical | ✓ | Após db:migrate | ✓ | ✓ | Após smoke test |
| Pipelines | ✓ | Após db:migrate | ✓ | ✓ | Após smoke test |
| Campaigns | ✓ | Após db:migrate | ✓ | ✓ | Após smoke test |
| Analytics | ✓ | Após db:migrate | ✓ | ✓ | Após smoke test |
| AI Governance | ✓ | Após db:migrate | OPCIONAL | ✓ | Após AI key config |
| Conversations | ✓ | Após db:migrate | ✓ | ✓ | Após smoke test |
| Forms | ✓ | Após db:migrate | ✓ | ✓ | Após smoke test |
| Workflow Automation | ✓ | Após db:migrate | ✓ | ✓ | Após events test |
| Observability (Sentry) | ✓ | OPCIONAL | OPCIONAL | ✓ | Após SENTRY_DSN config |

---

## Troubleshooting

**Problema: `DATABASE_URL: connection refused`**
- Verifique se a URL usa o host correto do Supabase
- Em dev sem SSL: remova `?sslmode=require` da URL

**Problema: `JWT validation failed`**
- Verifique `SUPABASE_URL` — deve ser `https://REF.supabase.co` (sem `/` no fim)
- Verifique se o token não expirou (1 hora por padrão)

**Problema: `RLS: permission denied for table`**
- Execute `npm run verify:rls -- --fix` para aplicar políticas
- Verifique se `supabase-jwt-hook.sql` foi executado

**Problema: `app.current_tenant_id not set`**
- Verifique o `TenantGuard` — header `X-Tenant-ID` é obrigatório
- O frontend deve enviar `X-Tenant-ID` em todos os requests autenticados

**Problema: Coverage abaixo do threshold após seed**
- Execute `npm run test:ci` — deve passar com 13+ suites
- Não misture seed com ambiente de testes

**Problema: `ENCRYPTION_KEY must be 64 hex chars`**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
