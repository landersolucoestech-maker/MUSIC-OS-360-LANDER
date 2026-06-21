/**
 * shared/lib/safe-object.ts
 *
 * Guards against remote property injection / prototype pollution (CWE-915) when
 * a user-controlled value is used as a dynamic object key. Rejects the
 * prototype-polluting keys (__proto__, constructor, prototype) and anything
 * outside a strict id allowlist.
 */

const FORBIDDEN_KEYS = new Set([
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
]);
const SAFE_KEY_RE = /^[A-Za-z0-9_-]+$/;

/** Type-guard: true only for a safe own-property key. */
export function isSafeKey(key: unknown): key is string {
  return typeof key === "string" && !FORBIDDEN_KEYS.has(key) && SAFE_KEY_RE.test(key);
}

/** Returns the key if safe; throws `UnsafeKeyError` otherwise. */
export class UnsafeKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeKeyError";
  }
}

export function assertSafeKey(key: unknown): string {
  if (!isSafeKey(key)) {
    throw new UnsafeKeyError(`Chave de objeto inválida: ${String(key)}`);
  }
  return key;
}
