/**
 * core/security/safe-object.ts
 *
 * Guards against remote property injection / prototype pollution (CWE-915) when
 * user-controlled values are used as dynamic object keys or merged into objects.
 *
 * Two contracts:
 *  - isSafeKey/assertSafeKey: STRICT — only `^[A-Za-z0-9_-]+$` identifiers that
 *    are not prototype-polluting. Use for field/column/id names.
 *  - isWritableKey: LENIENT — any non-empty string that is not a prototype-
 *    polluting key. Use for free-form keys (e.g. spreadsheet headers that may
 *    contain accents/spaces) written into an `Object.create(null)` data bag.
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
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
]);

const SAFE_KEY_RE = /^[A-Za-z0-9_-]+$/;

/** Strict type-guard: true only for a safe own-property identifier key. */
export function isSafeKey(key: unknown): key is string {
  return (
    typeof key === "string" &&
    !FORBIDDEN_KEYS.has(key) &&
    SAFE_KEY_RE.test(key)
  );
}

/**
 * Lenient guard: true for any non-empty string that cannot pollute a prototype.
 * Permits free-form keys (accents, spaces, punctuation) but never `__proto__`,
 * `constructor`, `prototype`, `toString`, … Always pair with an
 * `Object.create(null)` target so a forbidden own-property cannot be reached.
 */
export function isWritableKey(key: unknown): key is string {
  return typeof key === "string" && key.length > 0 && !FORBIDDEN_KEYS.has(key);
}

export class UnsafeKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeKeyError";
  }
}

/** Returns the key if it passes the strict guard; throws otherwise. */
export function assertSafeKey(key: unknown): string {
  if (!isSafeKey(key)) {
    throw new UnsafeKeyError(`Chave de objeto inválida: ${String(key)}`);
  }
  return key;
}
