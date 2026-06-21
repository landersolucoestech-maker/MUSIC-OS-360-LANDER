/**
 * shared/lib/safe-storage.ts
 *
 * Prevents clear-text storage of sensitive data (CWE-312) in browser storage.
 * OAuth tokens / API keys / secrets must never be persisted in
 * localStorage/sessionStorage — only non-sensitive connection metadata
 * (provider, account name, status, timestamps) may be kept client-side.
 * `safeSessionSet` deep-strips known sensitive keys before persisting.
 */

const SENSITIVE_KEY_RE =
  /(access_?token|refresh_?token|id_?token|api_?key|client_?secret|auth_?code|secret|password|bearer|credential|private_?key)/i;

function stripSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripSensitive);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_RE.test(k)) continue; // drop the secret, keep metadata
      out[k] = stripSensitive(v);
    }
    return out;
  }
  return value;
}

/** Returns a deep copy of `value` with all sensitive keys removed. */
export function withoutSecrets<T>(value: T): T {
  return stripSensitive(value) as T;
}

/** Persists only non-sensitive metadata to sessionStorage (secrets stripped). */
export function safeSessionSet(key: string, value: unknown): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(withoutSecrets(value)));
  } catch {
    /* storage unavailable — ignore */
  }
}
