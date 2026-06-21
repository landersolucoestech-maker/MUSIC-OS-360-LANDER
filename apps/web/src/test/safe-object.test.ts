import { describe, it, expect } from "vitest";
import { isSafeKey, assertSafeKey, UnsafeKeyError } from "@/shared/lib/safe-object";

describe("safe-object guards (remote property injection, CWE-915)", () => {
  it("accepts normal id-like keys", () => {
    expect(isSafeKey("ticket-123")).toBe(true);
    expect(assertSafeKey("msg_42")).toBe("msg_42");
  });

  it("rejects prototype-polluting keys", () => {
    for (const bad of ["__proto__", "constructor", "prototype"]) {
      expect(isSafeKey(bad)).toBe(false);
      expect(() => assertSafeKey(bad)).toThrow(UnsafeKeyError);
    }
  });

  it("rejects arbitrary/unsafe keys", () => {
    for (const bad of ["toString", "a.b", "a/b", "a b", "", "a[b]", "valueOf "]) {
      expect(() => assertSafeKey(bad)).toThrow(UnsafeKeyError);
    }
  });

  it("does not pollute Object.prototype when used to guard a dynamic write", () => {
    const obj: Record<string, unknown> = {};
    const key = "__proto__";
    if (isSafeKey(key)) {
      obj[key] = { polluted: true };
    }
    // guard denied the write → prototype intact
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
