# Runbook — Promoção Staging → Produção · MUSIC OS 360

> Nenhuma mudança vai a produção sem passar por staging **verde** com evidência.
> Produção nunca é ambiente de teste. Secrets de staging ≠ produção.

## Pré-condição: Fase 0 (staging) = PASS
Só promover se o ambiente de staging existir e estiver isolado:
- [ ] Supabase staging (DB/auth/keys isolados)
- [ ] Redis staging isolado
- [ ] Storage R2 staging (bucket + prefixo separados)
- [ ] Secrets staging (nenhum valor de produção)
- [ ] API staging sobe · `GET /health` = 200
- [ ] Web staging sobe e aponta para API staging
- [ ] Migrations aplicam em staging (RLS/FORCE/policies OK)

## Ordem de promoção
1. **Merge para `staging`** → workflow `staging.yml` roda (quality + migrations-staging + deploy-staging).
2. **Validação em staging** (evidência obrigatória por área):
   - Auth/tenant: login + isolamento A×B (403/404).
   - Billing (quando liberado): checkout+webhook+idempotência+portal (Stripe TEST).
   - Smoke das jornadas críticas.
3. **Aprovação** (ver "Quem aprova").
4. **Tag de release** (SemVer) no commit validado.
5. **Aplicar migrations em produção** (`db:migrate` contra prod) — em janela, com backup fresco (ver `dr.md`).
6. **Deploy produção** do mesmo commit taggeado.
7. **Smoke pós-deploy** em prod (`/health` 200, login, leitura tenant-scoped).

## Checklist pré-produção (bloqueadores automáticos)
- [ ] `staging.yml` verde no commit exato a promover
- [ ] Backup de produção < 24h (evidência: run do `backup.yml`)
- [ ] 0 CVE crítico/alto (`pnpm audit`) OU exceção assinada
- [ ] 0 advisor de segurança crítico (`get_advisors security`)
- [ ] Migrations revisadas (sem perda de dados; `down()` presente)
- [ ] Alertas ativos (API down / erro / DB)
- [ ] Rollback ensaiado (abaixo)

## Rollback
- **App:** re-deploy da tag anterior (imutável).
- **Banco:** migrations aditivas → `down()` da migration específica; destrutivas → restore do backup pré-deploy (`dr.md`) — decisão do DBA/Owner.
- **Billing:** `BillingEnforcementGuard` atrás de flag; desligar via env se necessário.
- Critério de rollback: erro >1% por 5 min, `/health` 503 sustentado, ou incidente SEV1/2.

## Quem aprova
| Etapa | Aprovador |
|---|---|
| Validação staging | Eng. Lead |
| Migrations em prod | DBA/Owner |
| Go-live | Eng. Lead + Owner |

## Evidências mínimas por promoção
- Link do run `staging.yml` verde.
- SQL pós-migração (staging): contagem de tabelas + RLS/FORCE + policies.
- Evidência de smoke (staging e prod pós-deploy).
- Tag de release + commit hash.

## Bloqueadores automáticos (não promover)
- `staging.yml` vermelho.
- Backup > 24h ou ausente.
- CVE crítico/alto sem exceção.
- Advisor de segurança crítico.
- Alertas inativos.
