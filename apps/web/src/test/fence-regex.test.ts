import { describe, it, expect } from "vitest";

// Mirrors the de-ReDoS'd markdown-fence extractor now used in all
// packages/ai-skills/*/parser.ts (removed the ambiguous `\s*` before the lazy
// group that caused catastrophic backtracking — CWE-1333).
const FENCE = /```(?:json)?([\s\S]*?)```/i;

describe("markdown fence JSON extraction (ReDoS-safe)", () => {
  it("extracts fenced JSON content", () => {
    const m = '```json\n{"a":1}\n```'.match(FENCE);
    expect(m?.[1]?.trim()).toBe('{"a":1}');
  });

  it("extracts plain fenced content", () => {
    const m = "```\nhello world\n```".match(FENCE);
    expect(m?.[1]?.trim()).toBe("hello world");
  });

  it("completes quickly on a backtracking-attempt input (no closing fence)", () => {
    const evil = "```json" + " ".repeat(100000) + "x"; // never closes
    const start = Date.now();
    const m = evil.match(FENCE);
    expect(m).toBeNull();
    expect(Date.now() - start).toBeLessThan(1000);
  });
});
