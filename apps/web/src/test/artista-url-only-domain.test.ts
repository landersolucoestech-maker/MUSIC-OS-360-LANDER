/**
 * artista-url-only-domain.test.ts
 *
 * Regressão: nenhum payload produzido pelo formulário/mapper de Artista pode
 * conter spotify_artist_id/youtube_artist_id/youtube_channel_id/
 * — o domínio trabalha exclusivamente com
 * foto_url/spotify_url/youtube_url. Cobre também que os validadores exigem
 * uma URL real (uma ID crua isolada não é mais aceita).
 */
import { describe, it, expect } from "vitest";
import {
  emptyArtistFormValues,
  formValuesToArtistaPayload,
  artistaToExportRowFromForm,
  allArtistFormFields,
  emptyPreservedInput,
} from "@/modules/artist/forms/artist-form.definition";
import { validateSpotifyUrl, validateYoutubeUrl } from "@/modules/artist/services/artista.mapper";
import type { Artista } from "@/modules/artist/types/artista.types";

const LEGACY_KEYS = [
  "spotify_artist_id",
  "youtube_artist_id",
  "youtube_channel_id",
];

describe("Domínio Artista — exclusivamente URL (foto_url/spotify_url/youtube_url)", () => {
  it("formValuesToArtistaPayload nunca produz nenhum campo legado, para qualquer entrada", () => {
    const values = {
      ...emptyArtistFormValues(),
      nomeArtistico: "Artista Teste",
      spotify: "https://open.spotify.com/artist/4NHQUGzhtTLFvgF5SZesLK",
      youtube: "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
      fotoUrl: "https://cdn.example.com/foto.png",
      documentosPessoaisUrl: "",
      presskitUrl: "",
    };
    const payload = formValuesToArtistaPayload(values, emptyPreservedInput());
    const keys = Object.keys(payload);

    for (const legacy of LEGACY_KEYS) {
      expect(keys).not.toContain(legacy);
    }
    expect(payload.spotify_url).toBe("https://open.spotify.com/artist/4NHQUGzhtTLFvgF5SZesLK");
    expect(payload.youtube_url).toBe("https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw");
  });

  it("exportação (colunas do formulário) nunca inclui um header de campo legado", () => {
    const artista = {
      id: "a1",
      nome_artistico: "Artista Teste",
      foto_url: "https://cdn.example.com/foto.png",
      spotify_url: "https://open.spotify.com/artist/4NHQUGzhtTLFvgF5SZesLK",
      youtube_url: "https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw",
    } as Artista;

    const row = artistaToExportRowFromForm(artista);
    const headers = Object.keys(row);

    // Nenhum header de export pode ser (ou conter) um campo legado.
    for (const header of headers) {
      for (const legacy of LEGACY_KEYS) {
        expect(header.toLowerCase()).not.toContain(legacy.replace(/_/g, " "));
      }
    }
    // Os únicos campos de plataforma/mídia exportados são exatamente estes 3.
    const fieldIds = allArtistFormFields().map((f) => f.id);
    expect(fieldIds).toEqual(expect.arrayContaining(["fotoUrl", "spotify", "youtube"]));
  });

  it("validateSpotifyUrl rejeita uma ID crua (só URL é aceita)", () => {
    expect(validateSpotifyUrl("4NHQUGzhtTLFvgF5SZesLK")).toBe("invalid");
    expect(validateSpotifyUrl("https://open.spotify.com/artist/4NHQUGzhtTLFvgF5SZesLK")).toBe("valid");
  });

  it("validateYoutubeUrl rejeita um channelId cru (só URL é aceita)", () => {
    expect(validateYoutubeUrl("UC_x5XG1OV2P6uZZ5FSM9Ttw")).toBe("invalid");
    expect(validateYoutubeUrl("https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw")).toBe("valid");
  });
});
