# Matriz de Ambientes Supabase

> Fonte única de decisão sobre **qual projeto Supabase cada ambiente pode usar**.
> Nasceu do incidente de isolamento de 2026-07-16/17 (migration e fixture de
> verificação aplicadas na branch MAIN acreditando ser DEV).

## Matriz (imutável por ambiente)

| NODE_ENV | Ref permitido | URL | Observações |
|---|---|---|---|
| `development` | `sxdhnhoupjrnntrmjtyn` | https://sxdhnhoupjrnntrmjtyn.supabase.co | Branch **dev** do projeto. Único aceito localmente. |
| `test` | *(nenhum remoto)* | — | Sem fallback silencioso: qualquer ref Supabase resolvido é erro. Postgres local é permitido. |
| `staging` | `khnaxcgjnvhhtgkozsif` | https://khnaxcgjnvhhtgkozsif.supabase.co | Confirmar por fonte administrativa antes do primeiro uso. |
| `production` | `jtizbxbrwyczbkdiruoq` | https://jtizbxbrwyczbkdiruoq.supabase.co | Confirmar por fonte administrativa antes do primeiro uso. |

**Branch MAIN** (`sxmfeocztlztvpdnxayk`, https://sxmfeocztlztvpdnxayk.supabase.co)
é a branch principal do projeto Supabase — **não é sinônimo de produção** e não
é aceita por nenhum `NODE_ENV` de runtime. Refs banidos permanentes:
`mkyvkciwyhfawmvluugb` (branch preview sem tabelas públicas).

## Regras de seleção

1. **A identidade do ambiente é o project ref/hostname real** extraído de
   `SUPABASE_URL`/`DATABASE_URL`/JWTs — **nunca** o nome do arquivo `.env`,
   o diretório, ou a intenção declarada.
2. Denylist cruzada: o ref de um ambiente é **explicitamente proibido** nos
   demais, mesmo que alguém edite a allowlist — a proibição prevalece.
3. Todas as variáveis (`SUPABASE_URL`, `VITE_SUPABASE_URL`, `DATABASE_URL`,
   `DIRECT_DATABASE_URL`, `APP_DATABASE_URL`, e o `payload.ref` dos 3 JWTs)
   devem apontar para o **mesmo** projeto; divergência é erro fatal.
4. Hostname `*.supabase.co/com` sem ref extraível é erro (malformado).

## Procedimento de confirmação administrativa

Antes de apontar qualquer ambiente para um ref (novo ou existente):

1. Confirmar via **dashboard Supabase** ou **API de gerenciamento**
   (`GET /v1/projects` e `GET /v1/projects/{ref}/branches`) qual branch o ref
   representa (`is_default: true` = MAIN) e a qual projeto pertence.
2. Registrar a confirmação (data + fonte) no PR que alterar as constantes.
3. Atualizar os **três** validadores em conjunto (o guard exige paridade):
   - `apps/api/src/core/config/env.schema.ts` (fonte de verdade + testes);
   - `scripts/env-check.mjs`;
   - `apps/web/scripts/assert-supabase-env.mjs`.

## Onde o guard atua

- **Boot da API** (`main.ts` → `collectSupabaseEnvErrors`): fail-closed, aborta
  o processo com a lista de violações.
- **Gate de repo** (`pnpm env:check` → `scripts/env-check.mjs`).
- **Dev/build do frontend** (`assert-supabase-env.mjs` via Vite).
- **Testes** (`env.schema.spec.ts`): matriz completa executada na suíte.
