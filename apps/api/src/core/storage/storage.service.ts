import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type StorageProvider = 's3' | 'gcs' | 'local';

export interface UploadOptions {
  bucket?: string;
  key: string;
  contentType: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
  provider: StorageProvider;
  size: number;
}

/**
 * StorageService — abstração de upload/download de arquivos.
 * Em desenvolvimento: simula upload local.
 * Em produção: integra com S3/GCS via provider configurado.
 */
@Injectable()
export class StorageService {
  private readonly provider: StorageProvider;
  private readonly defaultBucket: string;

  constructor(private readonly config: ConfigService) {
    this.provider = (config.get<string>('STORAGE_PROVIDER') as StorageProvider) ?? 'local';
    this.defaultBucket = config.get<string>('STORAGE_BUCKET') ?? 'musicos360-dev';
  }

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    const bucket = options.bucket ?? this.defaultBucket;

    if (this.provider === 'local' || process.env['NODE_ENV'] === 'development') {
      // Mock local storage
      return {
        key: options.key,
        url: `/uploads/${options.key}`,
        bucket,
        provider: 'local',
        size: file.length,
      };
    }

    // TODO: implement real S3/GCS upload
    throw new Error(`StorageProvider "${this.provider}" não implementado ainda`);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    if (this.provider === 'local') return `/uploads/${key}`;
    // TODO: implement signed URL generation
    return `/uploads/${key}?expires=${Date.now() + expiresInSeconds * 1000}`;
  }

  async delete(key: string, bucket?: string): Promise<void> {
    const b = bucket ?? this.defaultBucket;
    if (this.provider === 'local') {
      console.log(`[storage:local] deleted ${b}/${key}`);
      return;
    }
    // TODO: implement real deletion
  }

  getPublicUrl(key: string): string {
    return `/uploads/${key}`;
  }
}
