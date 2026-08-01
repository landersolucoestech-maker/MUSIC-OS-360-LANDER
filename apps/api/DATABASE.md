# MUSIC OS 360 — Database Operations

## Stack
- **Engine**: PostgreSQL 15+ (Supabase)
- **ORM**: TypeORM 0.3.x
- **Migrations table**: `musicos360_migrations`
- **Schema governance**: migrations versionadas — `synchronize: false` sempre

---

## Fonte única de migrations (canonical source)

**As migrations oficiais deste projeto vivem exclusivamente em
`apps/api/src/database/migrations/` e são executadas pelo runner TypeORM do
próprio projeto (`db:migrate` / `db:check`, ver [scripts/db-ops.ts](scripts/db-ops.ts)).
O tracking canônico do que já foi aplicado é a tabela `musicos360_migrations`.**

Não existe — e não deve passar a existir — um segundo tracker concorrente:

- `supabase/migrations/` contém apenas 2 arquivos SQL antigos (snapshot inicial
  + uma reconciliação pontual). **Não é a fonte de verdade e não deve ser
  atualizado em paralelo** a cada migration TypeORM nova. Não criar backfill
  artificial ali só para "sincronizar" com o Supabase Branching — isso criaria
  exatamente o tracker duplo que este documento existe para evitar, sem
  nenhum ganho real (o schema já é validado por `db:check` + fresh-DB CI).
- **Supabase Branching** (o mecanismo nativo de branches do Supabase, visível
  no dashboard) observa `supabase/migrations/` para decidir o status de uma
  branch. Como este projeto nunca alimentou esse mecanismo, o badge de status
  de uma branch (ex.: `MIGRATIONS_FAILED` na branch DEV) é **metadata
  histórica do Supabase Branching, sem relação com a saúde real do schema**.
  Não reflete migrations pendentes, RLS quebrado, ou qualquer problema atual —
  só reflete que o Branching nunca reconheceu o histórico real de migrations
  (que está inteiramente em `musicos360_migrations`).
- A saúde real do banco é determinada por, nesta ordem: `db:check` (zero
  migrations pendentes), a suíte de fresh-DB em CI (migrations aplicam limpo
  em um Postgres novo), e as verificações de RLS/tenant-isolation
  (`verify:rls`, `verify:tenant-isolation`) — nunca pelo status de branch do
  Supabase.
- Nenhuma migration deve ser aplicada manualmente (SQL solto via editor/CLI)
  sem passar pelo runner e sem ficar registrada em `musicos360_migrations`.
  Uma aplicação que não registra a migration cria exatamente a divergência
  entre "schema real" e "tracking oficial" que este documento existe para
  prevenir.
- Não editar tabelas internas do Supabase (`supabase_migrations.*` ou
  equivalentes) para forjar/"consertar" o status de uma branch. Se o
  Branching precisar reconhecer o histórico real algum dia, isso é uma
  decisão arquitetural separada (backfillar `supabase/migrations/` de forma
  deliberada, ou desativar formalmente o Branching para este projeto) — não
  um ajuste manual de estado interno.

Um guard de CI (`scripts/verify-migration-source-of-truth.mjs`) falha o build
se essa fonte única for violada silenciosamente — ver seção de CI abaixo.

### Nota: dois DataSources dentro do próprio TypeORM

Existem hoje dois `DataSource` distintos dentro de `apps/api`, e isso **não**
é o mesmo problema que `supabase/migrations` — é uma divergência interna,
pré-existente, entre dois arquivos que deveriam concordar:

- `src/database/datasource.ts` — usado pelo runner real (`db-ops.ts`, logo
  `db:migrate`/`db:check`/CI). Descobre migrations via glob
  (`migrations/*.{ts,js}`), então nunca fica "desatualizado" por arquivo.
- `src/database/database.module.ts` — DataSource da própria aplicação NestJS
  em runtime, com um array `ALL_MIGRATIONS` explícito (import por import).
  Hoje esse array está **defasado em ~50 migrations** (não inclui nada entre
  `20260712000001` e `20260719000025`) — descoberto ao escrever o guard
  acima, não corrigido nesta parte por ser cirurgia não-relacionada em
  código de terceiros sem revisão dedicada.

Isso não compromete `db:check`/fresh-DB/RLS (que usam `datasource.ts`), mas é
uma reconciliação pendente: decidir se `database.module.ts` deve passar a
usar o mesmo glob, ou se seu array explícito tem um propósito que exige
listagem manual — e, nesse caso, atualizá-lo.

