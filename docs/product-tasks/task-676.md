---
title: Backend + Frontend — Conectar e Wired
---
# Backend + Frontend — Conectar e Wired

## What & Why
O backend NestJS sobe mas crasha por ter placeholders inválidos em `apps/api/.env` (Clerk fake, Redis localhost, Neon vazio). O frontend tem `aiApiPlugin()` no Vite que chama OpenAI direto sem passar pelo backend, e o proxy não cobre `/api/*` para o NestJS. O objetivo é conectar tudo corretamente sem quebrar a estrutura existente.

## Done looks like
- `npm run dev:api` sobe sem crash (`NestJS listening on port 3001`)
- Drizzle conecta ao Neon sem erro de conexão
- Clerk autentica requisições reais no backend
- BullMQ/ioredis conecta ao Upstash sem erro
- `aiApiPlugin()` removida do vite.config.ts; requests `/api/ai/*` chegam ao NestJS
- Proxy Vite cobre `/api` → `localhost:3001`
- `.env` raiz existe com `VITE_CLERK_PUBLISHABLE_KEY` e `VITE_USE_MOCK=true`
- Frontend inicia sem erro de Clerk no console

## Out of scope
- Alterar schema do banco (já sincronizado via db:push)
- Alterar regras de negócio, módulos ou componentes
- Desabilitar MOCK_MODE (fica `true` inicialmente)
- Configurar Stripe, Resend, Sentry, ACRCloud, plataformas de streaming

## Steps

1. **Adicionar Clerk keys como Replit secrets** — Usar a skill `environment-secrets` para solicitar ao usuário os valores de `CLERK_SECRET_KEY` e `VITE_CLERK_PUBLISHABLE_KEY` e adicioná-los como secrets do Replit (nunca hardcoded em arquivo).

2. **Corrigir `apps/api/.env`** — Atualizar o arquivo para usar as variáveis de ambiente já disponíveis no Replit:
   - `NEON_DATABASE_URL` e `NEON_DATABASE_DIRECT_URL` → ler dos secrets Replit (já injetados via `process.env`)
   - `UPSTASH_REDIS_URL` e `UPSTASH_REDIS_TOKEN` → ler dos secrets Replit
   - `REDIS_QUEUE_URL` → verificar se `UPSTASH_REDIS_URL` é `rediss://` (ioredis-compatível); se for URL HTTP REST do Upstash, construir a URL Redis protocolo a partir de `UPSTASH_REDIS_TOKEN`; substituir `redis://localhost:6379`
   - `CLERK_SECRET_KEY` → usar o secret recém-adicionado no passo 1
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` → ler dos secrets Replit
   - Manter `ENCRYPTION_KEY` com valor seguro (64 chars hex aleatório, não all-zero)
   - Manter variáveis opcionais (`STRIPE_*`, `RESEND_*`, `SENTRY_*`, etc.) vazias — schema Zod já aceita optional

3. **Criar `.env` na raiz do projeto** — Adicionar arquivo com:
   - `VITE_CLERK_PUBLISHABLE_KEY=<valor do secret>`
   - `VITE_USE_MOCK=true`
   - `VITE_MOCK_MODE=true`
   Essas variáveis são lidas pelo Vite em dev; não expõem nada sigiloso além da publishable key (que é pública por design do Clerk).

4. **Remover `aiApiPlugin()` do `vite.config.ts`** — Deletar completamente a função `aiApiPlugin()` (linhas 7-63) e seu uso em `plugins: [react(), aiApiPlugin(), acrcloudApiPlugin()]`. Manter `acrcloudApiPlugin()` intacto (não envia credenciais ao browser). Verificar se algum arquivo do frontend importa ou depende do endpoint `/api/ai/generate` via chamada direta — se sim, o endpoint já existe no NestJS (`AIController`), portanto o proxy cobre automaticamente.

5. **Corrigir proxy Vite** — Na seção `server.proxy` de `vite.config.ts`, adicionar entrada genérica para `/api` apontando para `http://localhost:3001`. Manter as entradas específicas existentes (`/projects/upload-audio`, `/projects/audio`, `/socket.io`). A entrada `/api` deve ter `changeOrigin: true` e NÃO fazer rewrite de path (o NestJS já serve sob `/api/v1` diretamente).

6. **Validar backend sobe sem crash** — Iniciar o workflow `Start API` e confirmar via logs que NestJS está ouvindo na porta 3001, sem erros de validação de env, sem falha de conexão ao banco ou Redis, sem erro de Clerk.

7. **Validar frontend conecta** — Confirmar que o workflow `Start application` sobe, o Clerk inicializa corretamente e requisições a `/api/*` chegam ao backend (verificar Network tab ou logs do servidor).

## Relevant files
- `apps/api/.env`
- `apps/api/src/core/config/env.schema.ts`
- `vite.config.ts:7-63,154-155,232-249`
- `.env.example`