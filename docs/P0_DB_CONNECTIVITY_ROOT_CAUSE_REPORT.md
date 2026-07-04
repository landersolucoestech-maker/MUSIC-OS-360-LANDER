# P0 DB CONNECTIVITY ROOT CAUSE REPORT — MUSIC OS 360

Data: 2026-07-02  
Escopo: conectividade PostgreSQL contra Supabase branch mirror/staging.  
Branch alvo: `prod-mirror-rehearsal` / `ghiipsgujymfbwkmdrmj`.

## 1. Veredito

**PARTIAL**

A causa raiz do `ECONNREFUSED` foi encontrada e corrigida para conectividade PostgreSQL. O `db:check` deixou de falhar por conexao e conseguiu consultar o banco. O gate ainda nao passa porque agora encontrou migrations pendentes, e esta tarefa proibiu alterar/aplicar migrations.

## 2. Causa Raiz Encontrada

### Causa raiz primaria

**FATO:** o `DATABASE_URL` anterior apontava para Direct Connection:

```text
Host: db.ghiipsgujymfbwkmdrmj.supabase.co
Porta: 5432
Tipo: Direct
```

Esse host falhou em DNS/TCP no ambiente local:

```text
nslookup: retornou apenas IPv6
Test-NetConnection: TcpTestSucceeded False
pg client: ENOTFOUND
```

**Conclusao:** a Direct Connection do branch nao era utilizavel neste ambiente local.

### Causa raiz secundaria

**FATO:** `db:check` carrega `apps/api/.env` antes do `.env` raiz via `apps/api/src/database/datasource.ts`.

**FATO:** o `.env` raiz foi corrigido primeiro, mas `apps/api/.env` ainda apontava para:

```text
Host: localhost
Porta: 5432
Usuario: musicos360
```

**Conclusao:** mesmo apos corrigir o `.env` raiz, `db:check` continuava lendo a configuracao local antiga de `apps/api/.env`, causando `ECONNREFUSED`.

## 3. Auditoria Da Connection String

### Antes da correcao efetiva

| Variavel | Host | Porta | Database | Usuario | Tipo |
|---|---|---:|---|---|---|
| `DATABASE_URL` raiz | `aws-1-us-west-1.pooler.supabase.com` | 6543 | `postgres` | `postgres.ghiipsgujymfbwkmdrmj` | Transaction Pooler |
| `DATABASE_URL` API | `localhost` | 5432 | nao registrado | `musicos360` | Local antigo |

### Depois da correcao

| Arquivo | Variavel | Host | Porta | Database | Usuario | Tipo |
|---|---|---:|---|---|---|---|
| `.env` | `DATABASE_URL` | `aws-1-us-west-1.pooler.supabase.com` | 6543 | `postgres` | `postgres.ghiipsgujymfbwkmdrmj` | Transaction Pooler |
| `.env` | `APP_DATABASE_URL` | `aws-1-us-west-1.pooler.supabase.com` | 6543 | `postgres` | `postgres.ghiipsgujymfbwkmdrmj` | Transaction Pooler |
| `apps/api/.env` | `DATABASE_URL` | `aws-1-us-west-1.pooler.supabase.com` | 6543 | `postgres` | `postgres.ghiipsgujymfbwkmdrmj` | Transaction Pooler |
| `apps/api/.env` | `APP_DATABASE_URL` | `aws-1-us-west-1.pooler.supabase.com` | 6543 | `postgres` | `postgres.ghiipsgujymfbwkmdrmj` | Transaction Pooler |

Flags configuradas nos dois arquivos locais:

```text
DATABASE_SESSION_CONTEXT_ENABLED=true
DATABASE_RLS_ENFORCEMENT=true
```

### Origem da URL

**Nao foi montada manualmente.**

A URL usada veio do comando oficial:

```bash
supabase branches get ghiipsgujymfbwkmdrmj --project-ref iundcoubyaiwzqyytvdr --output json
```

Observacao: nao foi confirmado uso do botao visual "Copy" do Dashboard. A fonte foi a Supabase CLI oficial para o branch.

## 4. DNS

### Direct Connection

Host:

```text
db.ghiipsgujymfbwkmdrmj.supabase.co
```

Resultado:

```text
IPv4 encontrado: NAO
IPv6 encontrado: SIM
TCP: FAIL
```

### Transaction Pooler Oficial

Host:

```text
aws-1-us-west-1.pooler.supabase.com
```

Resultado:

```text
IPv4 encontrado: SIM
IPv6 encontrado: nao necessario
TCP: PASS
```

## 5. TCP

### Direct

```text
Host: db.ghiipsgujymfbwkmdrmj.supabase.co
Porta: 5432
TcpTestSucceeded: False
Classificacao: FAIL
```

### Transaction Pooler

