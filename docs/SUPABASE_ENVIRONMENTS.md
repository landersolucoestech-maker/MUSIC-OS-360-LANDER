# Matriz de Ambientes Supabase

> Fonte única de decisão sobre **qual projeto Supabase cada ambiente pode usar**.
> Nasceu do incidente de isolamento de 2026-07-16/17 (migration e fixture de
> verificação aplicadas na branch MAIN acreditando ser DEV).

## Matriz (imutável por ambiente)

| NODE_ENV | Ref permitido | URL | Observações |
|---|---|---|---|
| `development` | `rypnevnfipygyhysqpdo` | https://rypnevnfipygyhysqpdo.supabase.co | Ambiente **DEV**. Único aceito localmente. |
| `test` | *(nenhum remoto)* | — | Sem fallback silencioso: qualquer ref Supabase resolvido é erro. Postgres local é permitido. |
| `staging` | `jjnnjnxjkqipgqebijen` | https://jjnnjnxjkqipgqebijen.supabase.co | Ambiente **staging** persistente. |
| `production` | `sxmfeocztlztvpdnxayk` | https://sxmfeocztlztvpdnxayk.supabase.co | Projeto principal usado exclusivamente para produção após liberação formal. |

O ref de produção `sxmfeocztlztvpdnxayk` corresponde ao projeto Supabase principal (`main`). Ele deve permanecer sem alterações até a aprovação formal da promoção para produção.

Refs banidos permanentes:

- `mkyvkciwyhfawmvluugb` — branch preview sem tabelas públicas;
- `sxdhnhoupjrnntrmjtyn` — primeiro branch DEV, excluído;
- `jtizbxbrwyczbkdiruoq` — ref legado/obsoleto que não pertence à matriz atual.

## Regras de seleção

1. **A identidade do ambiente é o project ref/hostname real** extraído de `SUPABASE_URL`, `DATABASE_URL` e JWTs — nunca o nome do arquivo `.env`, o diretório ou a intenção declarada.
2. Denylist cruzada: o ref de um ambiente é explicitamente proibido nos demais, mesmo que alguém edite a allowlist.
3. Todas as variáveis (`SUPABASE_URL`, `VITE_SUPABASE_URL`, `DATABASE_URL`, `DIRECT_DATABASE_URL`, `APP_DATABASE_URL` e o `payload.ref` dos JWTs) devem apontar para o mesmo projeto; divergência é erro fatal.
4. Hostname `*.supabase.co/com` sem ref extraível é erro.
5. O ambiente `production` só aceita `sxmfeocztlztvpdnxayk`.
6. Nenhuma migration ou alteração pode ser aplicada ao projeto de produção antes da liberação formal.

## Procedimento de confirmação administrativa

Antes de apontar qualquer ambiente para um ref:

1. Confirmar via dashboard Supabase ou API de gerenciamento qual projeto o ref representa.
2. Registrar a confirmação no PR que alterar as constantes.
3. Atualizar os três validadores em conjunto:
   - `apps/api/src/core/config/env.schema.ts`;
   - `scripts/env-check.mjs`;
   - `apps/web/scripts/assert-supabase-env.mjs`.
4. Atualizar os testes de matriz e os workflows que contenham refs hardcoded.

## Onde o guard atua

- **Boot da API** (`main.ts` → `collectSupabaseEnvErrors`): fail-closed.
- **Gate de repositório** (`pnpm env:check` → `scripts/env-check.mjs`).
- **Dev/build do frontend** (`assert-supabase-env.mjs` via Vite).
- **Testes** (`env.schema.spec.ts`).
- **CI/CD**, antes de build, migrations ou deploy.
