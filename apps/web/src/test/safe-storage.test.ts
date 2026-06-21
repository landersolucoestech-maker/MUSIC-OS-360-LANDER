import { describe, it, expect, beforeEach } from "vitest";
import { withoutSecrets, safeSessionSet } from "@/shared/lib/safe-storage";

describe("safe-storage (clear-text storage of sensitive data, CWE-312)", () => {
  beforeEach(() => sessionStorage.clear());

  it("strips sensitive keys, preserves metadata", () => {
    const out = withoutSecrets({
      provider: "meta_ads",
      connected: true,
      accountName: "Acme",
      connectedAt: "2026-01-01",
      access_token: "AT-secret",
      refresh_token: "RT-secret",
      api_key: "AK-secret",
      client_secret: "CS-secret",
      nested: { id_token: "ID-secret", status: "ok" },
    }) as Record<string, unknown>;
    expect(out).toMatchObject({ provider: "meta_ads", connected: true, accountName: "Acme" });
    expect(out.access_token).toBeUndefined();
    expect(out.refresh_token).toBeUndefined();
    expect(out.api_key).toBeUndefined();
    expect(out.client_secret).toBeUndefined();
    expect((out.nested as Record<string, unknown>).id_token).toBeUndefined();
    expect((out.nested as Record<string, unknown>).status).toBe("ok");
  });

  it("never persists a secret to sessionStorage", () => {
    safeSessionSet("k", {
      connected: true,
      provider: "clicksign",
      api_key: "AK-super-secret",
      access_token: "AT-super-secret",
    });
    const raw = sessionStorage.getItem("k") ?? "";
    expect(raw).toContain("clicksign");
    expect(raw).not.toContain("AK-super-secret");
    expect(raw).not.toContain("AT-super-secret");
    expect(raw).not.toMatch(/api_key|access_token/);
  });
});
