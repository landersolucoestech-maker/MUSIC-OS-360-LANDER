import { describe, it, expect } from "vitest";
import { vi } from "vitest";
import {
  isInternalField, fieldLabel, keyForHeader, resolveImportKey, deriveColumns,
  exportFieldValue, importFieldValue, findUntranslatedLabels,
} from "../components/export-registry";

// Silencia o erro técnico controlado de label ausente nos testes intencionais.
vi.spyOn(console, "error").mockImplementation(() => {});

describe("export-registry — política universal de campos (todos os módulos)", () => {
  it("exclui identificadores internos / técnicos / infra", () => {
    for (const k of ["id", "user_id", "tenant_id", "org_id", "org_slug",
      "created_at", "updated_at", "deleted_at", "contrato_id", "empresario_id",
      "gravadora_responsavel_id", "metadata", "_tipoOperacao"]) {
      expect(isInternalField(k)).toBe(true);
    }
  });

  it("mantém campos de formulário", () => {
    for (const k of ["nome_artistico", "observacoes", "email", "telefone",
      "spotify_artist_id", "youtube_channel_id", "valor", "data_nascimento"]) {
      expect(isInternalField(k)).toBe(false);
    }
  });

  it("renomeia identificadores de streaming para link", () => {
    expect(fieldLabel("spotify_artist_id")).toBe("Link do Spotify");
    expect(fieldLabel("youtube_channel_id")).toBe("Link do YouTube");
  });

  it("aplica rótulos pt-BR acentuados", () => {
    expect(fieldLabel("observacoes")).toBe("Observações");
    expect(fieldLabel("descricao")).toBe("Descrição");
    expect(fieldLabel("genero_musical")).toBe("Gênero Musical");
    expect(fieldLabel("nome_artistico")).toBe("Nome Artístico");
  });

  it("deriveColumns remove internos e usa rótulos pt-BR", () => {
    const cols = deriveColumns([
      { id: "x", user_id: "u", tenant_id: "t", created_at: "d",
        nome_artistico: "A", observacoes: "o", spotify_artist_id: "abc" },
    ]);
    const keys = cols.map((c) => c.key);
    expect(keys).not.toContain("id");
    expect(keys).not.toContain("user_id");
    expect(keys).not.toContain("tenant_id");
    expect(keys).not.toContain("created_at");
    expect(keys).toEqual(["nome_artistico", "observacoes", "spotify_artist_id"]);
    expect(cols.find((c) => c.key === "observacoes")?.label).toBe("Observações");
    expect(cols.find((c) => c.key === "spotify_artist_id")?.label).toBe("Link do Spotify");
  });

  it("round-trip: cabeçalho pt-BR volta para a chave (renomes não ambíguos)", () => {
    expect(keyForHeader("Link do Spotify")).toBe("spotify_artist_id");
    expect(keyForHeader("Link do YouTube")).toBe("youtube_channel_id");
  });

  it("round-trip ciente do módulo resolve rótulos ambíguos", () => {
    // "Observações" → observacoes (artistas) ou notes (CRM) conforme o módulo.
    expect(resolveImportKey("Observações", ["nome_artistico", "observacoes"])).toBe("observacoes");
    expect(resolveImportKey("Observações", ["name", "notes"])).toBe("notes");
    expect(resolveImportKey("Link do Spotify", ["spotify_artist_id"])).toBe("spotify_artist_id");
    // Campo desconhecido: mantém o cabeçalho como chave (identidade).
    expect(resolveImportKey("Campo Livre", [])).toBe("Campo Livre");
  });

  it("round-trip de valor: id ↔ link de streaming", () => {
    const exp = exportFieldValue("spotify_artist_id", "abc123");
    expect(exp).toBe("https://open.spotify.com/artist/abc123");
    expect(importFieldValue("spotify_artist_id", exp)).toBe("abc123");

    const yt = exportFieldValue("youtube_channel_id", "UC999");
    expect(yt).toBe("https://www.youtube.com/channel/UC999");
    expect(importFieldValue("youtube_channel_id", yt)).toBe("UC999");
  });
});

describe("export-registry — REGRA 01: nenhum label em inglês", () => {
  const LISTED_ENGLISH = [
    "name", "phone", "email", "website", "address", "country", "state",
    "priority", "timeline", "attachments", "tags", "notes",
  ];
  // Chaves reais do tipo Contact (CRM) — origem dos labels em inglês.
  const CONTACT_KEYS = [
    "name", "companyName", "contactType", "documentType", "documentNumber",
    "phone", "whatsapp", "email", "instagram", "website", "address", "city",
    "state", "country", "zipCode", "responsible", "notes", "tags", "status",
    "priority", "attachments", "timeline",
  ];

  it("traduz todos os campos listados (sem token inglês no rótulo)", () => {
    expect(findUntranslatedLabels(LISTED_ENGLISH)).toEqual([]);
  });

  it("traduz todas as chaves do CRM Contact", () => {
    expect(findUntranslatedLabels(CONTACT_KEYS)).toEqual([]);
  });

  it("não confunde marcas/nomes próprios com inglês", () => {
    expect(findUntranslatedLabels(["banner_url", "apple_music_url", "soundcloud_url", "instagram", "whatsapp"])).toEqual([]);
    expect(fieldLabel("apple_music_url")).toBe("Apple Music");
    expect(fieldLabel("soundcloud_url")).toBe("SoundCloud");
  });

  it("detecta (não mascara) um campo realmente não traduzido", () => {
    // Chave fora do dicionário cujo humanize cai em inglês → deve ser sinalizada.
    expect(findUntranslatedLabels(["billing_address"])).toContain("billing_address");
  });
});

describe("fieldLabel — sem fallback visual em inglês (ETAPA 7)", () => {
  it("retorna label pt-BR explícito para campos conhecidos", () => {
    expect(fieldLabel("observacoes")).toBe("Observações");
    expect(fieldLabel("spotify_artist_id")).toBe("Link do Spotify");
  });

  it("NÃO gera label em inglês a partir da chave (marcador controlado)", () => {
    const label = fieldLabel("companyRole");
    expect(label).toBe("⚠ companyRole");
    expect(label).not.toBe("Company Role");
  });
});
