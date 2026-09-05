# Upload Architecture — Signed URLs + Multipart + Progress + MIME Validation

## What & Why
Todos os uploads no frontend são mock: apenas salvam nome/tamanho no state local, sem enviar nada ao servidor. O backend tem um módulo `uploads` mas não implementa signed URLs para R2/S3, multipart upload para arquivos grandes (WAV/FLAC podem ter 500MB+), upload progress, retry em falha de rede, nem validação de MIME no servidor. Em produção, arquivos de áudio, imagens de capa e assets promocionais precisam de pipeline robusto e resiliente.

## Done looks like
- `POST /uploads/signed-url` retorna `{ uploadUrl, key, expiresAt }` — URL pré-assinada do R2 com TTL 15min
- Frontend: `useUpload()` hook com `upload(file): Promise<{ key, url }>` — faz PUT diretamente no R2 via URL assinada, com `onProgress(percent)` callback
- Barra de progresso real (`<UploadProgress />`) usando `XMLHttpRequest.upload.onprogress`
- Multipart upload: arquivos > 50MB usam multipart R2 API (initiate → upload parts → complete)
- MIME validation: servidor valida content-type real (magic bytes) antes de assinar URL; lista allowlist: `audio/wav`, `audio/flac`, `audio/mpeg`, `audio/ogg`, `image/jpeg`, `image/png`, `image/webp`, `video/mp4`
- Upload retry: 3 tentativas com backoff exponencial em erro de rede; cancelamento via `AbortController`
- Após upload bem-sucedido: frontend chama `POST /uploads/confirm` com `{ key, entityType, entityId }` — backend persiste na tabela `uploads` e dispara job `UPLOADS_PROCESS` na fila
- `UploadsProcessor` (queue) extrai metadados: duração de áudio, MIME real, tamanho; gera thumbnail para imagens; atualiza registro com `status: 'processed'`
- FonogramaFormModal, ArtistaFormModal e ContratoFormModal: integrar `useUpload()` substituindo mock handlers
- `tsc --noEmit` sem erros

## Out of scope
- CDN em frente ao R2 (configuração de infraestrutura)
- Video transcoding
- Bulk upload (múltiplos arquivos simultâneos)
- Integração com ECAD/ABRAMUS para entrega de áudio

## Steps
1. **Backend signed URL endpoint** — em `UploadsController`: `POST /uploads/signed-url` recebe `{ filename, mimeType, entityType, fileSize }`; valida MIME allowlist e tamanho máximo (500MB); gera chave R2 `{tenantId}/{entityType}/{uuid}/{filename}`; assina via R2 SDK (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`); retorna `{ uploadUrl, key, expiresAt }`
2. **Multipart R2 upload** — para `fileSize > 50MB`: endpoint `POST /uploads/multipart/initiate` → `POST /uploads/multipart/part-url` → `POST /uploads/multipart/complete`; usar `CreateMultipartUploadCommand`, `UploadPartCommand`, `CompleteMultipartUploadCommand`
3. **Backend confirm endpoint** — `POST /uploads/confirm` recebe `{ key, entityType, entityId, mimeType }`; insere na tabela `uploads` com `status: 'uploaded'`; dispara job `UPLOADS_PROCESS` via BullMQ
4. **UploadsProcessor** — implementar o processor de FASE 3 #664: para áudio, usar `music-metadata` npm package para extrair duração, bitrate, formato; para imagens, usar `sharp` para gerar thumbnail 300x300; atualizar upload record com `{ duration, bitrate, thumbnailKey, status: 'processed' }`
5. **useUpload() hook** — criar `client/src/shared/hooks/useUpload.ts`; método `upload({ file, entityType, entityId, onProgress })`: 1) `POST /uploads/signed-url`; 2) XHR PUT para R2 com progress tracking; 3) `POST /uploads/confirm`; retorna `{ key, url, isPending, progress, error }`; suporte a AbortController para cancelamento
6. **UploadProgress component** — criar `client/src/shared/components/UploadProgress.tsx`; prop `progress: number (0-100)`, `status: 'idle' | 'uploading' | 'processing' | 'done' | 'error'`; usar shadcn Progress + animação
7. **Integrar nos formulários** — atualizar `FonogramaFormModal` (áudio), `ArtistaFormModal` (foto), `ContratoFormModal` (PDF) para usar `useUpload()` substituindo os handlers mock; preservar UX existente (drag & drop, click to upload)

## Relevant files
- `apps/api/src/modules/uploads/uploads.controller.ts`
- `apps/api/src/modules/uploads/uploads.module.ts`
- `apps/api/src/queues/processors/` (UploadsProcessor a criar)
- `client/src/modules/catalog/components/FonogramaFormModal.tsx`
- `client/src/modules/artist/components/ArtistaFormModal.tsx`
- `client/src/shared/hooks/` (useUpload a criar)

## Depends on
- Task #661 (tenantId no request — para gerar path R2 correto)
- Task #664 (queue processor UPLOADS_PROCESS)
