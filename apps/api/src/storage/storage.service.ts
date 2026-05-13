/**
 * storage/storage.service.ts
 *
 * Serviço de abstracção sobre Cloudflare R2.
 * Operações: upload, presigned URL, delete, exists, list.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { R2_CLIENT, R2_BUCKET, R2_PUBLIC_URL } from './storage.module';

export interface UploadOptions {
  key:         string;
  body:        Buffer | Uint8Array | string;
  contentType?: string;
  metadata?:   Record<string, string>;
}

export interface PresignedUrlOptions {
  key:        string;
  expiresIn?: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(R2_CLIENT)     private readonly r2Client: S3Client | null,
    @Inject(R2_BUCKET)     private readonly r2Bucket: string,
    @Inject(R2_PUBLIC_URL) private readonly r2PublicUrl: string | null,
  ) {}

  private getClient(): S3Client {
    if (!this.r2Client) {
      throw new Error(
        'R2 não configurado — defina R2_ACCOUNT_ID, R2_ACCESS_KEY e R2_SECRET_KEY',
      );
    }
    return this.r2Client;
  }

  async upload(options: UploadOptions): Promise<string> {
    const client = this.getClient();
    await client.send(
      new PutObjectCommand({
        Bucket:      this.r2Bucket,
        Key:         options.key,
        Body:        options.body,
        ContentType: options.contentType ?? 'application/octet-stream',
        Metadata:    options.metadata,
      }),
    );
    const url = this.r2PublicUrl
      ? `${this.r2PublicUrl}/${options.key}`
      : `r2://${this.r2Bucket}/${options.key}`;
    this.logger.log(`Upload concluído: ${options.key}`);
    return url;
  }

  async getPresignedUrl(options: PresignedUrlOptions): Promise<string> {
    const client = this.getClient();
    const cmd = new GetObjectCommand({
      Bucket: this.r2Bucket,
      Key:    options.key,
    });
    return getSignedUrl(client, cmd, {
      expiresIn: options.expiresIn ?? 3600,
    });
  }

  async delete(key: string): Promise<void> {
    const client = this.getClient();
    await client.send(
      new DeleteObjectCommand({ Bucket: this.r2Bucket, Key: key }),
    );
    this.logger.log(`Ficheiro eliminado: ${key}`);
  }

  async exists(key: string): Promise<boolean> {
    const client = this.getClient();
    try {
      await client.send(
        new HeadObjectCommand({ Bucket: this.r2Bucket, Key: key }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async list(prefix?: string): Promise<string[]> {
    const client = this.getClient();
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: this.r2Bucket, Prefix: prefix }),
    );
    return (res.Contents ?? [])
      .map((o: { Key?: string }) => o.Key ?? '')
      .filter(Boolean);
  }
}
