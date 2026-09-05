# Monorepo Fix — Workspaces + Client Isolado

## What & Why
O `package.json` raiz declara apenas `"workspaces": ["apps/api"]` — o `client/` e os pacotes `packages/shared-types` e `packages/shared-zod` não fazem parte do workspace npm/turbo. Isso significa que:
- `turbo run dev` não orquestra o frontend corretamente
- `packages/shared-types` e `packages/shared-zod` não são instalados como workspaces reais
- O `client/` não tem `package.json` próprio (está no root), misturando dependências frontend com root scripts
- Não há `tsconfig references` ligando client → shared-types/shared-zod
- Vite tem acesso potencial a código Node/NestJS porque tudo está no mesmo escopo de dependências

## Done looks like
- `"workspaces"` inclui `["apps/api", "client", "packages/*"]`
- `client/package.json` existe com dependências frontend isoladas (react, vite, tailwind, shadcn, etc.)
- `packages/shared-types/package.json` e `packages/shared-zod/package.json` exportam corretamente
- `tsconfig.json` raiz usa `references` para client, api, shared-types, shared-zod
- `turbo.json` orquestra `dev`, `build`, `typecheck`, `lint` corretamente para todos os workspaces
- `vite.config.ts` não tem acesso a dependências NestJS/Node específicas do backend
- `turbo run dev` inicia frontend e backend sem erro

## Out of scope
- Migrar conteúdo existente dos packages shared-types/shared-zod (apenas estrutura)
- CI/CD GitHub Actions (apenas local funcional)
- Alteração de lógica de negócio

## Steps
1. **Atualizar workspaces** — adicionar `"client"` e `"packages/*"` ao array `"workspaces"` do `package.json` raiz; ajustar scripts `dev:web` e `build:web` para apontar ao workspace `client`
2. **Criar `client/package.json`** — extrair dependências frontend do root `package.json` para `client/package.json` com nome `@music-os-360/client`; manter devDependencies de build no root
3. **Configurar packages** — garantir que `packages/shared-types/package.json` e `packages/shared-zod/package.json` têm `"name"`, `"main"` e `"exports"` corretos; criar `index.ts` barrels se ausentes
4. **Corrigir tsconfig references** — root `tsconfig.json` referenciar client, api, packages; `client/tsconfig.json` referenciar shared-types e shared-zod; alias Vite `@shared-types`, `@shared-zod` alinhados
5. **Atualizar turbo.json** — garantir pipeline `dev` e `build` funcional para todos os workspaces; testar `turbo run typecheck` sem erros

## Relevant files
- `package.json`
- `turbo.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `vite.config.ts`
- `packages/shared-types`
- `packages/shared-zod`
- `client`
