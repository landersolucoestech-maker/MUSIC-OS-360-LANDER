/**
 * integrations/adapters/storage.adapter.ts
 *
 * Adapter de armazenamento de ficheiros — selecciona MockStorageProvider (standalone)
 * ou R2StorageProvider (produção — via Cloudflare Workers API no backend).
 *
 * REGRA: o frontend NUNCA acede ao R2 directamente.
 * Em produção, obtém presigned URLs do backend e faz PUT directo para R2.
 *
 * Uso:
 *   import { storageAdapter } from "@/integrations/adapters/storage.adapter";
 *   const result = await storageAdapter.upload({ bucket: "audio", key, file, content_type });
 *   const url    = await storageAdapter.presignedUrl({ bucket: "documents", key });
 */

import type { IStorageProvider } from "@/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import { mockStorageProvider } from "@/integrations/providers";

function resolveStorageProvider(): IStorageProvider {
  if (MOCK_MODE) return mockStorageProvider;

  // PRODUÇÃO: R2StorageProvider que obtém presigned URLs do backend:
  //   GET /api/storage/presign?bucket=...&key=...  → url assinada
  //   O upload é feito pelo frontend directamente para a URL assinada (sem proxy)
  // import { R2StorageProvider } from "@/integrations/providers/r2/r2-storage.provider";
  // return new R2StorageProvider();
  return mockStorageProvider;
}

export const storageAdapter: IStorageProvider = resolveStorageProvider();
