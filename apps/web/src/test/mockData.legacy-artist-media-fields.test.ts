// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach } from "vitest";

/**
 * Guarda de regressão: registros de artista persistidos em localStorage não
 * podem reintroduzir aliases antigos de mídia no domínio vivo. loadMockData()
 * faz merge do que está salvo por cima do seed atual, então a limpeza precisa
 * acontecer em patchMockData() a cada carregamento — não só no seed.
 */
const STORAGE_KEY = "musicos360_mock_data";

describe("mockData — limpeza de campos legados de banner/vídeo em dados persistidos", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("preserva apenas os campos de mídia permitidos para artistas persistidos no localStorage", async () => {
    const stale = {
      artistas: [
        {
          id: "art-001",
          nome_artistico: "Vitória Lunar",
          foto_url: "https://cdn.example.com/foto.png",
          spotify_url: "https://open.spotify.com/artist/123",
          youtube_url: "https://www.youtube.com/@vitorialunar",
          banner: "https://cdn.example.com/legacy.png",
          presentationVideo: "https://cdn.example.com/legacy.mp4",
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stale));

    const mod = await import("@/shared/data/mockData");
    const artistas = mod.MOCK_DATA["artistas"] as Array<Record<string, unknown>>;
    const art001 = artistas.find((a) => a.id === "art-001")!;

    expect(art001).toBeDefined();
    expect(art001.nome_artistico).toBe("Vitória Lunar");
    expect(art001.foto_url).toBe("https://cdn.example.com/foto.png");
    expect(art001.spotify_url).toBe("https://open.spotify.com/artist/123");
    expect(art001.youtube_url).toBe("https://www.youtube.com/@vitorialunar");

    for (const field of [
      "banner",
      "presentation_video",
      "presentationVideo",
      "video_url",
      "videoUrl",
      "youtube_video",
      "youtubeVideo",
      "video",
      "url_video",
    ]) {
      expect(field in art001).toBe(false);
    }
  });

  it("não remove campos legítimos de outros domínios (ex.: video_clipe_url de lançamentos)", async () => {
    const stale = {
      lancamentos: [
        {
          id: "lanc-001",
          titulo: "Single de teste",
          assets: { video_clipe_url: "https://youtube.com/watch?v=abc" },
        },
      ],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stale));

    const mod = await import("@/shared/data/mockData");
    const lancamentos = mod.MOCK_DATA["lancamentos"] as Array<Record<string, unknown>>;
    const lanc = lancamentos.find((l) => l.id === "lanc-001")!;

    expect(lanc).toBeDefined();
    expect((lanc.assets as Record<string, unknown>).video_clipe_url).toBe(
      "https://youtube.com/watch?v=abc",
    );
  });
});
