/**
 * MUSIC OS 360 — Storage Architecture
 *
 * Placeholder for Cloudflare R2 integration.
 * In standalone mode, returns local URLs.
 * Structure is ready for multi-tenant isolation.
 *
 * Folder convention:
 *   {bucket}/{tenantSlug}/{domain}/{type}/{filename}
 *
 * Examples:
 *   musicos360/gravadora-exemplo/artists/covers/art-001-cover.jpg
 *   musicos360/gravadora-exemplo/catalog/audio/obra-001.mp3
 *   musicos360/gravadora-exemplo/contracts/docs/ctr-001.pdf
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type StorageDomain =
  | "artists"
  | "catalog"
  | "releases"
  | "contracts"
  | "marketing"
  | "rh"
  | "inventory"
  | "documents"
  | "temp";

export type StorageFileType =
  | "covers"
  | "audio"
  | "video"
  | "docs"
  | "images"
  | "exports"
  | "imports";

export interface StorageFile {
  id:         string;
  name:       string;
  url:        string;
  size:       number;
  mimeType:   string;
  domain:     StorageDomain;
  fileType:   StorageFileType;
  tenantSlug: string;
  entityId?:  string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface StorageUploadOptions {
  domain:    StorageDomain;
  fileType:  StorageFileType;
  entityId?: string;
  filename?: string;
  /** Max size in bytes. Default: 50MB */
  maxSize?:  number;
  /** Allowed MIME types */
  accept?:   string[];
}

export interface StorageConfig {
  /** R2 bucket name */
  bucket:     string;
  /** Public CDN base URL */
  publicUrl:  string;
  /** Max upload size in bytes */
  maxSize:    number;
  /** Allowed origins for CORS */
  allowedOrigins: string[];
}

// ─── Storage path builder ──────────────────────────────────────────────────────

export function buildStoragePath(
  tenantSlug: string,
  domain: StorageDomain,
  fileType: StorageFileType,
  filename: string
): string {
  return `${tenantSlug}/${domain}/${fileType}/${filename}`;
}

// ─── Allowed types per domain ──────────────────────────────────────────────────

export const STORAGE_ACCEPTED_TYPES: Record<StorageFileType, string[]> = {
  covers:  ["image/jpeg", "image/png", "image/webp"],
  audio:   ["audio/mpeg", "audio/wav", "audio/flac", "audio/aac", "audio/ogg"],
  video:   ["video/mp4", "video/webm", "video/quicktime"],
  docs:    ["application/pdf", "application/msword",
             "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  images:  ["image/jpeg", "image/png", "image/webp", "image/svg+xml"],
  exports: ["text/csv", "application/json", "application/pdf",
             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  imports: ["text/csv", "application/json",
             "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
};

export const STORAGE_MAX_SIZE: Record<StorageFileType, number> = {
  covers:  10 * 1024 * 1024,   // 10 MB
  audio:   200 * 1024 * 1024,  // 200 MB
  video:   500 * 1024 * 1024,  // 500 MB
  docs:    25 * 1024 * 1024,   // 25 MB
  images:  10 * 1024 * 1024,   // 10 MB
  exports: 50 * 1024 * 1024,   // 50 MB
  imports: 50 * 1024 * 1024,   // 50 MB
};

// ─── Placeholder client (no-op in standalone mode) ────────────────────────────

class StorageClient {
  private readonly isEnabled = false; // will be true when R2 is configured

  /** Upload a file — returns a public URL */
  async upload(
    _file: File,
    _opts: StorageUploadOptions,
    _tenantSlug: string
  ): Promise<StorageFile> {
    if (!this.isEnabled) {
      throw new Error("[Storage] R2 not configured. Enable feature flag `storageR2`.");
    }
    throw new Error("Not implemented");
  }

  /** Delete a file by path */
  async delete(_path: string): Promise<void> {
    if (!this.isEnabled) return;
    throw new Error("Not implemented");
  }

  /** Get a signed URL for temporary access */
  async getSignedUrl(_path: string, _expiresInSeconds: number): Promise<string> {
    if (!this.isEnabled) return "";
    throw new Error("Not implemented");
  }
}

export const storageClient = new StorageClient();
