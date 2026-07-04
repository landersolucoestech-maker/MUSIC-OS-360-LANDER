# Disaster Recovery Runbook — MUSIC OS 360

> **Status:** procedimento definido · **tempos medidos: PENDENTE do drill real (PS-02)**.
> Este runbook não pode ser marcado PASS até um restore drill real preencher a seção "Tempos medidos".

## Alvos (metas)
| Métrica | Alvo | Base |
|---|---|---|
| **RPO** (perda máxima de dados) | ≤ 24h | backup diário 03:00 UTC (`.github/workflows/backup.yml`). Para RPO menor, habilitar PITR do Supabase. |
| **RTO** (tempo até restaurar serviço) | ≤ 4h | a comprovar no drill |

## Ativos de backup (mecanismo real)
- **Workflow:** `.github/workflows/backup.yml` — `pg_dump --no-owner --no-privileges` → cifra com **age** → upload **R2/S3** (`aws s3`), retenção **30 dias**, cron `0 3 * * *` + `workflow_dispatch`.
- **Restore drill automatizado:** job `restore-drill` (segundas) baixa o último backup, restaura em Postgres descartável e compara row-counts.
- **Scripts:** `scripts/pg-backup.sh` (local/remote), `scripts/pg-backup-cron.sh` (cifrado).
- **Secrets necessários (repo):** `DATABASE_URL_PROD`, `BACKUP_BUCKET`, `AWS_ENDPOINT_URL`, `BACKUP_R2_ACCESS_KEY_ID`, `BACKUP_R2_SECRET_ACCESS_KEY`, `BACKUP_AGE_RECIPIENT`.

> ⚠️ **Pré-condição não satisfeita:** hoje `backup.yml` e os scripts estão **fora da branch default** (untracked) → o GitHub Actions **não executa** (`workflow backup.yml not found on the default branch`). Passo 0 obrigatório: commitar na default branch + configurar os secrets.

## Procedimento de Restore (completo)
1. **Localizar backup:** `aws --endpoint-url $AWS_ENDPOINT_URL s3 ls s3://$BACKUP_BUCKET/musicos360-prod/ | sort | tail -1`.
2. **Baixar + descriptografar:** `aws s3 cp` → `age -d -i <key>` → `dump.sql`.
3. **Preparar alvo:** Postgres vazio (Supabase branch descartável ou container `postgres:16`).
4. **Restaurar:** `psql "$TARGET_URL" -f dump.sql` (medir início/fim).
5. **Validar integridade:** rodar a matriz de row-counts abaixo (diff = 0).
6. **Validar app:** apontar API para o alvo, `GET /health` → 200; smoke de login + leitura tenant-scoped.
7. **Registrar** tempos e evidências nesta página.

### Matriz de validação (row-counts antes/depois)
| Tabela crítica | count origem | count restaurado | diff |
|---|---|---|---|
| tenants | _pendente_ | _pendente_ | _pendente_ |
| organizations | | | |
| org_members | | | |
| artists | | | |
| contracts | | | |
| billing_subscriptions | | | |
| invoices | | | |
| **Critério** | | | **diff total = 0** |

## Tempos medidos (a preencher no drill real — PS-02)
| Evento | Timestamp | Duração |
|---|---|---|
| Início do restore | _pendente_ | |
| Fim do restore (dados) | _pendente_ | |
| App saudável (RTO) | _pendente_ | |
| **RPO efetivo** (idade do backup) | _pendente_ | |

## Responsáveis
| Papel | Responsabilidade |
|---|---|
| On-call SRE | Executar restore, medir RTO |
| DBA/Owner | Validar integridade, aprovar |
| Eng. Lead | Decisão de failover, comunicação |

## Checklist de aprovação DR
- [ ] Passo 0: `backup.yml` + scripts na default branch + secrets configurados
- [ ] Backup diário executou ≥3× (evidência: runs do Actions)
- [ ] Restore drill real executado
- [ ] Matriz row-counts com diff = 0
- [ ] `GET /health` 200 no alvo restaurado
- [ ] RPO ≤ 24h e RTO ≤ 4h **medidos**
- [ ] Tempos e evidências registrados acima
