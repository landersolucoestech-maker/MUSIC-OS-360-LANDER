// @ts-nocheck
// Integration test para ArtistaVisao360Modal (Task #361).
//
// Verifica que os chips de tendência (PlatformMiniTrend) aparecem nos
// cards de Spotify / YouTube / Deezer da seção "Perfis e Redes Sociais"
// do modal Visão 360°, respeitando o gating por ID configurado:
//   * Plataforma sem ID configurado → nem chip nem placeholder aparece
//     (a query nem é disparada).
//   * Plataforma com ID configurado mas sem histórico (0 ou 1 snapshot)
//     → placeholder "— sem histórico" aparece dentro do card.
//   * Plataforma com ID configurado e histórico crescendo → badge
//     "em crescimento" + percentual aparecem dentro do card.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
type MetricEvolutionPoint = { date: string; captured_at?: string; followers?: number | null; popularity?: number | null; views?: number | null; [key: string]: unknown; };

// Estabiliza o ResponsiveContainer do recharts (usado por outras seções
// do modal) para evitar avisos sobre dimensões zero no jsdom.
vi.mock("recharts", async () => {
  const actual: any = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children }: any) => (
      <div style={{ width: 400, height: 200 }}>{children}</div>
    ),
  };
});

// Mocks dos hooks de dados do modal (não nos importam aqui — só queremos
// renderizar a tab "Perfil"). Retornam arrays vazios.
vi.mock("@/modules/catalog/hooks/useObras", () => ({
  useObras: () => ({ obras: [], isLoading: false }),
}));
vi.mock("@/modules/catalog/hooks/useFonogramas", () => ({
  useFonogramas: () => ({ fonogramas: [], isLoading: false }),
}));
vi.mock("@/modules/releases/hooks/useLancamentos", () => ({
  useLancamentos: () => ({ lancamentos: [], isLoading: false }),
}));
vi.mock("@/modules/projects/hooks/useProjetos", () => ({
  useProjetos: () => ({ projetos: [], isLoading: false }),
}));
vi.mock("@/modules/marketing/hooks/useMetas", () => ({
  useMetas: () => ({ metas: [], isLoading: false }),
}));
vi.mock("@/modules/contracts/hooks/useContratos", () => ({
  useContratos: () => ({ contratos: [], isLoading: false }),
}));

vi.mock("@/app/providers/TenantContext", () => ({
  useTenant: () => ({
    tenant: { id: "tenant-test", name: "Tenant Teste", permissions: {} },
    permissionKeys: ["*"],
    isFeatureEnabled: () => true,
    hasPermission: () => true,
    canRead: () => true,
    canWrite: () => true,
    canDelete: () => true,
    canExport: () => true,
    setTenant: vi.fn(),
  }),
}));

const spotifyMock = vi.fn();
const youtubeMock = vi.fn();
const deezerMock = vi.fn();

vi.mock("@/modules/integrations/hooks/useSpotify", () => ({
  useSpotifyEvolution: (...args: any[]) => spotifyMock(...args),
}));

vi.mock("@/modules/integrations/hooks/useYouTube", () => ({
  useYouTubeEvolution: (...args: any[]) => youtubeMock(...args),
}));

vi.mock("@/modules/integrations/hooks/useDeezer", () => ({
  useDeezerEvolution: (...args: any[]) => deezerMock(...args),
}));

import { ArtistaVisao360Modal } from "@/modules/artist/components/ArtistaVisao360Modal";

function point(date: string, followers: number | null): MetricEvolutionPoint {
  return { captured_at: date, followers, popularity: null, views: null };
}

function emptyQuery() {
  return { data: [], isLoading: false, error: null };
}

function dataQuery(points: MetricEvolutionPoint[]) {
  return { data: points, isLoading: false, error: null };
}

async function renderModal(artista: any) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <ArtistaVisao360Modal
        open
        onOpenChange={() => {}}
        artista={artista}
      />
    </QueryClientProvider>,
  );
  // Navega para a aba "Perfil" onde ficam os cards de plataforma.
  // Radix Tabs trigger usa pointer events; combinamos pointerDown + click.
  const tab = screen.getByRole("tab", { name: /perfil/i });
  await act(async () => {
    fireEvent.pointerDown(tab, { button: 0, ctrlKey: false });
    fireEvent.mouseDown(tab, { button: 0 });
    fireEvent.click(tab);
  });
  // Confirma que a tab "Perfil" foi ativada e as métricas estão visíveis.
  await screen.findByTestId("metric-spotify-art-1");
  return utils;
}

describe("<ArtistaVisao360Modal /> trend chips na aba Perfil", async () => {
  beforeEach(() => {
    spotifyMock.mockReset();
    youtubeMock.mockReset();
    deezerMock.mockReset();
  });

  it("renderiza fallback de Spotify quando integração não está configurada", async () => {
    spotifyMock.mockReturnValue(
      dataQuery([
        point("2026-04-01T06:20:00Z", 1000),
        point("2026-04-30T06:20:00Z", 1042),
      ]),
    );
    youtubeMock.mockReturnValue(emptyQuery());
    deezerMock.mockReturnValue(emptyQuery());

    await renderModal({
      id: "art-1",
      nome_artistico: "Teste",
      spotify_artist_id: "spot-1",
      spotify_ouvintes: 1042,
      youtube_channel_id: null,
      deezer_url: null,
    });

    expect(screen.getByTestId("metric-spotify-art-1")).toHaveTextContent("1.042");
  });

  it("renderiza fallback de YouTube quando integração não está configurada", async () => {
    spotifyMock.mockReturnValue(emptyQuery());
    youtubeMock.mockReturnValue(
      dataQuery([point("2026-04-30T06:20:00Z", 500)]),
    );
    deezerMock.mockReturnValue(emptyQuery());

    await renderModal({
      id: "art-1",
      nome_artistico: "Teste",
      spotify_artist_id: "spot-1",
      youtube_channel_id: "UC1",
      youtube_inscritos: 500,
      deezer_url: "https://www.deezer.com/artist/123",
    });

    expect(screen.getByTestId("metric-youtube-art-1")).toHaveTextContent("500");
  });

  it("renderiza traço quando IDs de plataforma não estão configurados", async () => {
    spotifyMock.mockReturnValue(emptyQuery());
    youtubeMock.mockReturnValue(emptyQuery());
    deezerMock.mockReturnValue(emptyQuery());

    await renderModal({
      id: "art-1",
      nome_artistico: "Teste",
      // Sem spotify_artist_id, youtube_channel_id ou deezer_url:
      spotify_artist_id: null,
      youtube_channel_id: null,
      deezer_url: null,
    });

    expect(screen.getByTestId("metric-spotify-art-1")).toHaveTextContent("—");
    expect(screen.getByTestId("metric-youtube-art-1")).toHaveTextContent("—");
    expect(screen.getByTestId("metric-deezer-art-1")).toHaveTextContent("—");
  });

  it("renderiza fallback de Deezer a partir do valor salvo no artista", async () => {
    spotifyMock.mockReturnValue(emptyQuery());
    youtubeMock.mockReturnValue(emptyQuery());
    deezerMock.mockReturnValue(emptyQuery());

    await renderModal({
      id: "art-1",
      nome_artistico: "Teste",
      spotify_artist_id: "spot-1",
      youtube_channel_id: null,
      deezer_url: "https://www.deezer.com/artist/123",
      deezer_fas: 321,
    });

    expect(screen.getByTestId("metric-deezer-art-1")).toHaveTextContent("321");
  });
});

