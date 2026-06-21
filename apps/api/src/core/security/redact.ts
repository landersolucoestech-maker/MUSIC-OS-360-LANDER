/**
 * core/security/redact.ts
 *
 * Prevents clear-text logging/exposure of sensitive data (CWE-312/532).
 * Deep-redacts values whose key looks like a secret (token, password, api_key,
 * secret, *_url with credentials, service_role, jwt, …) before they are logged
 * or serialized. Use `safeLog`/`redactSensitiveObject` instead of logging raw
 * objects that may carry credentials.
 */

const SENSITIVE_KEY_RE =
  /(pass(word)?|token|api_?key|secret|private_?key|service_?role|database_?url|direct_?url|jwt|bearer|credential|authorization|encryption_?key|dsn)/i;

export const REDACTED = "[REDACTED]";

/** Deep-redacts sensitive values in an object/array. Non-sensitive data kept. */
export function redactSensitiveObject<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((v) => redactSensitiveObject(v)) as unknown as T;
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY_RE.test(k) ? REDACTED : redactSensitiveObject(v);
    }
    return out as T;
  }
  return value;
}

/** Redacts a single string if it is provided for a sensitive field. */
export function redactSensitiveValue(value: unknown): string {
  return value == null ? "" : REDACTED;
}

/** Console logger that deep-redacts its arguments first. */
export function safeLog(...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(...args.map((a) => redactSensitiveObject(a)));
}
