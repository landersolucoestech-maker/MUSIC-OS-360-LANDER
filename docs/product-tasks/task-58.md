---
title: Corrigir URL do endpoint AI no analisador de contratos
---
---
title: Corrigir URL do endpoint AI no semantic-parser — /api/ai/generate → /api/v1/ai/generate
---
# Corrigir URL do endpoint AI no semantic-parser

## What & Why

`apps/web/src/modules/contracts/services/semantic-parser.service.ts` chama
`fetch("/api/ai/generate", ...)` diretamente. O Vite proxy encaminha `/api` para
`127.0.0.1:3001` sem rewrite, por isso o pedido chega ao NestJS como
`/api/ai/generate` — mas o NestJS serve o endpoint em `/api/v1/ai/generate`.
Resultado: 404, e a análise semântica de contratos nunca chega à OpenAI.

O `api-client.ts` já usa o padrão correto (`${API_BASE_URL}/api/v1${path}`).
O serviço semântico apenas bypass esse client com um fetch manual e path errado.

## Done looks like

- `semantic-parser.service.ts` chama `/api/v1/ai/generate` (ou usa o `apiClient`)
- O Contract Intelligence Engine analisa um contrato e retorna resultado (HTTP 200) sem 404
- Zero erros TypeScript (`EXIT:0`)
- Zero novas regressões noutros serviços AI

## Out of scope

- Migrar todos os providers AI para usar `apiClient` (trabalho separado)
- Alterar o prefixo global da API

## Steps

1. **Corrigir o path em `semantic-parser.service.ts` linha 132**: mudar
   `fetch("/api/ai/generate", ...)` para `fetch("/api/v1/ai/generate", ...)`
2. **TypeCheck**: `cd apps/web && npx tsc --noEmit -p tsconfig.app.json 2>&1; echo "EXIT:$?"`
3. **Smoke test manual**: fazer uma chamada a `/api/v1/ai/generate` a partir do browser
   e confirmar HTTP 200 na UI do Contract Intelligence Engine

## Relevant files

- `apps/web/src/modules/contracts/services/semantic-parser.service.ts:132`
- `apps/web/src/shared/lib/api-client.ts:119` (padrão correto de referência)
- `apps/web/vite.config.ts:165` (proxy: `/api` → `127.0.0.1:3001`, sem rewrite)