# PASSO 12-J.3A

## Resumo Executivo

A instrumentação necessária para observar decisões ACTIVE e SHADOW foi
implementada sem ativar a autoridade persistida. O short-circuit de deny foi
removido para rotas com `@RequirePermission`: a leitura SHADOW ocorre antes do
403 legado. Eventos, métricas, audit logs, Sentry, cache distribuído, retenção,
dashboard e comando de readiness estão conectados.

O readiness permanece reprovado porque a consulta ao banco real, após a
migration, encontrou zero requests. Nenhum número foi simulado.

## Arquitetura RBAC

O fluxo e as fontes reais estão documentados em `RBAC_EXECUTION_FLOW.md`.
ACTIVE permanece na hierarquia legada; SHADOW consulta exclusivamente o modelo
persistido. O modo configurado continua `SHADOW`.

## Evento Unificado

Contrato: `apps/api/src/modules/rbac/contracts/rbac-event.contract.ts`.
Inclui correlação, tenant/workspace, usuário/membership, role, permissão,
endpoint, decisões, divergência, latência, cache e authority mode.

## Telemetria E Audit Logs

- Migration: `20260614000008_CreateRbacDecisionLogs.ts`, aplicada em
  14 de junho de 2026.
- Tabela temporalmente particionada e indexada.
- Retenção configurável, default 30 dias.
- Espelho append-only em `audit_logs`.
- Eventos: ALLOW, DENY, WOULD_ALLOW, WOULD_DENY, CACHE_HIT e CACHE_MISS.

## Métricas E Dashboard

As oito métricas obrigatórias estão expostas por `/metrics`. O dashboard
Grafana inclui decisões por minuto, divergências, endpoints, recursos, roles,
tenants, latência e cache hit rate.

## Cache E Multi-Tenancy

Permissões usam L1 local e L2 Redis com pub/sub. Tenant e membership usam Redis
compartilhado com fallback PostgreSQL; mutações de membership invalidam o
cache. Todas as chaves e consultas mantêm escopo de tenant.

## Testes

Cobertura focada executada:

- PermissionResolver
- RolesGuard
- PermissionsGuard
- TenantGuard
- correlação ACTIVE/SHADOW
- ALLOW_MATCH, DENY_MATCH, WOULD_ALLOW, WOULD_DENY

Resultado desta implementação: 568/568 testes da API passando, build e
typecheck limpos. A cobertura focada dos quatro componentes RBAC medidos foi
82,04% de linhas; portanto a meta de 95% não foi atingida.

## Coleta Shadow

Use `npm run rbac:readiness` em `apps/api`. O comando consulta somente dados
persistidos reais e verifica os mínimos de requests, endpoints, recursos,
roles e tenants. Não gera tráfego nem dados.

## Divergências

O comando lista resource, action, endpoint, tenant, role, permission,
comparison e resolver reason. Classificação BUG, CONFIGURAÇÃO, CATÁLOGO, DADOS,
CACHE ou CÓDIGO requer triagem humana baseada na evidência; não foi inferida
sem amostra real.

## Matriz De Risco

| Risco | Estado |
|---|---|
| Privilege escalation (`WOULD_ALLOW`) | desconhecido sem coleta |
| Regressão operacional (`WOULD_DENY`) | desconhecido sem coleta |
| Resolver persistido | instrumentado |
| Cache entre instâncias | Redis + invalidação |
| Vazamento cross-tenant | detector no readiness |
| Perda de telemetria | Sentry + logs; decisão não falha |
| Rotas somente `@RequireRole` | não comparáveis por permissão |

## Readiness

```text
PASSO 12-J.3A

STATUS:
PARCIAL

REQUESTS_OBSERVADOS:
0

TENANTS_OBSERVADOS:
0

ROLES_OBSERVADAS:
0

ENDPOINTS_OBSERVADOS:
0

ALLOW_MATCH:
0

DENY_MATCH:
0

WOULD_ALLOW:
0

WOULD_DENY:
0

CACHE:
RISCO

MULTI_TENANCY:
OK

OBSERVABILIDADE:
PARCIAL

READINESS:
REPROVADO

RBAC_PERSISTED_AUTHORITY:
SHADOW

PROMOÇÃO PARA ON:
NÃO
```