---

## Pré-requisitos

Definir a variável de ambiente `DATABASE_URL` (no seu gerenciador de secrets/`.env` local) antes de qualquer operação:

```
DATABASE_URL=postgresql://postgres:<password>@<host>:5432/postgres
```

---

## Comandos

```bash
# Aplicar todas as migrations pendentes (dev + produção)
npm run db:migrate

# Reverter a última migration (PROIBIDO em produção sem CONFIRM_ROLLBACK)
npm run db:rollback

# Ver estado das migrations — sai com código 1 se existirem pendentes
npm run db:check

# Popular base de dados com dados de desenvolvimento
npm run db:seed

# [DEV ONLY] Drop total + migrate + seed  (BLOQUEADO em NODE_ENV=production)
npm run db:reset

# Gerar uma nova migration baseada nas entidades TypeORM
npm run db:generate -- NomeDaMigration
# Executar manualmente o comando gerado como output do script acima
```

---

## Fluxo de desenvolvimento normal

```
1. Alterar entidade em src/database/entities.ts
2. npm run db:generate -- DescricaoDaMudanca
3. Revisar o ficheiro gerado em src/database/migrations/
4. npm run db:migrate
5. Testar localmente
6. Commit do ficheiro de migration junto com a alteração da entidade
```

---

## Tabelas do schema

| Grupo         | Tabelas                                                            |
|---------------|---------------------------------------------------------------------|
| Multi-tenant  | organizations, tenants, org_members, billing_subscriptions         |
| Catálogo      | artists, works, phonograms, shares                                 |
| Contratos     | contracts, contract_templates                                      |
| Financeiro    | transactions, invoices                                             |
| CRM           | clients, leads, lead_interactions                                  |
| Marketing     | campaigns, briefings                                               |
| Operações     | events, projects, releases                                         |
| Monitoramento | takedowns, content_detections, ecad_reports, artist_goals         |
| RH            | employees, payroll_entries, leave_requests                         |
| Plataforma    | uploads, integrations, oauth_connections, webhook_events           |
| Sistema       | audit_logs, ai_jobs, notifications, support_tickets                |

**Total: 35 tabelas**

---

## Políticas de segurança

### Migrations em produção
- `synchronize: false` está hardcoded — nunca alterar
- `db:reset` é bloqueado em `NODE_ENV=production`
- `db:rollback` em produção requer `CONFIRM_ROLLBACK=YES_I_KNOW_WHAT_I_AM_DOING`
- `MigrationValidatorService` mata o processo no boot se existirem migrations pendentes em produção

### Dados sensíveis
- Campos `*_encrypted` contêm dados cifrados via serviço `EncryptionService`
- Nunca logar ou expor esses campos em raw

### Seeds
- Seeds executam com `ON CONFLICT DO NOTHING` — idempotentes
- Em produção, requerem a flag `--force` explícita

---

## Adicionar nova migration

```bash
# 1. Fazer a alteração na entidade (entities.ts)
# 2. Gerar a migration com TypeORM CLI:
npx typeorm migration:generate \
  -d src/database/datasource.ts \
  src/database/migrations/$(date +%Y%m%d%H%M%S)_NomeDaMigration

# 3. Verificar o SQL gerado
# 4. Aplicar:
npm run db:migrate
```

---

## Convenções de nomes

| Tipo                | Padrão                                 | Exemplo                              |
|---------------------|----------------------------------------|--------------------------------------|
| Migration file      | `YYYYMMDDHHMMSS_PascalCase.ts`         | `20240615120000_AddArtistBio.ts`     |
| Class name          | `PascalCase + timestamp`               | `AddArtistBio20240615120000`         |
| Índice              | `idx_<tabela>_<coluna(s)>`             | `idx_artists_tenant_id`              |
| Índice único        | `uq_<tabela>_<coluna(s)>`              | `uq_tenants_slug`                    |
| FK                  | `fk_<tabela>_<campo>_<ref_tabela>`     | `fk_artists_tenant_id_tenants`       |

---

## Troubleshooting

**`DATABASE_URL não definida`** — Definir a variável de ambiente no seu gerenciador de secrets (não em `.env` em produção).

**`Existem migrations pendentes`** — Executar `npm run db:migrate`.

**`Falha ao conectar PostgreSQL`** — Verificar se o Supabase está ligado e o `DATABASE_URL` está correcto.

**`relation "xxx" already exists`** — A migration usa `IF NOT EXISTS` — pode ser re-executada com segurança.
