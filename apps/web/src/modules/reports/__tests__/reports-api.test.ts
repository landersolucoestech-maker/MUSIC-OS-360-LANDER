import { beforeEach, describe, expect, it, vi } from "vitest";

const apiClientMock = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  getAccessToken: vi.fn(() => "access-token"),
  getTenantId: vi.fn(() => "tenant-123"),
}));

vi.mock("@/shared/lib/api-client", () => ({
  api: {
    get: apiClientMock.get,
    post: apiClientMock.post,
  },
  getAccessToken: apiClientMock.getAccessToken,
  getTenantId: apiClientMock.getTenantId,
}));

vi.mock("@/shared/lib/env", () => ({
  API_BASE_URL: "http://localhost:3001",
}));

import { reportsApi, triggerBlobDownload, XLSX_MIME } from "../services/reports-api";

describe("reportsApi — Central de Relatórios real-only", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("busca entities exclusivamente pela API real", () => {
    reportsApi.entities();

    expect(apiClientMock.get).toHaveBeenCalledWith("/reports/entities");
  });

  it("busca definitions exclusivamente pela API real", () => {
    reportsApi.definitions();

    expect(apiClientMock.get).toHaveBeenCalledWith("/reports/definitions");
  });

  it("exportBlob chama o endpoint real com token, tenant e query params", async () => {
    const blob = new Blob(["xlsx"]);
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: vi.fn(() => 'attachment; filename="artistas.xlsx"'),
      },
      blob: vi.fn().mockResolvedValue(blob),
    } as unknown as Response);

    const result = await reportsApi.exportBlob("artistas", {
      format: "xlsx",
      columns: ["nome", "status"],
      filters: { status: "ativo", vazio: "" },
      sort: "nome",
      order: "ASC",
      page: 2,
      pageSize: 50,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/api/v1/reports/entities/artistas/export?format=xlsx&columns=nome%2Cstatus&sort=nome&order=ASC&page=2&pageSize=50&status=ativo",
      {
        headers: {
          Authorization: "Bearer access-token",
          "X-Tenant-ID": "tenant-123",
        },
        credentials: "include",
      },
    );
    expect(result).toEqual({ blob, filename: "artistas.xlsx" });
  });

  it("exportBlob falha explicitamente quando a API responde erro", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue("serviço indisponível"),
    } as unknown as Response);

    await expect(reportsApi.exportBlob("artistas", { format: "xlsx" })).rejects.toThrow(
      "Exportação falhou (503): serviço indisponível",
    );
  });

  it("envia importValidate para a API real", () => {
    const body = { filename: "artistas.xlsx", mimeType: XLSX_MIME, contentBase64: "abc" };

    reportsApi.importValidate("artistas", body);

    expect(apiClientMock.post).toHaveBeenCalledWith("/reports/entities/artistas/import/validate", body);
  });

  it("envia importCommit para a API real", () => {
    const body = { filename: "artistas.xlsx", mimeType: XLSX_MIME, contentBase64: "abc" };

    reportsApi.importCommit("artistas", body);

    expect(apiClientMock.post).toHaveBeenCalledWith("/reports/entities/artistas/import/commit", body);
  });

  describe("triggerBlobDownload — não revoga a URL antes do download iniciar", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.stubGlobal("URL", {
        createObjectURL: vi.fn(() => "blob:fake-url"),
        revokeObjectURL: vi.fn(),
      });
    });

    it("clica no link ANTES de revogar a URL, e a revogação só ocorre no próximo tick", () => {
      const anchor = { click: vi.fn(), href: "", download: "" };
      const createSpy = vi.spyOn(document, "createElement").mockReturnValue(anchor as unknown as HTMLAnchorElement);

      triggerBlobDownload(new Blob(["x"]), "arquivo.xlsx");

      expect(anchor.click).toHaveBeenCalledTimes(1);
      expect(anchor.href).toBe("blob:fake-url");
      // A revogação NÃO pode ter acontecido ainda no mesmo tick do click().
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      vi.runAllTimers();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:fake-url");

      createSpy.mockRestore();
    });
  });
});
