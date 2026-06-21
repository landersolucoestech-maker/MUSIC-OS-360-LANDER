# PASSO 12-J.7 — RUNBOOK DE STAGING RBAC (para Infra/DevOps executar)

> IaC e scripts entregues pelo agente. **Execução (deploy, criação de usuários reais,
> serviços cloud) é responsabilidade da equipe de Infra/DevOps** — exige credenciais de
> cloud/Supabase e ações externas que o agente não executa.

## Artefatos entregues
- `docker-compose.observability.yml` — overlay com **web + prometheus + grafana** (postgres/redis/api vêm do `docker-compose.yml` base).
- `infra/observability/prometheus.yml` — scrape de `GET /metrics` da API.
- `infra/observability/grafana/provisioning/{datasources,dashboards}/*` — datasources (Prometheus + Postgres) e provider de dashboards.
- `infra/observability/grafana/dashboards/rbac-shadow.json` — dashboard RBAC shadow (10 painéis; já existente).
- `apps/api/scripts/provision-staging-rbac-users.ts` — provisiona 7 roles × 3 tenants (Supabase Admin + membership dual-write).
- `apps/api/test/rbac-shadow-harness/*` + `scripts/rbac-shadow-go-no-go.ts` — harness + GO/NO-GO (PASSO 12-J.5).

---

## 1. Banco + RBAC (staging Postgres)
```bash
# migrations 001–007 + catálogo reconciliado
DATABASE_URL=<staging_db> DB_SSL=false pnpm --filter @music-os-360/api db:migrate
DATABASE_URL=<staging_db> DB_SSL=false pnpm --filter @music-os-360/api db:seed   # 04_rbac_seed → 130/887
# validar:
#   permissions=130, role_permissions=887, org_members.role_id nulo=0
```

## 2. Subir stack (local-staging ou host)
```bash
# preencher .env (SUPABASE_URL, SUPABASE_ANON_KEY/JWT, ENCRYPTION_KEY, VITE_*)
docker compose -f docker-compose.yml -f docker-compose.observability.yml up -d
# serviços: postgres:5432  redis:6379  api:3001  web:5000  prometheus:9090  grafana:3000
```
- **API:** `http://<host>:3001/api/v1/health/live` → 200.
- **WEB:** `http://<host>:5000`.
- **Prometheus:** `http://<host>:9090` (target `musicos360-api` UP; se `METRICS_TOKEN` setado, configure bearer no `prometheus.yml`).
- **Grafana:** `http://<host>:3000` (admin/admin por default — trocar) → dashboard **RBAC → RBAC Shadow**.
- Exposição pública + SSL: via reverse proxy/ingress da sua plataforma (Nginx/Traefik/Cloud LB) — fora do compose.

## 3. Supabase (staging DESCARTÁVEL)
- Projeto Supabase de staging com Auth (password grant), JWT, service-role, SMTP, storage.
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` no `.env` da API.
- Validar login real: `POST {SUPABASE_URL}/auth/v1/token?grant_type=password`.

## 4. Tenants (3 ativos)
- Reusar 3 tenants de staging ou criar via app. Anotar `tenant_id` de A/B/C.

## 5. Usuários de homologação (7 roles × 3 tenants = 21)
```bash
PROVISION_CONFIRM=YES \
STAGING_SUPABASE_URL=<...> STAGING_SUPABASE_SERVICE_ROLE_KEY=<...> \
STAGING_DATABASE_URL=<staging_db> DB_SSL=false \
STAGING_TENANT_IDS=<tA>,<tB>,<tC> \
  pnpm --filter @music-os-360/api exec tsx scripts/provision-staging-rbac-users.ts
# imprime RBAC_HARNESS_*_EMAIL e a senha única → preencher .env do harness
```
Validar por usuário: `auth_user_id`, `membership`, `role_id`, `tenant_id`.

## 6. Health checks
| Componente | Check |
|---|---|
| API | `GET /api/v1/health/live` 200, `/ready` 200 |
| WEB | `GET /` 200 |
| Postgres | `SELECT 1` |
| Redis | `redis-cli ping` → PONG |
| Supabase | password grant retorna token |
| Prometheus | target `musicos360-api` = UP |
| Grafana | dashboard RBAC Shadow carrega |
| Sentry | `SENTRY_DSN` setado; evento de teste chega |

## 7. Coleta + GO/NO-GO (PASSO 12-J.5)
```bash
# preencher apps/api .env do harness (ver test/rbac-shadow-harness/README.md)
pnpm --filter @music-os-360/api rbac:shadow:run          # gera tráfego real (SHADOW)
DATABASE_URL=<staging_db> DB_SSL=false \
  pnpm --filter @music-os-360/api rbac:shadow:go-no-go    # exit 0 = APROVADO
```
**APROVADO** (≥1000 req, ≥10 endpoints, ≥5 roles, ≥3 tenants, would_allow=0, would_deny=0, cross_tenant=0, resolver_divergence=0) → promover `RBAC_PERSISTED_AUTHORITY=ON` (rollback por flag → SHADOW/OFF, instantâneo).

## Segurança / reversibilidade
- `RBAC_PERSISTED_AUTHORITY` permanece **SHADOW** durante toda a coleta.
- Grafana admin password e service-role keys via secrets (nunca commitar).
- Provision script é **gated** por `PROVISION_CONFIRM=YES` (anti-produção) e idempotente.
