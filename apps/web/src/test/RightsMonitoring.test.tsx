// @ts-nocheck
// Integration tests for RightsMonitoring page (Rights Monitoring — Task #604).
//
// Covers:
//  1. Clicking a row detail button opens ExecucaoDetailModal with compositor + cod_ecad
//     from the catalog (enriched via ISRC lookup)
//  2. Clicking the orphan row detail button shows "Obra não encontrada no catálogo" warning
//  3. Divergências tab badge count reflects orphan ISRCs detected at runtime

import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// ── Stub MainLayout — renders children directly ─────────────────────────────
vi.mock("@/shared/components/MainLayout", () => ({
  MainLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── MOCK_DATA: provide obras for ISRCs used in MOCK_EXECUCOES_PUBLICAS ───────
// BRMSC2599998 is intentionally absent → creates an orphan execution.
vi.mock("@/shared/data/mockData", () => ({
  MOCK_DATA: {
    obras: [
      {
        id: "obra-001",
        titulo: "Noite de Luz",
        compositor: "Vitória Carvalho",
        compositores: "Vitória Carvalho, Lucas Mendes",
        co_compositores: "Lucas Mendes",
        detentores: "MusicOS Publishing",
        editora: "MusicOS Publishing",
        isrc: "BRMSC2500001",
        iswc: "T-123.456.789-0",
        cod_abramus: "ABR-001-2025",
        cod_ecad: "ECAD-0001-VL",
        genero: "Pop",
        status: "registrado",
        duracao: "3:42",
      },
      {
        id: "obra-002",
        titulo: "Beira do Rio",
        compositor: "Grupo Raiz Nordestina",
        compositores: "Grupo Raiz Nordestina",
        co_compositores: null,
        detentores: "MusicOS Publishing",
        editora: "MusicOS Publishing",
        isrc: "BRMSC2500002",
        iswc: "T-234.567.890-1",
        cod_abramus: "ABR-002-2025",
        cod_ecad: "ECAD-0002-RN",
        genero: "Forró",
        status: "registrado",
        duracao: "4:15",
      },
      {
        id: "obra-003",
        titulo: "Frequência 440",
        compositor: "Marcus Oliveira",
        compositores: "Marcus Oliveira",
        co_compositores: null,
        detentores: "Marcus Flow Music",
        editora: "Marcus Flow Music",
        isrc: "BRMSC2500003",
        iswc: "T-345.678.901-2",
        cod_abramus: "ABR-003-2025",
        cod_ecad: "ECAD-0003-MF",
        genero: "Eletrônico",
        status: "registrado",
        duracao: "5:30",
      },
      {
        id: "obra-004",
        titulo: "Amor de Interior",
        compositor: "Ana Beatriz Santos",
        compositores: "Ana Beatriz Santos, Rodolfo Lima",
        co_compositores: "Rodolfo Lima",
        detentores: "MusicOS Publishing",
        editora: "MusicOS Publishing",
        isrc: "BRMSC2500004",
        iswc: "T-456.789.012-3",
        cod_abramus: "ABR-004-2025",
        cod_ecad: "ECAD-0004-AB",
        genero: "Sertanejo",
        status: "registrado",
        duracao: "3:58",
      },
      {
        id: "obra-005",
        titulo: "Suíte Brasileira nº 1",
        compositor: "Trio Bossa Moderna",
        compositores: "Trio Bossa Moderna",
        co_compositores: null,
        detentores: "Trio Bossa Moderna",
        editora: "Trio Bossa Moderna",
        isrc: "BRMSC2500005",
        iswc: "T-567.890.123-4",
        cod_abramus: "ABR-005-2025",
        cod_ecad: "ECAD-0005-TB",
        genero: "MPB",
        status: "registrado",
        duracao: "7:20",
      },
      {
        id: "obra-006",
        titulo: "Cidade Mágica",
        compositor: "Vitória Carvalho",
        compositores: "Vitória Carvalho, Pedro Alves",
        co_compositores: "Pedro Alves",
        detentores: "MusicOS Publishing",
        editora: "MusicOS Publishing",
        isrc: "BRMSC2500006",
        iswc: "T-678.901.234-5",
        cod_abramus: "ABR-006-2025",
        cod_ecad: "ECAD-0006-VL",
        genero: "Pop",
        status: "registrado",
        duracao: "3:25",
      },
      {
        id: "obra-007",
        titulo: "Xote da Saudade",
        compositor: "Grupo Raiz Nordestina",
        compositores: "Grupo Raiz Nordestina",
        co_compositores: null,
        detentores: "MusicOS Publishing",
        editora: "MusicOS Publishing",
        isrc: "BRMSC2500007",
        iswc: "T-789.012.345-6",
        cod_abramus: "ABR-007-2025",
        cod_ecad: "ECAD-0007-RN",
        genero: "Forró",
        status: "registrado",
        duracao: "4:02",
      },
      {
        id: "obra-008",
        titulo: "Trap do Norte",
        compositor: "Pedro Alves",
        compositores: "Pedro Alves, Renan Costa Pereira",
        co_compositores: "Renan Costa Pereira",
        detentores: "Pedro Breaks Music",
        editora: "Pedro Breaks Music",
        isrc: "BRMSC2500008",
        iswc: "T-890.123.456-7",
        cod_abramus: "ABR-008-2025",
        cod_ecad: "ECAD-0008-PB",
        genero: "Trap",
        status: "registrado",
        duracao: "2:58",
      },
      // BRMSC2599998 ("Track Desconhecida") is intentionally NOT included
      // so that execution re-011 becomes an orphan.
    ],
  },
}));

import RightsMonitoring from "@/modules/rights-monitoring/pages/RightsMonitoring";

function renderPage() {
  return render(
    <MemoryRouter>
      <RightsMonitoring />
    </MemoryRouter>,
  );
}

describe("RightsMonitoring page — detail modal with catalog data", () => {
  it("clicking a matched row detail button opens modal with compositor and cod_ecad", async () => {
    renderPage();

    // The overview tab is active by default — wait for the table to render
    await waitFor(() => {
      expect(screen.getByTestId("row-exec-re-001")).toBeInTheDocument();
    });

    // The UX: each row has an ExternalLink icon button (btn-detail-{id}) that appears on hover.
    // In jsdom hover-driven opacity does not block programmatic clicks, so we click directly.
    const detailBtn = screen.getByTestId("btn-detail-re-001");
    await act(async () => { fireEvent.click(detailBtn); });

    // Get the dialog element to scope assertions
    const dialog = await screen.findByRole("dialog");

    // Modal title
    expect(within(dialog).getByText(/Noite de Luz/i)).toBeInTheDocument();

    // Catalog section: compositor(es) enriched from MOCK_DATA obras
    expect(within(dialog).getByText("Vitória Carvalho, Lucas Mendes")).toBeInTheDocument();

    // Catalog section: cod_ecad from obra
    expect(within(dialog).getByText("ECAD-0001-VL")).toBeInTheDocument();

    // No orphan warning
    expect(
      within(dialog).queryByText(/Obra não encontrada no catálogo/i),
    ).not.toBeInTheDocument();
  });
});

describe("RightsMonitoring page — detail modal for orphan execution", () => {
  it("clicking orphan row detail button shows 'Obra não encontrada no catálogo' warning with ISRC", async () => {
    renderPage();

    await waitFor(() => {
      // re-011 = "Track Desconhecida" — orphan (ISRC BRMSC2599998 not in catalog)
      expect(screen.getByTestId("row-exec-re-011")).toBeInTheDocument();
    });

    const detailBtn = screen.getByTestId("btn-detail-re-011");
    await act(async () => { fireEvent.click(detailBtn); });

    // Get the dialog element to scope assertions
    const dialog = await screen.findByRole("dialog");

    // Modal title
    expect(within(dialog).getByText(/Track Desconhecida/i)).toBeInTheDocument();

    // Orphan warning
    expect(
      within(dialog).getByText(/Obra não encontrada no catálogo/i),
    ).toBeInTheDocument();

    // The alert body mentions the orphan ISRC (scoped to dialog avoids table ISRC matches)
    expect(within(dialog).getAllByText("BRMSC2599998").length).toBeGreaterThan(0);

    // No catalog info rows (no compositor, no publisher label in dialog)
    expect(within(dialog).queryByText(/Compositor\(es\)/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText("Publisher / Editora")).not.toBeInTheDocument();
  });
});

// Helper: find the tab bar button for "Divergências" (not the KPI card span)
function getDivergenciasTabButton() {
  // "Divergências" appears multiple times: in KPI cards and in the tab bar.
  // The tab button element is a <button>, so we find all matching buttons.
  const allButtons = screen.getAllByRole("button");
  return allButtons.find(
    (btn) => btn.textContent?.includes("Divergências") && btn.tagName === "BUTTON",
  )!;
}

describe("RightsMonitoring page — Divergências tab badge", () => {
  it("Divergências tab shows a badge count greater than 0 reflecting orphan ISRCs", async () => {
    renderPage();

    // Wait for the tab bar to render
    await waitFor(() => {
      expect(getDivergenciasTabButton()).toBeDefined();
    });

    const divTab = getDivergenciasTabButton();

    // Expected badge count = 6, derived from:
    //   Static MOCK_DIVERGENCIAS (div-005 removed as superseded) = div-001, div-002,
    //   div-003 (em_resolucao), div-004, div-006 → 5 open static entries
    //   + 1 dynamic orphan divergência for BRMSC2599998 (not in mocked obras)
    //   = 6 total open divergências
    const badgeSpan = within(divTab).getByText(/^\d+$/);
    const badgeCount = parseInt(badgeSpan.textContent ?? "0", 10);
    expect(badgeCount).toBe(6);
  });

  it("clicking Divergências tab shows panel with orphan ISRC divergência entry", async () => {
    renderPage();

    await waitFor(() => {
      expect(getDivergenciasTabButton()).toBeDefined();
    });

    const divTab = getDivergenciasTabButton();
    await act(async () => { fireEvent.click(divTab); });

    // The panel should show at least one entry with "Execução sem obra cadastrada"
    await waitFor(() => {
      expect(
        screen.getByText(/Execução sem obra cadastrada/i),
      ).toBeInTheDocument();
    });

    // And the orphan ISRC should appear in the panel content (may appear in multiple elements)
    expect(screen.getAllByText(/BRMSC2599998/i).length).toBeGreaterThan(0);
  });
});
