import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("OAuth browser token boundary", () => {
  it("does not forward OAuth credentials from the callback to the opener", () => {
    const source = readSource("./OAuthCallbackPage.tsx");
    expect(source).not.toContain("data.access_token");
    expect(source).not.toContain("access_token: data");
    expect(source).toContain('type: "musicos360_oauth_success"');
  });

  it("does not persist OAuth connections or tokens in sessionStorage", () => {
    const source = readSource("../hooks/useMarketingOAuth.ts");
    expect(source).not.toContain("sessionStorage");
    expect(source).not.toContain("safeSessionSet");
    expect(source).toContain("/integrations/oauth/status");
    expect(source).toContain("/integrations/oauth/disconnect");
  });
});
