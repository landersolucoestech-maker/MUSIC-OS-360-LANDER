// @ts-nocheck
// Component tests for ExecucaoDetailModal (Rights Monitoring — Task #604).
//
// Covers:
//  1. When obra_catalog is present: renders compositor, cod_ecad (green), no orphan warning
//  2. When obra_catalog is absent: renders red "Obra não encontrada no catálogo" warning,
//     shows the orphan ISRC in a <code> tag, no catalog info rows
//  3. ExecutionStatus badge labels and Match ECAD indicator text

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ExecucaoDetailModal } from "@/modules/rights-monitoring/components/ExecucaoDetailModal";
import type { RightsExecution } from "@/modules/rights-monitoring/types";

const BASE_EXEC: RightsExecution = {
  id: "re-001",
  obra_titulo: "Noite de Luz",
  artista: "Vitória Lunar",
  isrc: "BRMSC2500001",
  origem: "Rádio Globo FM",
  tipo_execucao: "radio_fm",
  data_hora: "2026-05-08T14:32:00",
  match_ecad: true,
  valor_estimado: 18.5,
  status: "confirmado",
  obra_catalog: {
    compositor: "Vitória Carvalho",
    compositores: "Vitória Carvalho, Lucas Mendes",
    co_compositores: "Lucas Mendes",
    editora: "MusicOS Publishing",
    detentores: "MusicOS Publishing",
    iswc: "T-123.456.789-0",
    cod_ecad: "ECAD-0001-VL",
    cod_abramus: "ABR-001-2025",
    genero: "Pop",
    duracao: "3:42",
    catalog_id: "obra-001",
    catalog_status: "registrado",
  },
};

const ORPHAN_EXEC: RightsExecution = {
  id: "re-011",
  obra_titulo: "Track Desconhecida",
  artista: "Artista Desconhecido",
  isrc: "BRMSC2599998",
  origem: "Web Rádio Hits Brasil",
  tipo_execucao: "web_radio",
  data_hora: "2026-05-02T11:20:00",
  match_ecad: false,
  valor_estimado: 3.5,
  status: "nao_reportado",
  obra_catalog: undefined,
};

function renderModal(exec: RightsExecution | null, open = true) {
  return render(
    <ExecucaoDetailModal exec={exec} open={open} onOpenChange={() => {}} />,
  );
}

describe("<ExecucaoDetailModal /> — with catalog data", () => {
  it("renders dialog title and artist from exec props", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByRole("heading", { name: /Noite de Luz/i })).toBeInTheDocument();
    expect(screen.getByText("Vitória Lunar")).toBeInTheDocument();
  });

  it("shows ISRC, origem and tipo in the Dados da Execução section", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText("BRMSC2500001")).toBeInTheDocument();
    expect(screen.getByText("Rádio Globo FM")).toBeInTheDocument();
    expect(screen.getByText("Rádio FM")).toBeInTheDocument();
  });

  it("shows '✓ Obra encontrada no ECAD' when match_ecad is true", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText(/Obra encontrada no ECAD/i)).toBeInTheDocument();
  });

  it("shows compositor(es) from obra_catalog", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText("Vitória Carvalho, Lucas Mendes")).toBeInTheDocument();
  });

  it("shows cod_ecad from obra_catalog", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText("ECAD-0001-VL")).toBeInTheDocument();
  });

  it("shows ISWC from obra_catalog when present", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText("T-123.456.789-0")).toBeInTheDocument();
  });

  it("does NOT render the orphan warning alert", () => {
    renderModal(BASE_EXEC);
    expect(
      screen.queryByText(/Obra não encontrada no catálogo/i),
    ).not.toBeInTheDocument();
  });

  it("shows publisher/editora from obra_catalog", () => {
    renderModal(BASE_EXEC);
    expect(screen.getAllByText("MusicOS Publishing").length).toBeGreaterThan(0);
  });

  it("shows the catalog status row", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText(/registrado/i)).toBeInTheDocument();
  });
});

describe("<ExecucaoDetailModal /> — orphan execution (no obra_catalog)", () => {
  it("renders dialog title from exec.obra_titulo", () => {
    renderModal(ORPHAN_EXEC);
    expect(screen.getByRole("heading", { name: /Track Desconhecida/i })).toBeInTheDocument();
  });

  it("renders the red 'Obra não encontrada no catálogo' alert", () => {
    renderModal(ORPHAN_EXEC);
    expect(
      screen.getByText(/Obra não encontrada no catálogo/i),
    ).toBeInTheDocument();
  });

  it("shows the orphan ISRC in the alert body", () => {
    renderModal(ORPHAN_EXEC);
    const alert = screen.getByText(/Nenhuma obra com ISRC/i).closest("div");
    expect(within(alert!).getByText("BRMSC2599998")).toBeInTheDocument();
  });

  it("does NOT render catalog data rows (Compositor, Editora)", () => {
    renderModal(ORPHAN_EXEC);
    expect(screen.queryByText(/Compositor\(es\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Publisher / Editora")).not.toBeInTheDocument();
  });

  it("shows '✗ Sem correspondência no ECAD' when match_ecad is false", () => {
    renderModal(ORPHAN_EXEC);
    expect(screen.getByText(/Sem correspondência no ECAD/i)).toBeInTheDocument();
  });
});

describe("<ExecucaoDetailModal /> — status badge variants", () => {
  it.each([
    ["confirmado" as const, "Confirmado"],
    ["pendente" as const, "Pendente"],
    ["divergencia" as const, "Divergência"],
    ["nao_reportado" as const, "Não Reportado"],
  ])("renders badge label '%s' for status '%s'", (status, label) => {
    renderModal({ ...BASE_EXEC, status });
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});

describe("<ExecucaoDetailModal /> — edge cases", () => {
  it("renders nothing when exec is null", () => {
    const { container } = renderModal(null);
    expect(container.firstChild).toBeNull();
  });

  it("does not render ISWC row when iswc is null", () => {
    renderModal({
      ...BASE_EXEC,
      obra_catalog: { ...BASE_EXEC.obra_catalog!, iswc: null },
    });
    expect(screen.queryByText("ISWC")).not.toBeInTheDocument();
  });

  it("shows 'Não cadastrado' warning when cod_ecad is null in catalog", () => {
    renderModal({
      ...BASE_EXEC,
      obra_catalog: { ...BASE_EXEC.obra_catalog!, cod_ecad: null },
    });
    expect(screen.getByText(/Não cadastrado/i)).toBeInTheDocument();
  });
});
