// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const entities = [
  {
    entityName: "ArtistEntity",
    tableName: "artists",
    label: "Artistas",
    category: "REPORTABLE",
    reportable: true,
    columns: [{ name: "name", label: "Nome" }],
    risks: [],
  },
  {
    entityName: "ContractEntity",
    tableName: "contracts",
    label: "Contratos",
    category: "REPORTABLE",
    reportable: true,
    columns: [{ name: "title", label: "Titulo" }],
    risks: [],
  },
  {
    entityName: "AuditEntity",
    tableName: "audit_logs",
    label: null,
    category: "SECURITY",
    reportable: false,
    columns: [],
    risks: ["sensitive"],
  },
  {
    entityName: "ContentDetectionEntity",
    tableName: "monitoring_pending",
    label: "Monitoramento (Pendente)",
    category: "REPORTABLE",
    reportable: true,
    columns: [{ name: "plataforma", label: "Plataforma" }],
    risks: [],
  },
];

const definitions = [
  {
    tableName: "artists",
    supportsExport: true,
    supportsImport: true,
    exportableColumns: ["name"],
    importableColumns: ["name"],
  },
  {
    tableName: "contracts",
    supportsExport: true,
    supportsImport: false,
    exportableColumns: ["title"],
    importableColumns: [],
  },
];

const { exportMutate } = vi.hoisted(() => ({ exportMutate: vi.fn() }));

vi.mock("../hooks/useReports", () => ({
  useReportEntities: () => ({
    data: { entities },
    isLoading: false,
    isError: false,
  }),
  useReportDefinitions: () => ({
    data: definitions,
    isLoading: false,
    isError: false,
  }),
  useReportExport: () => ({ mutate: exportMutate, isPending: false }),
}));

vi.mock("../components/ImportDialog", () => ({
  ImportDialog: ({ open, definition }) =>
    open ? <div data-testid="import-dialog">{definition?.tableName}</div> : null,
}));

vi.mock("@/shared/components/MainLayout", () => ({
  MainLayout: ({ children }) => <div>{children}</div>,
}));

import Relatorios from "../pages/Relatorios";

describe("Relatorios - contrato dirigido pela API", () => {
  it("renderiza somente entidades reportaveis retornadas pela API", () => {
    render(<Relatorios />);

    expect(screen.getByTestId("entity-row-artists")).toBeTruthy();
    expect(screen.getByTestId("entity-row-contracts")).toBeTruthy();
    expect(screen.queryByTestId("entity-row-audit_logs")).toBeNull();
  });

  it("exporta imediatamente ao clicar, sem modal intermediario", () => {
    render(<Relatorios />);

    fireEvent.click(screen.getByTestId("btn-export-contracts"));
    expect(screen.queryByTestId("export-dialog")).toBeNull();
    expect(exportMutate).toHaveBeenCalledWith(
      { entity: "contracts", params: expect.objectContaining({ format: "xlsx" }) },
      expect.anything(),
    );
  });

  it("abre a importacao para a entidade selecionada", () => {
    render(<Relatorios />);

    fireEvent.click(screen.getByTestId("btn-import-artists"));
    expect(screen.getByTestId("import-dialog").textContent).toBe("artists");
  });

  it("desabilita importacao quando a definicao nao oferece suporte", () => {
    render(<Relatorios />);

    expect(screen.getByTestId("btn-import-contracts")).toBeDisabled();
  });

  it("mostra 'Temporariamente indisponivel' e desabilita import/export quando a entidade reportavel nao tem contrato ainda", () => {
    render(<Relatorios />);

    expect(screen.getByTestId("entity-row-monitoring_pending")).toBeTruthy();
    expect(screen.getByTestId("unavailable-monitoring_pending")).toBeTruthy();
    expect(screen.getByTestId("btn-import-monitoring_pending")).toBeDisabled();
    expect(screen.getByTestId("btn-export-monitoring_pending")).toBeDisabled();
  });
});
