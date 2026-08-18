import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { ArtistaPlatformMetrics } from "@/modules/artist/components/ArtistaPlatformMetrics";
import { api } from "@/shared/lib/api-client";

vi.mock("@/shared/lib/api-client", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

type MetricsProps = ComponentProps<typeof ArtistaPlatformMetrics>;

const SPOTIFY_ID = "4NHQUGzhtTLFvgF5SZesLK";
const YOUTUBE_ID = "UC_x5XG1OV2P6uZZ5FSM9Ttw";
const SPOTIFY_URL = `https://open.spotify.com/artist/${SPOTIFY_ID}`;
const YOUTUBE_URL = `https://www.youtube.com/channel/${YOUTUBE_ID}`;

function renderMetrics(overrides: Partial<MetricsProps> = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const props: MetricsProps = {
    artistaId: "artist-1",
    spotifyUrl: SPOTIFY_URL,
    youtubeUrl: YOUTUBE_URL,
    ...overrides,
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <ArtistaPlatformMetrics {...props} />
    </QueryClientProvider>,
  );
}

describe("ArtistaPlatformMetrics platform profiles", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("mostra 'Não sincronizado' quando ha URL mas nenhum snapshot ainda", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderMetrics();

    expect(await screen.findByTestId("metric-spotify-artist-1")).toHaveTextContent("Não sincronizado");
    expect(screen.getByTestId("metric-youtube-artist-1")).toHaveTextContent("Não sincronizado");
  });

  it("mostra 'Não configurado' quando nao ha URL cadastrada", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderMetrics({ spotifyUrl: null, youtubeUrl: null });

    expect(await screen.findByTestId("metric-spotify-artist-1")).toHaveTextContent("—");
    expect(screen.getByTestId("metric-youtube-artist-1")).toHaveTextContent("—");
    expect(screen.queryByTestId("button-sync-spotify-artist-1")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-sync-youtube-artist-1")).not.toBeInTheDocument();
  });

  it("renderiza ouvintes mensais do Spotify quando snapshot success existir", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        tenant_id: "tenant-1",
        artist_id: "artist-1",
        platform: "spotify",
        external_id: SPOTIFY_ID,
        external_url: null,
        display_name: "Artist",
        username: null,
        profile_url: null,
        image_url: null,
        followers: 9999,
        subscribers: null,
        monthly_listeners: 123456,
        popularity: 77,
        total_views: null,
        total_videos: null,
        total_tracks: null,
        total_albums: null,
        raw_payload: {},
        sync_status: "success",
        last_synced_at: "2026-06-12T00:00:00Z",
        last_error: null,
      },
    ]);

    renderMetrics();

    await waitFor(() => {
      expect(screen.getByTestId("metric-spotify-artist-1")).toHaveTextContent("123.456");
      expect(screen.getByText("Ouvintes mensais")).toBeInTheDocument();
      expect(screen.getByText(/9\.999 seguidores/)).toBeInTheDocument();
    });
  });

  it("renderiza pending e failed por plataforma", async () => {
    vi.mocked(api.get).mockResolvedValueOnce([
      {
        tenant_id: "tenant-1",
        artist_id: "artist-1",
        platform: "spotify",
        external_id: SPOTIFY_ID,
        external_url: null,
        display_name: null,
        username: null,
        profile_url: null,
        image_url: null,
        followers: null,
        subscribers: null,
        monthly_listeners: null,
        popularity: null,
        total_views: null,
        total_videos: null,
        total_tracks: null,
        total_albums: null,
        raw_payload: {},
        sync_status: "pending",
        last_synced_at: null,
        last_error: null,
      },
      {
        tenant_id: "tenant-1",
        artist_id: "artist-1",
        platform: "youtube",
        external_id: YOUTUBE_ID,
        external_url: null,
        display_name: null,
        username: null,
        profile_url: null,
        image_url: null,
        followers: null,
        subscribers: null,
        monthly_listeners: null,
        popularity: null,
        total_views: null,
        total_videos: null,
        total_tracks: null,
        total_albums: null,
        raw_payload: {},
        sync_status: "failed",
        last_synced_at: "2026-06-12T00:00:00Z",
        last_error: "YouTube API error: 403",
      },
    ]);

    renderMetrics();

    await waitFor(() => {
      expect(screen.getByTestId("metric-spotify-artist-1")).toHaveTextContent("...");
      expect(screen.getByTestId("metric-youtube-artist-1")).toHaveTextContent("Erro");
      expect(screen.getByText("YouTube API error: 403")).toBeInTheDocument();
    });
  });

  it("botao sync chama endpoint correto e nao quebra tela", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({
      artist_id: "artist-1",
      enqueued: [{ platform: "spotify", job_id: "job-1" }],
      skipped: [],
    });

    renderMetrics();

    const button = await screen.findByTestId("button-sync-spotify-artist-1");
    fireEvent.click(button);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/artists/artist-1/platform-profiles/spotify/sync", {
        profileUrl: SPOTIFY_URL,
        source: "profile_url",
      });
    });
  });

  it("renderiza botoes de sync Spotify e YouTube com type button", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    renderMetrics();

    expect(await screen.findByTestId("button-sync-spotify-artist-1")).toHaveAttribute("type", "button");
    expect(screen.getByTestId("button-sync-youtube-artist-1")).toHaveAttribute("type", "button");
    expect(screen.getByTestId("button-atualizar-metricas-artist-1")).toHaveAttribute("type", "button");
  });

  it("clique em YouTube chama endpoint com platform youtube", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({
      artist_id: "artist-1",
      enqueued: [{ platform: "youtube", job_id: "job-2" }],
      skipped: [],
    });

    renderMetrics();

    fireEvent.click(await screen.findByTestId("button-sync-youtube-artist-1"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/artists/artist-1/platform-profiles/youtube/sync", {
        profileUrl: YOUTUBE_URL,
        source: "profile_url",
      });
    });
  });

  it("artistId ausente nao chama endpoint e nao quebra", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    renderMetrics({ artistaId: "" });

    const button = await screen.findByTestId("button-sync-spotify-");
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(api.post).not.toHaveBeenCalled();
  });

  it("erro da mutation libera botao novamente", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    let rejectPost: (reason?: unknown) => void = () => {};
    vi.mocked(api.post).mockImplementationOnce(
      () => new Promise<never>((_, reject) => { rejectPost = reject; }),
    );

    renderMetrics();

    const button = await screen.findByTestId("button-sync-spotify-artist-1");
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    rejectPost(new Error("Falha externa"));
    await waitFor(() => expect(button).not.toBeDisabled());
  });

  it("sucesso invalida e refaz query de platform profiles", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({
      artist_id: "artist-1",
      enqueued: [{ platform: "spotify", job_id: "job-1" }],
      skipped: [],
    });

    renderMetrics();

    fireEvent.click(await screen.findByTestId("button-sync-spotify-artist-1"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/artists/artist-1/platform-profiles/spotify/sync", {
        profileUrl: SPOTIFY_URL,
        source: "profile_url",
      });
      expect(api.get).toHaveBeenCalledWith("/artists/artist-1/platform-profiles");
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  it("botao Atualizar dispara sync manual para Spotify e YouTube disponiveis", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({
      artist_id: "artist-1",
      enqueued: [{ platform: "spotify", job_id: "job-1" }],
      skipped: [],
    });

    renderMetrics();

    const atualizarButton = await screen.findByTestId("button-atualizar-metricas-artist-1");
    await waitFor(() => expect(atualizarButton).not.toBeDisabled());
    fireEvent.click(atualizarButton);

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/artists/artist-1/platform-profiles/spotify/sync", {
        profileUrl: SPOTIFY_URL,
        source: "profile_url",
      });
      expect(api.post).toHaveBeenCalledWith("/artists/artist-1/platform-profiles/youtube/sync", {
        profileUrl: YOUTUBE_URL,
        source: "profile_url",
      });
    });
  });

  it("nao exige spotifyUrl quando ha spotifyUrl valido", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({
      artist_id: "artist-1",
      enqueued: [{ platform: "spotify", job_id: "job-1" }],
      skipped: [],
    });

    renderMetrics({ spotifyUrl: SPOTIFY_URL });

    fireEvent.click(await screen.findByTestId("button-sync-spotify-artist-1"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/artists/artist-1/platform-profiles/spotify/sync", {
        profileUrl: SPOTIFY_URL,
        source: "profile_url",
      });
    });
  });

  it("nao exige youtubeUrl quando ha youtubeUrl valido", async () => {
    vi.mocked(api.get).mockResolvedValue([]);
    vi.mocked(api.post).mockResolvedValue({
      artist_id: "artist-1",
      enqueued: [{ platform: "youtube", job_id: "job-2" }],
      skipped: [],
    });

    renderMetrics({ youtubeUrl: YOUTUBE_URL });

    fireEvent.click(await screen.findByTestId("button-sync-youtube-artist-1"));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith("/artists/artist-1/platform-profiles/youtube/sync", {
        profileUrl: YOUTUBE_URL,
        source: "profile_url",
      });
    });
  });

  it("link Spotify invalido bloqueia sync sem chamar endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    renderMetrics({ spotifyUrl: "https://open.spotify.com/track/abc" });

    fireEvent.click(await screen.findByTestId("button-sync-spotify-artist-1"));

    expect(api.post).not.toHaveBeenCalled();
  });

  it("link YouTube invalido bloqueia sync sem chamar endpoint", async () => {
    vi.mocked(api.get).mockResolvedValue([]);

    renderMetrics({ youtubeUrl: "https://www.youtube.com/@handle" });

    fireEvent.click(await screen.findByTestId("button-sync-youtube-artist-1"));

    expect(api.post).not.toHaveBeenCalled();
  });
});
