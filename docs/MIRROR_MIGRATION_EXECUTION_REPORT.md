# MIRROR MIGRATION EXECUTION REPORT — MUSIC OS 360

Data: 2026-07-02  
Ambiente alvo: Supabase branch mirror `prod-mirror-rehearsal` / `ghiipsgujymfbwkmdrmj`.  
Regra aplicada: parar na primeira falha real.

## 1. Veredito

**FAIL**

Motivo: `db:migrate` falhou no branch mirror durante a migration `HardenContactsLeadUploadsRls20260620000002` porque a role PostgreSQL `musicos_app` nao existe no branch. A execucao foi interrompida conforme regra. `db:check`, E2E, tenant isolation, RBAC readiness e storage nao foram executados apos a falha.

Producao permaneceu intocada.

## 2. Ambiente Confirmado

Arquivos locais validados:

- `.env`
- `apps/api/.env`

Ambos apontavam para o mirror:

| Variavel | Host | Porta | Database | Usuario | Mirror |
|---|---|---:|---|---|---|
| `DATABASE_URL` | `aws-1-us-west-1.pooler.supabase.com` | 6543 | `postgres` | `postgres.ghiipsgujymfbwkmdrmj` | SIM |
| `APP_DATABASE_URL` | `aws-1-us-west-1.pooler.supabase.com` | 6543 | `postgres` | `postgres.ghiipsgujymfbwkmdrmj` | SIM |

Flags confirmadas:

```text
DATABASE_SESSION_CONTEXT_ENABLED=true
DATABASE_RLS_ENFORCEMENT=true
```

**Observacao importante:** `APP_DATABASE_URL` esta temporariamente igual ao owner/pooler do branch para destravar conectividade. A app role real `musicos_app` ainda nao existe no branch, o que causou a falha de migration.

## 3. Snapshot Antes

Snapshot coletado antes de aplicar migrations:

| Item | Valor |
|---|---:|
| Migration count | 30 |
| Ultima migration registrada | `CustomerCareConversationExtensions20260604000001` |
| Total de tabelas | 115 |

Row counts criticos:

| Tabela | Rows |
|---|---:|
| `tenants` | 2 |
| `organizations` | 3 |
| `org_members` | 11 |
| `artists` | 0 |
| `works` | 0 |
| `phonograms` | 0 |
| `contracts` | 0 |
| `releases` | 0 |
| `transactions` | 0 |
| `leads` | 0 |
| `crm_tasks` | 4 |
| `billing_subscriptions` | 2 |
| `invoices` | 0 |

## 4. Resultado `db:migrate`

Comando executado:

```bash
corepack.cmd pnpm --filter @music-os-360/api db:migrate
```

Resultado:

```text
FAIL
```

Migration que falhou:

```text
HardenContactsLeadUploadsRls20260620000002
```

Erro:

```text
role "musicos_app" does not exist
```

Trecho de query que falhou:

```sql
CREATE POLICY "contacts_tenant_select"
  ON public."contacts"
  FOR SELECT
  TO authenticated, musicos_app
  USING ("tenant_id" = (SELECT public.app_current_tenant_id()))
```

Stack trace relevante:

```text
QueryFailedError: role "musicos_app" does not exist
at HardenContactsLeadUploadsRls20260620000002.up
apps/api/src/database/migrations/20260620000002_HardenContactsLeadUploadsRls.ts:34:7
```

Classificacao:

```text
Falha real de pre-requisito de banco/role.
```

## 5. Snapshot Depois Da Falha

Foi coletado snapshot somente leitura apos a falha.

| Item | Valor |
|---|---:|
| Migration count apos falha | 70 |
| Total de tabelas apos falha | 151 |

Row counts criticos apos falha:

| Tabela | Rows |
|---|---:|
| `tenants` | 2 |
| `organizations` | 3 |
| `org_members` | 11 |
| `artists` | 0 |
| `works` | 0 |
| `phonograms` | 0 |
| `contracts` | 0 |
| `releases` | 0 |
| `transactions` | 0 |
| `leads` | 0 |
| `crm_tasks` | 4 |
| `billing_subscriptions` | 2 |
| `invoices` | 0 |
| `permissions` | 0 |
| `roles` | 20 |
| `role_permissions` | 0 |
| `rbac_decision_logs` | 0 |
| `contacts` | 0 |
| `operational_tasks` | MISSING |
| `billing_plans` | MISSING |
| `tenant_billing_state` | MISSING |
| `payment_events` | MISSING |
| `billing_settings` | MISSING |

