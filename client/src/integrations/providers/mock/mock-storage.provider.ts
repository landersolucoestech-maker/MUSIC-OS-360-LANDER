/**
 * integrations/providers/mock/mock-storage.provider.ts
 *
 * Implementação mock de IStorageProvider.
 * Em modo standalone: usa Blob URLs locais e registos em memória.
 *
 * MIGRAÇÃO FUTURA: substituir por R2StorageProvider (Cloudflare Workers API via backend).
 */

import type {
  IStorageProvider,
  StorageBucket,
  StorageObject,
  StorageUploadParams,
  StorageUploadResult,
  StoragePresignedUrlParams,
} from "@/integrations/dto";

const _objects = new Map<string, StorageObject>();

export class MockStorageProvider implements IStorageProvider {
  async upload(params: StorageUploadParams): Promise<StorageUploadResult> {
    const blob =
      params.file instanceof File
        ? params.file
        : params.file instanceof Blob
          ? params.file
          : new Blob([params.file as ArrayBuffer], { type: params.content_type });

    const url  = URL.createObjectURL(blob);
    const key  = `${params.bucket}/${params.key}`;
    const etag = `mock-etag-${Date.now()}`;

    _objects.set(key, {
      key:          params.key,
      bucket:       params.bucket,
      url,
      size_bytes:   blob.size,
      content_type: params.content_type,
      created_at:   new Date().toISOString(),
      metadata:     params.metadata,
    });

    console.info(`[MockStorageProvider] upload → ${key} (${blob.size} bytes)`);
    return { key: params.key, url, etag };
  }

  async presignedUrl(params: StoragePresignedUrlParams): Promise<string> {
    const key = `${params.bucket}/${params.key}`;
    const obj = _objects.get(key);
    if (obj) return obj.url;
    return `blob:mock/${params.bucket}/${params.key}?expires=${params.expires_in ?? 3600}`;
  }

  async delete(bucket: StorageBucket, key: string): Promise<void> {
    _objects.delete(`${bucket}/${key}`);
    console.info(`[MockStorageProvider] delete → ${bucket}/${key}`);
  }

  async list(bucket: StorageBucket, prefix: string): Promise<StorageObject[]> {
    const fullPrefix = `${bucket}/${prefix}`;
    return Array.from(_objects.entries())
      .filter(([k]) => k.startsWith(fullPrefix))
      .map(([, v]) => v);
  }

  async exists(bucket: StorageBucket, key: string): Promise<boolean> {
    return _objects.has(`${bucket}/${key}`);
  }

  async copy(
    bucket: StorageBucket,
    sourceKey: string,
    destKey: string
  ): Promise<StorageUploadResult> {
    const src = _objects.get(`${bucket}/${sourceKey}`);
    if (!src) throw new Error(`[MockStorageProvider] source not found: ${sourceKey}`);

    const dest: StorageObject = { ...src, key: destKey };
    _objects.set(`${bucket}/${destKey}`, dest);

    return { key: destKey, url: dest.url, etag: `mock-etag-copy-${Date.now()}` };
  }
}

export const mockStorageProvider = new MockStorageProvider();
