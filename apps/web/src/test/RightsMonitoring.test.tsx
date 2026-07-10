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

// ── rights-source: fixtures de teste (a fonte real é vazia até a integração
// consumir /content-detections; ver rights-source.ts). Estas linhas espelham o
// dataset dev usado quando os testes foram escritos. ─────────────────────────
vi.mock("@/modules/monitoring/rights/services/rights-source", () => ({
  RIGHTS_DATA_IS_MOCK: true,
  RIGHTS_EXECUCOES: [
    { id: "re-001", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", origem: "Rádio Globo FM", tipo_execucao: "radio_fm", data_hora: "2026-05-08T14:32:00", match_ecad: true, valor_estimado: 18.50, status: "confirmado" },
    { id: "re-002", obra_titulo: "Beira do Rio", artista: "Grupo Raiz Nordestina", isrc: "BRMSC2500002", origem: "TV Globo", tipo_execucao: "tv_aberta", data_hora: "2026-05-08T21:05:00", match_ecad: true, valor_estimado: 124.00, status: "confirmado" },
    { id: "re-003", obra_titulo: "Frequência 440", artista: "DJ Marcus Flow", isrc: "BRMSC2500003", origem: "Multishow", tipo_execucao: "tv_fechada", data_hora: "2026-05-07T23:15:00", match_ecad: false, valor_estimado: 87.50, status: "divergencia" },
    { id: "re-004", obra_titulo: "Amor de Interior", artista: "Ana Beatriz Santos", isrc: "BRMSC2500004", origem: "Rádio Nacional AM", tipo_execucao: "radio_am", data_hora: "2026-05-07T10:20:00", match_ecad: true, valor_estimado: 9.20, status: "confirmado" },
    { id: "re-005", obra_titulo: "Suíte Brasileira nº 1", artista: "Trio Bossa Moderna", isrc: "BRMSC2500005", origem: "Show Ao Vivo — SP", tipo_execucao: "show_ao_vivo", data_hora: "2026-05-06T22:00:00", match_ecad: true, valor_estimado: 560.00, status: "pendente" },
    { id: "re-006", obra_titulo: "Cidade Mágica", artista: "Vitória Lunar", isrc: "BRMSC2500006", origem: "Web Rádio Samba Brasil", tipo_execucao: "web_radio", data_hora: "2026-05-06T16:45:00", match_ecad: false, valor_estimado: 4.10, status: "nao_reportado" },
    { id: "re-007", obra_titulo: "Xote da Saudade", artista: "Grupo Raiz Nordestina", isrc: "BRMSC2500007", origem: "Casa Noturna Via Music", tipo_execucao: "casa_noturna", data_hora: "2026-05-05T23:55:00", match_ecad: true, valor_estimado: 32.00, status: "pendente" },
    { id: "re-008", obra_titulo: "Trap do Norte", artista: "Pedro Breaks", isrc: "BRMSC2500008", origem: "Festival Rec Beat", tipo_execucao: "evento", data_hora: "2026-05-04T20:30:00", match_ecad: false, valor_estimado: 210.00, status: "nao_reportado" },
    { id: "re-009", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", origem: "Rádio Transamérica", tipo_execucao: "radio_fm", data_hora: "2026-05-04T08:00:00", match_ecad: true, valor_estimado: 18.50, status: "confirmado" },
    { id: "re-010", obra_titulo: "Amor de Interior", artista: "Ana Beatriz Santos", isrc: "BRMSC2500004", origem: "TV Cultura", tipo_execucao: "tv_aberta", data_hora: "2026-05-03T15:30:00", match_ecad: true, valor_estimado: 98.00, status: "confirmado" },
    { id: "re-011", obra_titulo: "Track Desconhecida", artista: "Artista Desconhecido", isrc: "BRMSC2599998", origem: "Web Rádio Hits Brasil", tipo_execucao: "web_radio", data_hora: "2026-05-02T11:20:00", match_ecad: false, valor_estimado: 3.50, status: "nao_reportado" },
  ],
  RIGHTS_BROADCAST_DETECTIONS: [
    { id: "bd-001", obra_titulo: "Noite de Luz", artista: "Vitória Lunar", isrc: "BRMSC2500001", emissora: "Rádio Globo", canal: "FM 98.1", tipo: "radio", data_hora: "2026-05-08T14:32:00", duracao_segundos: 222, valor_estimado: 18.50, status: "confirmado" },
    { id: "bd-002", obra_titulo: "Beira do Rio", artista: "Grupo Raiz Nordestina", isrc: "BRMSC2500002", emissora: "TV Globo", canal: "Canal 4", tipo: "tv", data_hora: "2026-05-08T21:05:00", duracao_segundos: 255, valor_estimado: 124.00, status: "confirmado" },
    { id: "bd-003", obra_titulo: "Frequência 440", artista: "DJ Marcus Flow", isrc: "BRMSC2500003", emissora: "Multishow", canal: "Cabo 34", tipo: "tv", data_hora: "2026-05-07T23:15:00", duracao_segundos: 330, valor_estimado: 87.50, status: "divergencia" },
    { id: "bd-004", obra_titulo: "Cidade Mágica", artista: "Vitória Lunar", isrc: "BRMSC2500006", emissora: "Web Rádio Samba Brasil", canal: "Online", tipo: "web_radio", data_hora: "2026-05-06T16:45:00", duracao_segundos: 205, valor_estimado: 4.10, status: "nao_reportado" },
  ],
  RIGHTS_CUE_SHEETS: [],
  RIGHTS_SETLISTS: [],
  RIGHTS_ECAD_PERIODOS: [],
  RIGHTS_TIMELINE_BY_ISRC: {},
  RIGHTS_ECAD_HISTORICO_ISRC: {},
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

import RightsMonitoring from "@/modules/monitoring/rights/pages/RightsMonitoring";

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

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /pr[oó]xima p[aá]gina/i }));
    });

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
      expect(screen.getByTestId("tab-divergencias")).toBeDefined();
    });

    const divTab = screen.getByTestId("tab-divergencias");

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
      expect(screen.getByTestId("tab-divergencias")).toBeDefined();
    });

    const divTab = screen.getByTestId("tab-divergencias");
    await act(async () => {
      fireEvent.pointerDown(divTab, { button: 0, ctrlKey: false });
      fireEvent.mouseDown(divTab, { button: 0 });
      fireEvent.click(divTab);
    });

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
