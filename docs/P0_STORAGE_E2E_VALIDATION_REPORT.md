# P0 Storage E2E — Test Bucket Validation

> **Data:** 2026-07-03 · **Produção:** intocada · **Bucket R2 de produção NÃO tocado** · **Sem Stripe, sem migrations.**
> **Veredito:** ✅ **PASS** (8/8 operações aprovadas, exit 0).

---

## 1. Alvo de teste (sem R2 de produção)

Não é possível criar bucket/credenciais reais de Cloudflare R2 a partir daqui. O caminho honesto e padrão para validar a runtime de storage **sem tocar produção** é um alvo **S3-compatível local descartável (MinIO)** — exercita exatamente as mesmas operações do `S3Client` que o app usa contra R2.

- **MinIO:** container `musicos-minio` (`minio/minio`), API em `localhost:9000`, credenciais de teste `minioadmin` / `minioadmin123`.
- **Bucket de teste:** `musicos360-test` (criado via `mc mb`).
- **`.env` (apps/api/.env, git-ignored, sem commit):** `R2_ENDPOINT=http://localhost:9000`, `R2_BUCKET_NAME=musicos360-test`, `R2_ACCESS_KEY_ID/KEY=minioadmin`, `R2_SECRET_ACCESS_KEY/KEY=minioadmin123`, `R2_ACCOUNT_ID=minio-test`. **Nenhuma variável apontava para o R2 de produção durante a execução.** `.env` **restaurado** e MinIO **removido** ao final.

> **Ressalva de fidelidade:** MinIO valida as operações S3-compatíveis (o caminho de código do app), não peculiaridades específicas do Cloudflare R2. Para um smoke contra R2 real, basta repetir com `R2_ENDPOINT`/credenciais de um bucket R2 de **teste** dedicado.

## 2. Comando

```
corepack pnpm --filter @music-os-360/api storage:e2e
```

## 3. Resultado por operação — 8/8 ✅

| # | Operação | Resultado | Evidência |
|---|---|---|---|
| 1 | **HeadBucket** | ✅ OK | `HeadBucket — musicos360-test` |
| 2 | **PutObject** | ✅ OK | `tenants/e2e-tenant-…/__storage-e2e__/…/probe.txt` |
| 3 | **GetObject + hash** | ✅ OK | `hash match` (SHA-256 do corpo confere) |
| 4 | **Presigned PUT** | ✅ OK | `HTTP 200` (upload via URL assinada) |
| 5 | **Presigned GET** | ✅ OK | `HTTP 200` (download via URL assinada, corpo confere) |
| 6 | **ListObjects(prefix)** | ✅ OK | `2 sob tenantA` |
| 7 | **Isolamento por prefixo tenant** | ✅ OK | `tenantB prefix=0 objetos` (nenhum vazamento entre prefixos) |
| 8 | **DeleteObject + confirm** | ✅ OK | `removido` (HeadObject pós-delete confirma ausência) |

`[storage-e2e] 8/8 passos OK.` · **STORAGE_EXIT=0**

## 4. Erros

Nenhum erro de operação. Na primeira execução houve um artefato de teardown do Node no Windows (`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` → exit 127) **após** o `8/8 passos OK` — causado por `process.exit()` com sockets keep-alive do AWS SDK abertos (em Linux/CI não ocorreria). Corrigido (ver §5); reexecução saiu **limpa (exit 0)**.

## 5. Arquivos alterados

- `apps/api/scripts/storage-e2e.ts`:
  1. **Endpoint override** — usa `R2_ENDPOINT` quando definido (permite alvo S3-compatível de teste) e ativa `forcePathStyle` para endpoints locais; caso contrário deriva de `R2_ACCOUNT_ID` (comportamento R2 **inalterado** em produção).
  2. **Encerramento limpo** — `client.destroy()` no `finally` + `process.exitCode` no lugar de `process.exit()`, eliminando a assertion de teardown do libuv no Windows.

> `apps/api/.env` foi ajustado para o alvo de teste durante a execução e **restaurado** (git-ignored; sem commit). Nenhuma migration, RLS/RBAC ou Stripe tocados.

## 6. Veredito — ✅ PASS

Critério: **7/7 operações aprovadas**. Obtido: **8/8** (as 7 operações do escopo + a verificação de isolamento por prefixo), com exit 0. **Bucket R2 de produção intocado; produção intocada.**
