# TASK 9 — Distribution Orchestration (DistroKid, TuneCore, ONErpm, TooLost, FUGA)

## What & Why
O sistema tem módulo de lançamentos (`/lancamentos`) no frontend mas não tem backend para orquestrar a entrega real para distribuidoras. Distribuidoras como DistroKid, TuneCore, ONErpm, TooLost e FUGA têm APIs próprias para validar metadata, submeter releases e acompanhar status. Sem esta camada, releases ficam apenas como registros internos sem entrega real às plataformas digitais.

## Escopo ESTRITO
O módulo serve APENAS para:
- validar metadata do release (título, ISRC, UPC, artistas, gênero, data)
- organizar e validar assets (áudio WAV/FLAC, artwork JPEG 3000x3000)
- submeter release para a distribuidora selecionada
- acompanhar status (pending → processing → distributed → failed)

NÃO implementar: royalties, payout, DSP accounting, fingerprinting, anti-fraude, content ID, ingestão DSP própria, ledger financeiro.

## Done looks like
- Interface `DistributionProvider` em `packages/shared-types`: `validateRelease()`, `uploadAssets()`, `publishRelease()`, `syncStatus()`
- Adapters implementados: `DistroKidAdapter`, `TuneCoreAdapter`, `ONErpmAdapter`, `TooLostAdapter`, `FUGAAdapter` — cada um implementa `DistributionProvider`; em fase inicial os adapters são skeletons que logam a operação e retornam status `pending` (integrações reais via API key por tenant quando disponível)
- `DistributionOrchestratorService`: recebe `releaseId + tenantId + provider`, valida metadata via `ReleasesService`, valida assets via `UploadsService`, chama o adapter correto, persiste status na tabela `distribution_submissions`
- Tabela `distribution_submissions`: `id`, `tenant_id`, `release_id`, `provider`, `status` (pending/processing/distributed/failed), `external_id`, `submitted_at`, `last_sync_at`, `error_message`
- Endpoint `POST /distribution/submit`: recebe `{ releaseId, provider }`, valida release, inicia processo
- Endpoint `GET /distribution/status/:submissionId`: retorna status atual
- Endpoint `POST /distribution/sync/:submissionId`: dispara sync de status com a distribuidora
- Frontend: página de releases conecta ao endpoint real (substituindo mock); botão "Distribuir" abre seletor de distribuidora e chama `POST /distribution/submit`
- `tsc --noEmit` sem erros

## Out of scope
- Implementação real das APIs das distribuidoras (apenas estrutura/skeleton dos adapters)
- Pagamentos às distribuidoras (faturamento manual pelo tenant)
- Relatórios de distribuição avançados
- Integração com ECAD/ABRAMUS

## Steps
1. **Schema Drizzle** — criar tabela `distribution_submissions` com campos descritos acima; gerar e aplicar migration via drizzle-kit
2. **Interface DistributionProvider** — criar `packages/shared-types/src/distribution.ts` com interface `DistributionProvider`, enum `DistributionProviderName`, tipo `ReleaseSubmission`, tipo `SubmissionStatus`
3. **Adapters skeleton** — criar `apps/api/src/modules/distribution/adapters/` com um arquivo por distribuidora; cada adapter implementa `DistributionProvider`; `validateRelease()` verifica campos obrigatórios (título, ISRC, UPC, artista, gênero, data); `publishRelease()` loga e retorna `{ externalId: uuid(), status: 'pending' }`; `syncStatus()` retorna status atual do banco
4. **DistributionOrchestratorService** — criar service que: carrega release via Drizzle, valida campos obrigatórios, seleciona adapter pelo `provider`, chama `validateRelease()` + `uploadAssets()` + `publishRelease()`, persiste em `distribution_submissions`; trata erros com mensagem descritiva por step
5. **DistributionController + Module** — criar controller com os 3 endpoints; criar `DistributionModule` com provider, registrar no `AppModule`; proteger endpoints com `TenantGuard` + `@RequireRole('editor')`
6. **Frontend** — atualizar `client/src/modules/releases/` para usar `POST /distribution/submit` no botão de distribuição e `GET /distribution/status/:id` para exibir status; exibir badge de status por submissão na listagem de releases

## Relevant files
- `apps/api/src/modules/releases/` (releases module existente)
- `apps/api/src/database/schema.ts`
- `apps/api/src/app.module.ts`
- `packages/shared-types/`
- `client/src/modules/releases/pages/`

## Depends on
- Task #661 (auth chain — tenantId necessário)
- Task #665 (backend modules — padrão de CRUD a seguir)
