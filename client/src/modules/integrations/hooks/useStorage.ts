import { useState } from "react";
import { getAccessToken } from "@/shared/lib/api-client";

/**
 * Storage hook — provider-agnostic file upload/download via backend signed URLs.
 *
 * MOCK_MODE (VITE_USE_MOCK=true, default in dev):
 *   Creates a temporary in-browser object URL — no backend required.
 *   URL is valid only for the current browser session.
 *
 * REAL_MODE (VITE_USE_MOCK=false):
 *   Two-step signed URL flow:
 *     1. POST /uploads/signed-url  → presign metadata
 *     2a. Local provider:  POST /uploads/local-put (FormData)
 *     2b. Cloud providers: PUT <presigned-s3-url> (binary)
 *     3. POST /uploads/confirm     → register in DB
 *   Read: GET /uploads/:key/url    → signed download URL
 */

const MOCK_MODE: boolean =
  import.meta.env.VITE_USE_MOCK !== "false" &&
  import.meta.env.VITE_MOCK_MODE !== "false";

const BACKEND_BASE: string = (() => {
  const explicit = import.meta.env.VITE_API_URL as string | undefined;
  if (explicit && explicit.length > 0) return explicit;
  return "";
})();

interface UploadOptions {
  /** Storage folder: artists | contracts | projects | documents | avatars | catalog | releases | phonograms | temp */
  folder?: string;
  onProgress?: (progress: number) => void;
}

interface UploadResult {
  /** Tenant-scoped storage key (e.g. `{org_id}/artists/{uuid}-photo.jpg`). */
  path: string;
  /** Signed URL valid for 15 minutes. */
  url: string;
}

interface PresignResponse {
  key:       string;
  uploadUrl: string;
  method:    "PUT" | "POST";
  headers?:  Record<string, string>;
  token?:    string;
  expiresAt: string;
}

interface ConfirmResponse {
  id:  string;
  key: string;
}

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useStorage() {
  const [uploading, setUploading] = useState(false);
  const [progress,  setProgress]  = useState(0);

  const uploadFile = async (
    file:     File,
    options?: UploadOptions,
  ): Promise<UploadResult | null> => {
    setUploading(true);
    setProgress(0);

    try {
      if (MOCK_MODE) {
        const objectUrl = URL.createObjectURL(file);
        options?.onProgress?.(100);
        setProgress(100);
        return { path: file.name, url: objectUrl };
      }

      // ── Step 1: Get upload presign ────────────────────────────────────────
      const presignRes = await fetch(`${BACKEND_BASE}/uploads/signed-url`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body:    JSON.stringify({
          filename:    file.name,
          contentType: file.type || "application/octet-stream",
          folder:      options?.folder ?? "temp",
          size:        file.size,
        }),
      });

      if (!presignRes.ok) {
        const err = await presignRes.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? presignRes.statusText);
      }

      const presign: PresignResponse = await presignRes.json();
      options?.onProgress?.(20);
      setProgress(20);

      // ── Step 2: Upload the file ───────────────────────────────────────────
      if (presign.method === "POST") {
        // Local provider — POST FormData to the backend
        const fd = new FormData();
        fd.append("file",  file);
        fd.append("key",   presign.key);
        fd.append("token", presign.token ?? "");

        const uploadRes = await fetch(`${BACKEND_BASE}${presign.uploadUrl}`, {
          method:      "POST",
          body:        fd,
          credentials: "include",
        });
        if (!uploadRes.ok) throw new Error("Local upload failed: " + uploadRes.statusText);
      } else {
        // Cloud provider — PUT raw binary directly to the signed URL
        const uploadHeaders: Record<string, string> = presign.headers ?? {};
        if (!uploadHeaders["Content-Type"]) {
          uploadHeaders["Content-Type"] = file.type || "application/octet-stream";
        }
        const uploadRes = await fetch(presign.uploadUrl, {
          method:  "PUT",
          headers: uploadHeaders,
          body:    file,
        });
        if (!uploadRes.ok) throw new Error("Upload failed: " + uploadRes.statusText);
      }

      options?.onProgress?.(80);
      setProgress(80);

      // ── Step 3: Confirm upload ────────────────────────────────────────────
      const confirmRes = await fetch(`${BACKEND_BASE}/uploads/confirm`, {
        method:  "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body:    JSON.stringify({
          key:          presign.key,
          originalName: file.name,
          contentType:  file.type || "application/octet-stream",
          size:         file.size,
        }),
      });

      if (!confirmRes.ok) {
        const err = await confirmRes.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message ?? confirmRes.statusText);
      }

      const _confirm: ConfirmResponse = await confirmRes.json();

      // ── Get initial signed download URL ───────────────────────────────────
      const readUrl = await getSignedUrl(presign.key);

      options?.onProgress?.(100);
      setProgress(100);
      return { path: presign.key, url: readUrl };
    } finally {
      setUploading(false);
    }
  };

  /** Returns a signed URL for reading the file. Falls back to path if backend unavailable. */
  const getSignedUrl = async (path: string, expiresInSeconds = 900): Promise<string> => {
    if (!path) return "";
    if (path.startsWith("blob:") || path.startsWith("http")) return path;
    if (MOCK_MODE) return path;

    try {
      const encodedKey = encodeURIComponent(path);
      const res = await fetch(
        `${BACKEND_BASE}/uploads/${encodedKey}/url?expiresIn=${expiresInSeconds}`,
        { headers: authHeaders() },
      );
      if (!res.ok) return path;
      const data = (await res.json()) as { url: string };
      return data.url;
    } catch {
      return path;
    }
  };

  /** Returns the public/signed URL for displaying the file. */
  const getPublicUrl = (path: string): string => {
    if (!path) return "";
    if (path.startsWith("http") || path.startsWith("blob:")) return path;
    return path;
  };

  const downloadFile = async (path: string): Promise<void> => {
    const url = await getSignedUrl(path);
    const a   = document.createElement("a");
    a.href     = url;
    a.download = path.split("/").pop() || "file";
    a.click();
  };

  const deleteFile = async (path: string): Promise<void> => {
    if (!path || MOCK_MODE) return;
    const encodedKey = encodeURIComponent(path);
    await fetch(`${BACKEND_BASE}/uploads/${encodedKey}`, {
      method:  "DELETE",
      headers: authHeaders(),
    });
  };

  const listFiles = async (_folder?: string): Promise<Array<{ name: string; updated_at?: string }>> => {
    return [];
  };

  return {
    uploadFile,
    getPublicUrl,
    getSignedUrl,
    downloadFile,
    deleteFile,
    listFiles,
    uploading,
    progress,
  };
}