```text
Host: aws-1-us-west-1.pooler.supabase.com
Porta: 6543
RemoteAddress: 54.241.91.151
TcpTestSucceeded: True
Classificacao: PASS
```

## 6. SSL

### Direct antigo

```text
sslmode: ausente
```

O teste nem chegou a autenticar porque falhou em DNS/TCP.

### Pooler oficial

```text
sslmode: nao explicitado pela CLI
```

O teste minimo passou usando `pg` com SSL habilitado e `rejectUnauthorized=false`, conforme padrao ja usado em scripts do projeto.

Risco remanescente:

- Para hardening enterprise, a cadeia CA deve ser configurada corretamente em vez de depender de `rejectUnauthorized=false`.
- Isso nao foi alterado nesta tarefa porque o escopo era conectividade P0, nao hardening SSL.

## 7. Teste Isolado PostgreSQL

### Direct

```text
PG_MINIMAL=FAIL
ERROR_CODE=ENOTFOUND
```

Classificacao:

```text
Causa: DNS/Direct host
```

### Transaction Pooler Oficial

Consulta executada:

```sql
SELECT current_database();
SELECT current_user;
SELECT version();
```

Resultado:

```text
PG_MINIMAL=PASS
DB=postgres
USER=postgres
VERSION=PostgreSQL 17.6 on aarch64-unknown-linux-gnu
```

## 8. Comparacao Direct Vs Pooler

| Metodo | PASS/FAIL | Motivo |
|---|---|---|
| Direct Connection oficial | FAIL | Host `db.ghiipsgujymfbwkmdrmj.supabase.co` falha em DNS/TCP local |
| Session Pooler montado manualmente | FAIL | Tenant/user nao encontrado |
| Transaction Pooler montado manualmente | FAIL | Tenant/user nao encontrado |
| Transaction Pooler oficial via Supabase CLI | PASS | Conectou e executou `SELECT current_database/current_user/version` |

## 9. Correcao Aplicada

Foi aplicada somente a correcao necessaria de ambiente local:

- `.env`
- `apps/api/.env`

Alteracoes:

```text
DATABASE_URL=<URL oficial do Transaction Pooler do branch mirror>
APP_DATABASE_URL=<mesma URL temporariamente para destravar conectividade/db:check>
DATABASE_SESSION_CONTEXT_ENABLED=true
DATABASE_RLS_ENFORCEMENT=true
```

Nenhuma migration foi alterada.

Nenhum codigo de negocio foi alterado.

Nenhuma URL/secret foi registrada neste relatorio.

## 10. Validacao Final — db:check

Comando:

```bash
corepack.cmd pnpm --filter @music-os-360/api db:check
```

Resultado:

```text
SELECT version()
SELECT * FROM current_schema()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
SELECT * FROM information_schema.tables ...
SELECT * FROM musicos360_migrations ...
⚠ Existem migrations pendentes — execute: npm run db:migrate
Exit status 1
```

Classificacao:

```text
db:check: FAIL
Motivo atual: migrations pendentes
Motivo anterior ECONNREFUSED: corrigido
```

## 11. Arquivos Alterados

Arquivos de ambiente local alterados, nao destinados a commit:

- `.env`
- `apps/api/.env`

Arquivo de relatorio criado:

- `docs/P0_DB_CONNECTIVITY_ROOT_CAUSE_REPORT.md`

## 12. Respostas Solicitadas

| Item | Resultado |
|---|---|
| Causa raiz encontrada | SIM |
| Evidencia tecnica | SIM |
| Correcao aplicada | SIM |
| `DATABASE_URL` corrigida? | SIM |
| `APP_DATABASE_URL` corrigida? | SIM, temporariamente igual ao pooler owner para destravar conectividade |
| `db:check` PASS/FAIL | FAIL |
| Motivo atual do `db:check` | Migrations pendentes, nao conectividade |
| Producao tocada? | NAO |
| Migrations alteradas? | NAO |
| Codigo de negocio alterado? | NAO |

## 13. Proximo Passo Recomendado

Como conectividade esta resolvida, o proximo bloqueador e de schema/migrations:

1. Confirmar se o branch mirror deve receber migrations pendentes.
2. Se sim, executar migration somente no branch mirror/staging, nunca em producao.
3. Reexecutar:

```bash
corepack pnpm --filter @music-os-360/api db:check
```

4. Somente apos `db:check` PASS, continuar para E2E/RLS/RBAC/Storage.

## 14. Veredito Final

**PARTIAL**

Justificativa:

- A conectividade PostgreSQL foi corrigida.
- O erro `ECONNREFUSED` nao e mais a falha dominante.
- O `db:check` ainda retorna exit code 1 por migrations pendentes.
- O escopo proibiu alterar/aplicar migrations, entao a execucao deve parar aqui.