Roles existentes verificadas:

| Role | `rolbypassrls` |
|---|---|
| `anon` | false |
| `authenticated` | false |
| `service_role` | true |

Role ausente:

```text
musicos_app
```

## 6. Validacoes Solicitadas Apos Migration

Nao executadas por regra de parada.

| Gate | Resultado | Motivo |
|---|---|---|
| `db:check` | NOT RUN | `db:migrate` falhou |
| `test:e2e` | NOT RUN | `db:migrate` falhou |
| `verify:tenant-isolation` | NOT RUN | `db:migrate` falhou |
| `rbac:readiness` | NOT RUN | `db:migrate` falhou |
| `storage:e2e` | NOT RUN | `db:migrate` falhou |

## 7. Falhas Encontradas

### P0-MIRROR-DB-001 — Role `musicos_app` ausente

**Local:** Supabase branch mirror `ghiipsgujymfbwkmdrmj`.

**Evidencia:**

```text
role "musicos_app" does not exist
```

**Impacto:**

- Bloqueia migrations de RLS que criam policies com `TO ... musicos_app`.
- Bloqueia validacao correta de `APP_DATABASE_URL` com role NOBYPASSRLS.
- Impede continuar para `db:check`, E2E, RLS, RBAC e storage.

**Correcao necessaria:**

Criar a role `musicos_app` no branch mirror antes de reexecutar migrations, usando o script existente como referencia:

```text
apps/api/scripts/create-app-db-user.sql
```

Essa correcao deve ser aplicada somente no mirror/staging, nunca em producao sem processo proprio.

### P0-MIRROR-DB-002 — Branch ficou parcialmente migrado

**Evidencia:**

- Migration count antes: 30.
- Migration count depois da falha: 70.
- A migration que falhou foi revertida, mas migrations anteriores foram commitadas individualmente.

**Impacto:**

- O branch mirror nao esta no estado inicial nem no estado final.
- Antes de nova tentativa, deve-se decidir se continua do ponto atual ou recria/reseta o branch mirror.

**Correcao necessaria:**

Opcao recomendada para ensaio limpo:

1. Recriar/resetar branch mirror.
2. Criar role `musicos_app`.
3. Rodar migrations do zero.

Opcao aceitavel se o objetivo for continuar o branch atual:

1. Criar role `musicos_app`.
2. Reexecutar `db:migrate`.
3. Validar `db:check`.

## 8. Arquivos Alterados

Arquivos de ambiente local ja estavam ajustados antes desta execucao e foram usados:

- `.env`
- `apps/api/.env`

Arquivo criado nesta execucao:

- `docs/MIRROR_MIGRATION_EXECUTION_REPORT.md`

Nenhum arquivo de codigo de negocio foi alterado.

Nenhuma migration foi editada.

## 9. Proximo Passo Recomendado

Antes de nova execucao:

1. Confirmar se o branch mirror deve ser continuado no estado parcial atual ou recriado.
2. Criar a role app `musicos_app` no mirror.
3. Confirmar que `musicos_app` tem `rolbypassrls=false`.
4. Configurar `APP_DATABASE_URL` para usar `musicos_app`, nao o owner.
5. Reexecutar:

```bash
corepack pnpm --filter @music-os-360/api db:migrate
corepack pnpm --filter @music-os-360/api db:check
```

Somente depois de `db:check` PASS:

```bash
corepack pnpm --filter @music-os-360/api test:e2e
corepack pnpm --filter @music-os-360/api verify:tenant-isolation
corepack pnpm --filter @music-os-360/api rbac:readiness
corepack pnpm --filter @music-os-360/api storage:e2e
```

## 10. Veredito Final

**FAIL**

PASS nao e permitido porque:

- `db:migrate` falhou.
- `db:check` nao foi executado apos migration.
- `test:e2e` nao foi executado.
- `verify:tenant-isolation` nao foi executado.
- `rbac:readiness` nao foi executado.
- `storage:e2e` nao foi executado.

PARTIAL nao e adequado para este ciclo porque a fase principal, aplicar migrations no mirror, falhou em pre-requisito de role.
