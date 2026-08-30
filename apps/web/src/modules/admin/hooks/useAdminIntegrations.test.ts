import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() }));
vi.mock("@/shared/lib/api-client", () => ({ api: apiMock }));

import { adminIntegrationsService } from "@/modules/admin/services/admin-integrations.service";

/**
 * BLOCKER 2026-08-23 — a aba Integrações do Portal Admin aparecia vazia com 14
 * registros no banco. Causa: qualquer falha de request era colapsada em lista
 * vazia pela UI, então 404/403/500/rede eram indistinguíveis de "catálogo vazio".
 *
 * Estes testes travam o contrato administrativo:
 *  - o endpoint ADMIN é distinto do resolver do cliente;
 *  - o service devolve o array administrativo COMPLETO (draft + sem adapter);
 *  - erro PROPAGA (não vira []), para a UI poder mostrar estado de erro real.
 */
describe("adminIntegrationsService — catálogo administrativo", () => {
  beforeEach(() => vi.clearAllMocks());

  const rows = [
    {
      id: "1", providerKey: "docusign", name: "DocuSign",
      categorySlug: "signing", categoryName: "Assinatura Digital",
      connectionKind: "oauth", requiredEnv: [], publicationState: "published",
      viewAudience: { mode: "all", plans: [], tenantIds: [] },
      useAudience: { mode: "all", plans: [], tenantIds: [] },
      isCore: false, notes: null,
      technicalCapability: "implemented", capabilityEvidence: "x", publishedWithoutCapability: false,
    },
    {
      id: "2", providerKey: "clicksign", name: "Clicksign",
      categorySlug: "signing", categoryName: "Assinatura Digital",
      connectionKind: "tenant_credentials", requiredEnv: [], publicationState: "hidden",
      viewAudience: { mode: "none", plans: [], tenantIds: [] },
      useAudience: { mode: "none", plans: [], tenantIds: [] },
      isCore: false, notes: null,
      technicalCapability: "not_implemented", capabilityEvidence: null, publishedWithoutCapability: false,
    },
  ];

  it("usa o endpoint ADMIN, não o resolver client-facing", async () => {
    apiMock.get.mockResolvedValue(rows);
    await adminIntegrationsService.list();
    expect(apiMock.get).toHaveBeenCalledWith("/admin/integrations");
    // O resolver do cliente é outra superfície e não pode ser usado aqui.
    expect(apiMock.get).not.toHaveBeenCalledWith("/integrations/providers");
  });

  it("devolve estados não-disponíveis e providers sem adapter — o admin governa o catálogo inteiro", async () => {
    apiMock.get.mockResolvedValue(rows);
    const result = await adminIntegrationsService.list();

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.providerKey).sort()).toEqual(["clicksign", "docusign"]);
    expect(result.find((r) => r.providerKey === "clicksign")?.publicationState).toBe("hidden");
    expect(result.find((r) => r.providerKey === "clicksign")?.technicalCapability).toBe("not_implemented");
  });

  it("não re-desembrulha o envelope: api.get já resolve payload.data (bug real deste repo)", async () => {
    // Shape REAL que o api-client entrega: array puro, não { data: [...] }.
    apiMock.get.mockResolvedValue(rows);
    await expect(adminIntegrationsService.list()).resolves.toHaveLength(2);
  });

  it("PROPAGA erro em vez de devolver lista vazia (404/403/500 ≠ catálogo vazio)", async () => {
    const failure = Object.assign(new Error("Not Found"), { statusCode: 404 });
    apiMock.get.mockRejectedValue(failure);

    // Se o service engolisse o erro e devolvesse [], a UI mostraria
    // "nenhuma integração" — exatamente o blocker relatado.
    await expect(adminIntegrationsService.list()).rejects.toThrow("Not Found");
  });

  it("update usa PATCH no recurso administrativo correto", async () => {
    apiMock.patch.mockResolvedValue(rows[0]);
    await adminIntegrationsService.update("1", { publicationState: "hidden" });
    expect(apiMock.patch).toHaveBeenCalledWith("/admin/integrations/1", { publicationState: "hidden" });
  });
});
