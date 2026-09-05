// @ts-nocheck
// Component tests for ExecucaoDetailModal (rebuilt for real content_detections
// data — Decision Gate item 11).
//
// Covers:
//  1. When obra is present: renders compositor, cod_ecad (green), no orphan warning
//  2. When obra is absent: renders red "Obra não encontrada no catálogo" warning
//  3. DetectionStatus badge labels and Match ECAD indicator text

import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ExecucaoDetailModal } from "@/modules/monitoring/rights/components/ExecucaoDetailModal";
import type { DetectionRow } from "@/modules/monitoring/rights/components/ExecucoesTable";

const BASE_EXEC: DetectionRow = {
  id: "det-001",
  obra_id: "obra-001",
  artist_id: null,
  plataforma: "YouTube",
  titulo_detectado: "Noite de Luz",
  url: "https://youtube.com/x",
  score: "0.92",
  status: "concluido",
  tipo: "uso_nao_autorizado",
  detectado_em: "2026-05-08T14:32:00",
  metadata: {},
  created_at: "2026-05-08T14:32:00",
  updated_at: "2026-05-08T14:32:00",
  obra: {
    id: "obra-001",
    titulo: "Noite de Luz",
    compositor: "Vitória Carvalho",
    compositores: "Vitória Carvalho, Lucas Mendes",
    editora: "MusicOS Publishing",
    isrc: "BRMSC2500001",
    iswc: "T-123.456.789-0",
    cod_ecad: "ECAD-0001-VL",
    cod_entidade: "ABR-001-2025",
    genero: "Pop",
    duracao: "3:42",
    status: "registrado",
  },
};

const ORPHAN_EXEC: DetectionRow = {
  id: "det-011",
  obra_id: null,
  artist_id: null,
  plataforma: "TikTok",
  titulo_detectado: "Track Desconhecida",
  url: null,
  score: null,
  status: "pendente",
  tipo: "uso_nao_autorizado",
  detectado_em: "2026-05-02T11:20:00",
  metadata: {},
  created_at: "2026-05-02T11:20:00",
  updated_at: "2026-05-02T11:20:00",
  obra: undefined,
};

function renderModal(exec: DetectionRow | null, open = true) {
  return render(
    <ExecucaoDetailModal exec={exec} open={open} onOpenChange={() => {}} />,
  );
}

describe("<ExecucaoDetailModal /> — with catalog data", () => {
  it("renders dialog title and plataforma from exec props", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByRole("heading", { name: /Noite de Luz/i })).toBeInTheDocument();
    expect(screen.getAllByText("YouTube").length).toBeGreaterThan(0);
  });

  it("shows '✓ Obra vinculada com cód. ECAD' when obra has cod_ecad", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText(/Obra vinculada com cód\. ECAD/i)).toBeInTheDocument();
  });

  it("shows compositor(es) from obra", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText("Vitória Carvalho, Lucas Mendes")).toBeInTheDocument();
  });

  it("shows ECAD identifier from obra", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText("ECAD-0001-VL")).toBeInTheDocument();
  });

  it("shows ISWC from obra when present", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText("T-123.456.789-0")).toBeInTheDocument();
  });

  it("does NOT render the orphan warning alert", () => {
    renderModal(BASE_EXEC);
    expect(
      screen.queryByText(/Obra não encontrada no catálogo/i),
    ).not.toBeInTheDocument();
  });

  it("shows publisher/editora from obra", () => {
    renderModal(BASE_EXEC);
    expect(screen.getAllByText("MusicOS Publishing").length).toBeGreaterThan(0);
  });

  it("shows the catalog status row", () => {
    renderModal(BASE_EXEC);
    expect(screen.getByText(/registrado/i)).toBeInTheDocument();
  });
});

describe("<ExecucaoDetailModal /> — orphan detection (no obra)", () => {
  it("renders dialog title from titulo_detectado", () => {
    renderModal(ORPHAN_EXEC);
    expect(screen.getByRole("heading", { name: /Track Desconhecida/i })).toBeInTheDocument();
  });

  it("renders the red 'Obra não encontrada no catálogo' alert", () => {
    renderModal(ORPHAN_EXEC);
    expect(
      screen.getByText(/Obra não encontrada no catálogo/i),
    ).toBeInTheDocument();
  });

  it("does NOT render catalog data rows (Compositor, Editora)", () => {
    renderModal(ORPHAN_EXEC);
    expect(screen.queryByText(/Compositor\(es\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Publisher / Editora")).not.toBeInTheDocument();
  });

  it("shows '✗ Sem correspondência no catálogo/ECAD' when there is no obra", () => {
    renderModal(ORPHAN_EXEC);
    expect(screen.getByText(/Sem correspondência no catálogo\/ECAD/i)).toBeInTheDocument();
  });
});

describe("<ExecucaoDetailModal /> — status badge variants", () => {
  it.each([
    ["concluido" as const, "Concluído"],
    ["em_andamento" as const, "Em Andamento"],
    ["pendente" as const, "Pendente"],
    ["rejeitado" as const, "Rejeitado"],
    ["arquivado" as const, "Arquivado"],
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
      obra: { ...BASE_EXEC.obra!, iswc: null },
    });
    expect(screen.queryByText("ISWC")).not.toBeInTheDocument();
  });

  it("shows 'Não cadastrado' warning when cod_ecad is null in catalog", () => {
    renderModal({
      ...BASE_EXEC,
      obra: { ...BASE_EXEC.obra!, cod_ecad: null },
    });
    expect(screen.getByText(/Não cadastrado/i)).toBeInTheDocument();
  });
});
