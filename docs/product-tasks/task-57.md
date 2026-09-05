---
title: Corrigir CORS da API — aceitar domínios Replit
---
# Corrigir CORS da API NestJS para domínios Replit

## What & Why

O NestJS bloqueia pedidos do browser com `CORS: https://...worf.replit.dev não permitido`. O `main.ts` lê `CORS_ORIGINS` (padrão `http://localhost:5000`) e rejeita qualquer origem não listada. Em desenvolvimento no Replit, o browser envia pedidos a partir de `https://*.worf.replit.dev` que não está na lista. Resultado: a análise semântica de contratos (Contract Intelligence Engine) retorna HTTP 500 em vez de chamar a OpenAI.

## Done looks like

- A API NestJS aceita pedidos de origens `*.replit.dev`, `*.replit.app`, e `localhost:*` sem retornar erro CORS
- O endpoint `/api/v1/ai/generate` responde com o resultado da OpenAI (HTTP 200) quando chamado a partir do browser no Replit
- Em produção, o comportamento do `CORS_ORIGINS` mantém-se igual — só aceita origens explicitamente listadas
- Zero erros TypeScript (`EXIT:0`)

## Out of scope

- Mudanças noutros middlewares ou guards de autenticação
- Configuração de CORS para o frontend Vite (já gerido pelo proxy)

## Steps

1. **Actualizar CORS em `main.ts`** — além de verificar `allowedOrigins`, aceitar automaticamente qualquer origem que termine em `.replit.dev` ou `.replit.app` (usando `origin.endsWith()`). Manter a lógica existente para as origens declaradas explicitamente. Em `NODE_ENV !== 'production'`, também aceitar qualquer `localhost`.
2. **TypeScript check** — confirmar `EXIT:0` após a alteração.
3. **Restart da API** — reiniciar o workflow "Start API" e confirmar que a porta 3001 responde.

## Relevant files

- `apps/api/src/main.ts:84-96`