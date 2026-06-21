import { describe, it, expect } from "vitest";
import DOMPurify from "dompurify";

// Mirrors the config used at the dangerouslySetInnerHTML sinks
// (ChatAttachment docx preview, SupportKnowledge article).
const OPTS = { USE_PROFILES: { html: true } } as const;

describe("HTML sanitization at dangerouslySetInnerHTML sinks (CWE-79)", () => {
  it("strips <script>", () => {
    expect(DOMPurify.sanitize("<script>alert(1)</script><p>ok</p>", OPTS)).not.toMatch(/script/i);
  });
  it("strips event handlers (onerror/onload/onclick)", () => {
    expect(DOMPurify.sanitize("<img src=x onerror=alert(1)>", OPTS)).not.toMatch(/onerror/i);
    expect(DOMPurify.sanitize("<svg onload=alert(1)></svg>", OPTS)).not.toMatch(/onload/i);
    expect(DOMPurify.sanitize("<a href='#' onclick='x()'>a</a>", OPTS)).not.toMatch(/onclick/i);
  });
  it("strips <iframe>/<object>/<embed>", () => {
    expect(DOMPurify.sanitize('<iframe src="https://evil.com"></iframe>', OPTS)).not.toMatch(/iframe/i);
    expect(DOMPurify.sanitize('<object data="x"></object>', OPTS)).not.toMatch(/object/i);
  });
  it("strips javascript: hrefs", () => {
    expect(DOMPurify.sanitize('<a href="javascript:alert(1)">x</a>', OPTS)).not.toMatch(/javascript:/i);
  });
  it("preserves safe formatting markup (no functional regression)", () => {
    const out = DOMPurify.sanitize("<p><b>hello</b> <em>world</em></p>", OPTS);
    expect(out).toContain("hello");
    expect(out).toContain("<b>");
  });
});
