/**
 * registro-musicas.mapper.test.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — contrato de works): fixa
 * comportamentalmente o contrato canônico do formulário de obras, para que
 * nenhuma alteração futura reintroduza os anti-padrões já corrigidos:
 *   - "codigo_abramus" nunca existiu como nome de campo; o nome real e
 *     canônico, usado em todas as camadas (schema Zod, DTO, entity,
 *     migration, coluna, contrato de Reports), é `cod_abramus`/`codAbramus`.
 *   - `compositor` (singular) e `editora` são campos legados/bulk — o
 *     formulário interativo NUNCA os envia; a fonte real de autoria é
 *     `participantes`, da qual `compositores`/`letristas` são derivados.
 *   - `metadata` nunca recebe campos formais do formulário de obras.
 */
import { describe, it, expect } from "vitest";
import {
  formToObraPayload,
  participantesToCompositoresLetristas,
  type ParticipanteForm,
} from "./registro-musicas.mapper";

function baseInput(participantes: ParticipanteForm[] = []) {
  return {
    titulo: "Minha Obra",
    generoMusical: "MPB",
    idioma: "pt-BR",
    iswc: "",
    codAbramus: "ABR-123",
    codEcad: "",
    duracaoMin: "3",
    duracaoSeg: "30",
    instrumental: "nao",
    criadaPorIA: "nao" as const,
    tipoIA: "",
    iaHarmonia: { ferramenta: "", prompt: "" },
    iaMelodia: { ferramenta: "", prompt: "" },
    iaLetra: { ferramenta: "", prompt: "" },
    outrosTitulos: [],
    referenciasConexas: [],
    letraCompleta: "",
    participantes,
    situacao: "analise",
    projetoId: null,
    artistaId: null,
    tipoObra: "original",
    orgId: "tenant-test",
  };
}

describe("formToObraPayload — contrato canônico de works", () => {
  it("nunca envia `codigo_abramus`, apenas `cod_abramus` (nome canônico real)", () => {
    const payload = formToObraPayload(baseInput());
    expect(payload).toHaveProperty("cod_abramus", "ABR-123");
    expect(payload).not.toHaveProperty("codigo_abramus");
    expect(payload).not.toHaveProperty("cod_entidade");
    expect(payload).not.toHaveProperty("codigo_entidade");
  });

  it("nunca envia `metadata`, `compositor` (singular) ou `editora` — não são campos do formulário interativo", () => {
    const payload = formToObraPayload(baseInput());
    expect(payload).not.toHaveProperty("metadata");
    expect(payload).not.toHaveProperty("compositor");
    expect(payload).not.toHaveProperty("editora");
    expect(payload).not.toHaveProperty("co_compositores");
    expect(payload).not.toHaveProperty("detentores");
  });

  it("deriva `compositores`/`letristas` de `participantes` — nunca duplica dado livre", () => {
    const participantes: ParticipanteForm[] = [
      { id: "1", nome: "Fulano", classeFuncao: "compositor/autor", link: "", percentual: "50" },
      { id: "2", nome: "Beltrano", classeFuncao: "tradutor", link: "", percentual: "50" },
    ];
    const payload = formToObraPayload(baseInput(participantes));
    expect(payload.compositores).toEqual(["Fulano"]);
    expect(payload.letristas).toEqual(["Beltrano"]);
    expect(payload.participantes).toEqual(participantes);
  });

  it("participantesToCompositoresLetristas retorna null quando não há participantes na classe correspondente", () => {
    const result = participantesToCompositoresLetristas([]);
    expect(result.compositores).toBeNull();
    expect(result.letristas).toBeNull();
  });
});
