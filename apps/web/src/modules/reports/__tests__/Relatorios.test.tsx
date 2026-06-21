// @ts-nocheck
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const entities = [
  {
    entityName: "ArtistEntity",
    tableName: "artists",
    category: "catalog",
    reportable: true,
    columns: [{ name: "name", label: "Nome" }],
    risks: [],
  },
  {
    entityName: "ContractEntity",
    tableName: "contracts",
    category: "contracts",
    reportable: true,
    columns: [{ name: "title", label: "Titulo" }],
    risks: [],
  },
  {
    entityName: "AuditEntity",
    tableName: "audit_logs",
    category: "security",
    reportable: false,
    columns: [],
    risks: ["sensitive"],
  },
];

const definitions = [
  { tableName: "artists", supportsExport: true, supportsImport: true },
  { tableName: "contracts", supportsExport: true, supportsImport: false },
];

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
}));

vi.mock("../components/ExportDialog", () => ({
  ExportDialog: ({ open, definition }) =>
    open ? <div data-testid="export-dialog">{definition?.tableName}</div> : null,
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

  it("abre a exportacao para a entidade selecionada", () => {
    render(<Relatorios />);

    fireEvent.click(screen.getByTestId("btn-export-contracts"));
    expect(screen.getByTestId("export-dialog").textContent).toBe("contracts");
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
});
