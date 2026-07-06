/**
 * Critério de aceite do fluxo de exportação de artistas:
 * o arquivo exportado deve ter EXATAMENTE uma coluna por campo do
 * formulário Criar, com o mesmo label e na mesma ordem visual —
 * ambos derivados da definição única (ARTIST_FORM_SECTIONS).
 */
import { describe, it, expect } from "vitest";
import {
  ARTIST_FORM_SECTIONS,
  allArtistFormFields,
  artistaToExportRowFromForm,
  parseArtistaImportRow,
  formValuesToArtistaPayload,
} from "@/modules/artist/forms/artist-form.definition";
import type { Artista } from "@/modules/artist/types/artista.types";

const ARTISTA: Artista = {
  id: "a1",
  nome_artistico: "MC Teste",
  nome_civil: "Fulano de Tal",
  genero_musical: "Funk",
  genero: "Masculino",
  especialidades: ["dj", "produtor"],
  observacoes: "Bio do artista",
  notas_internas: "Nota interna",
  foto_url: "https://cdn/x/foto.png",
  documentos_pessoais_url: "https://cdn/x/doc.pdf",
  presskit_url: "https://cdn/x/press.pdf",
  data_nascimento: "1990-01-01",
  cpf_cnpj: "123.456.789-00",
  rg: "12.345.678-9",
  endereco: "Rua A, 1",
  telefone: "(11) 90000-0000",
  email: "mc@teste.com",
  banco: "Nubank",
  agencia: "0001",
  conta: "12345-6",
  chave_pix: "mc@teste.com",
  titular_conta: "Fulano de Tal",
  spotify_url: "https://open.spotify.com/artist/4ZzZzZzZzZzZzZzZzZzZzZ",
  youtube_url: "https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv",
  deezer_url: "https://deezer.com/artist/1",
  apple_music_url: "https://music.apple.com/artist/1",
  soundcloud_url: "https://soundcloud.com/mc",
  instagram: "https://instagram.com/mc",
  tiktok: "https://tiktok.com/@mc",
  tipo_perfil: "com_empresario",
  distribuidoras_gerais: [{ id: "onerpm", email: "share@onerpm.com" }],
  contatos_vinculados: [{ contactId: "c-1", distribuidoras: [{ id: "distrokid", email: "d@k.com" }] }],
};

describe("definição única do formulário de artista", () => {
  it("exporta exatamente uma coluna por campo do formulário, na ordem visual", () => {
    const row = artistaToExportRowFromForm(ARTISTA);
    const labelsDoFormulario = allArtistFormFields().map((f) => f.label);
    expect(Object.keys(row)).toEqual(labelsDoFormulario);
  });

  it("percorre as seções na sequência do formulário", () => {
    expect(ARTIST_FORM_SECTIONS.map((s) => s.title)).toEqual([
      "Informações Básicas",
      "Dados Pessoais",
      "Dados Bancários",
      "Perfis e Redes Sociais",
      "Tipo de Perfil",
      "Distribuidoras / Agregadoras",
      "Observações",
    ]);
  });

  it("faz round-trip export → import → payload sem perder dados do formulário", () => {
    const row = artistaToExportRowFromForm(ARTISTA);
    const values = parseArtistaImportRow(row);
    expect(values).not.toBeNull();
    const payload = formValuesToArtistaPayload(values!);

    expect(payload.nome_artistico).toBe("MC Teste");
    expect(payload.nome_civil).toBe("Fulano de Tal");
    expect(payload.genero_musical).toBe("Funk");
    expect(payload.genero).toBe("Masculino");
    expect(payload.especialidades).toEqual(["dj", "produtor"]);
    expect(payload.observacoes).toBe("Bio do artista");
    expect(payload.notas_internas).toBe("Nota interna");
    expect(payload.foto_url).toBe("https://cdn/x/foto.png");
    expect(payload.documentos_pessoais_url).toBe("https://cdn/x/doc.pdf");
    expect(payload.presskit_url).toBe("https://cdn/x/press.pdf");
    // URL do formulário é persistida diretamente — contrato do backend usa
    // spotify_url/youtube_url, nunca um ID extraído.
    expect(payload.spotify_url).toBe("https://open.spotify.com/artist/4ZzZzZzZzZzZzZzZzZzZzZ");
    expect(payload.youtube_url).toBe("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv");
    expect(payload.deezer_url).toBe("https://deezer.com/artist/1");
    expect(payload.instagram).toBe("https://instagram.com/mc");
    expect(payload.tiktok).toBe("https://tiktok.com/@mc");
    expect(payload.tipo_perfil).toBe("com_empresario");
    expect(payload.distribuidoras_gerais).toEqual([{ id: "onerpm", email: "share@onerpm.com" }]);
    expect(payload.contatos_vinculados).toEqual([
      { contactId: "c-1", distribuidoras: [{ id: "distrokid", email: "d@k.com" }] },
    ]);
    expect(payload.banco).toBe("Nubank");
    expect(payload.chave_pix).toBe("mc@teste.com");
  });

  it("rejeita linha sem Nome Artístico", () => {
    expect(parseArtistaImportRow({ "Gênero Musical": "Funk" })).toBeNull();
  });

  it("aceita cabeçalhos de planilhas exportadas por versões antigas", () => {
    const values = parseArtistaImportRow({
      "Nome Artístico": "Antigo",
      "Foto URL": "https://cdn/old.png",
      "Spotify URL": "https://open.spotify.com/artist/4ZzZzZzZzZzZzZzZzZzZzZ",
      "Observações": "nota antiga",
      "Tipo de Perfil": "Com_Empresario",
    });
    expect(values).not.toBeNull();
    expect(values!.fotoUrl).toBe("https://cdn/old.png");
    expect(values!.spotify).toContain("open.spotify.com/artist/");
    expect(values!.notasInternas).toBe("nota antiga");
    expect(values!.tipoPerfil).toBe("com_empresario");
  });
});
