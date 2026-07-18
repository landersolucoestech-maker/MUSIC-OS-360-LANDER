# Migrations do Domínio Financeiro (M0–M9)

> Materialização da especificação da **Fase 12 — Financial Database Design**
> (decisões oficiais das Fases 11/12, Q1–Q10). Criadas na **Fase 13A** —
> **NENHUMA executada ainda**; a execução no branch DEV é a **Fase 13B** e
> exige autorização própria.

## Sequência (ordem obrigatória)

| M | Arquivo (`apps/api/src/database/migrations/`) | Conteúdo |
|---|---|---|
| M0 | `20260718000000_FinancialPrereqs.ts` | pgcrypto (idempotente) + `UNIQUE (tenant_id, id)` em projects/artists/phonograms/releases/clients/contracts/events (base das FKs compostas — I6) |
| M1 | `20260718000001_FinancialEnums.ts` | 9 enums fechados (status SEM paid/received/overdue/partially — `settled` unificado; `overdue` é derivado) |
| M2 | `20260718000002_FinancialCategories.ts` | templates globais (somente leitura) + categorias por tenant (hierarquia ≤3, natureza → linha do P&L, desativação lógica, trigger de nível) |
| M3 | `20260718000003_FinancialPartiesAccounts.ts` | contas financeiras (saldo derivado), contrapartes (FK tipada opcional p/ artists/clients), centros de custo |
| M4 | `20260718000004_FinancialTransactions.ts` | transações v2 (competência/vencimento/liquidação, moeda, parcelas, estorno) + máquina de estados + imutabilidade de settled + optimistic locking |
| M5 | `20260718000005_TransactionAllocations.ts` | alocações em DIMENSÕES PARALELAS (project/artist/phonogram/release) + `fn_largest_remainder` + constraint trigger deferred de somas (I5/I7) |
| M6 | `20260718000006_FinancialBudgets.ts` | orçamento por projeto (1 vigente) + revisões append-only |
| M7 | `20260718000007_FinancialRls.ts` | ENABLE+FORCE RLS + policies `_isolation`/`migrator_admin_all` + grants condicionais (roles `musicos_*` NÃO são criadas em migration) |
| M8 | `20260718000008_PerformanceMetricEntries.ts` | métricas de desempenho (nunca transação — I12), dedupe UNIQUE parcial, correção via supersede, RLS própria |
| M9 | `20260718000009_FinancialOperationalBridges.ts` | `financial_project_id` opcional em marketing/audiovisual_projects (Q6/Q7 — sem associação automática) |

## Dependências externas (provisionamento, fora de migration)

- Roles de cluster `musicos_migrator`/`musicos_app`: grants e policy do
  migrator são **condicionais** (`IF EXISTS pg_roles`) — sem as roles, a
  migration passa e os grants ficam pendentes de reexecução do provisionamento.
- `private_get_tenant_id()`: criada pela cadeia existente
  (`20260612000001_PortableRlsTenantContext`) — M7/M8 rodam **depois** na ordem
  natural da cadeia.
- Seed dos templates de categoria: **carga técnica via `db:seed`** (estrutura e
  dados separados — nenhuma migration insere dados).

## Invariantes protegidas no banco

I1 (amount>0) · I5/I7 (somas por dimensão, maior resto, trigger deferred) ·
I6 (FKs compostas com tenant — cross-tenant impossível) · I8 (settled imutável)
· I9/I10 (RESTRICT + desativação lógica) · I16 (status↔settlement_date) ·
I17 (dedupe + correção referenciada) · máquina de estados
(`pending→settled|cancelled`, `settled→reversed`) · exclusão física proibida
(transações e métricas) · transferência sem alocação e sem P&L (trigger).
As demais invariantes (I2/I3/I11/I13/I14/I15) são de consulta/serviço e serão
protegidas no backend + testes de conciliação (fase de backend).

## Algoritmo de maior resto

Normativo na Fase 12 §10. Duas materializações equivalentes:
`fn_largest_remainder(numeric, numeric[])` (SQL, M5 — para import/validação) e
`apps/api/src/modules/financial/domain/largest-remainder.ts` (TypeScript puro,
BigInt, sem float — caminho de escrita do backend). Desempate: maior fração;
empate → menor índice de entrada. Parcela que resulte em R$ 0,00 → rejeição.

## Testes desta fase (sem banco)

- `largest-remainder.spec.ts` — casos mínimos do mandato + normativos.
- `financial-migrations.static.spec.ts` — contratos estáticos (existência,
  ordem, up/down, ausência de secrets/refs proibidos/OWNER TO/seeds,
  FKs compostas, RLS+FORCE, CASCADE restrito aos 2 casos justificados).

## Fase 13B (execução no DEV) — pré-requisitos

Senha do DEV resetada · token temporário revogado · `SUPABASE_ACCESS_TOKEN`
ausente · `.env` local exclusivamente no DEV (`rypnevnfipygyhysqpdo`) ·
`env:check` verde · guards de banco ativos (commit `79519134`) · working tree
conhecido · provisionamento de roles antes de M7 · plano de rollback = `down()`
por migration (DEV vazio dispensa backup).
