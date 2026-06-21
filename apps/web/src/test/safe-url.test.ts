import { describe, it, expect } from "vitest";
import { safeLinkHref, safeImageSrc } from "@/shared/lib/safe-url";

describe("safe-url XSS guards (CWE-79)", () => {
  describe("safeLinkHref", () => {
    it("preserves safe link schemes", () => {
      expect(safeLinkHref("https://example.com/x")).toBe("https://example.com/x");
      expect(safeLinkHref("http://example.com")).toBe("http://example.com");
      expect(safeLinkHref("mailto:a@b.com")).toBe("mailto:a@b.com");
    });
    it("blocks dangerous schemes", () => {
      expect(safeLinkHref("javascript:alert(1)")).toBe("");
      expect(safeLinkHref("JavaScript:alert(1)")).toBe("");
      expect(safeLinkHref("data:text/html,<script>alert(1)</script>")).toBe("");
      expect(safeLinkHref("vbscript:msgbox(1)")).toBe("");
      expect(safeLinkHref("")).toBe("");
      expect(safeLinkHref(null)).toBe("");
    });
  });

  describe("safeImageSrc", () => {
    it("preserves safe image sources", () => {
      expect(safeImageSrc("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
      expect(safeImageSrc("blob:https://example.com/abc")).toBe("blob:https://example.com/abc");
      expect(safeImageSrc("data:image/png;base64,iVBORw0KGgo=")).toBe("data:image/png;base64,iVBORw0KGgo=");
    });
    it("blocks dangerous / scriptable sources", () => {
      expect(safeImageSrc("javascript:alert(1)")).toBe("");
      expect(safeImageSrc("data:text/html,<script>alert(1)</script>")).toBe("");
      // inline SVG can carry onload/script — rejected even though it's image/*
      expect(safeImageSrc("data:image/svg+xml;base64,PHN2ZyBvbmxvYWQ9YWxlcnQoMSk+")).toBe("");
      expect(safeImageSrc("")).toBe("");
      expect(safeImageSrc(undefined)).toBe("");
    });
  });
});
