# MUSIC OS 360 — Database Operations

## Stack
- **Engine**: PostgreSQL 15+ (Supabase)
- **ORM**: TypeORM 0.3.x
- **Migrations table**: `musicos360_migrations`
- **Schema governance**: migrations versionadas — `synchronize: false` sempre

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
