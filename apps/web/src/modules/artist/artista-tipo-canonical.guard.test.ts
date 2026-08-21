/**
 * artista-tipo-canonical.guard.test.ts
 *
 * Guarda permanente (Artists Schema 13): `artists.tipo` tem UMA única
 * representação canônica para "artista solo": "solo" — não "artista_solo".
 *
 * Auditoria repo-wide (2026-08-21) provou que "solo" é o valor real usado
 * por: DB default (schema inicial e RebuildArtistsInCanonicalFormOrder),
 * ArtistEntity, ArtistsService.create() (fallback `dto.tipo ?? 'solo'`),
 * LeadEventsHandler (conversão lead→artista), seed operacional, e o
 * contrato de import/export testado (categoria: 'solo'). "artista_solo"
 * só existia no frontend (enums.ts + defaults de formulário) — nunca era
 * usado por nenhum consumidor real do backend. 100% dos artistas reais em
 * DEV já tinham tipo='solo' antes desta correção.
 *
 * Se este teste falhar, alguém reintroduziu "artista_solo" como segunda
 * representação do mesmo conceito — isso volta a quebrar filtros/relatórios
 * que comparam `tipo` por igualdade de string contra o valor canônico real.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { emptyPreservedInput } from "./forms/artist-form.definition";
import { artistaToFormFields } from "./services/artista.mapper";

const FILES_TO_SCAN = [
  path.resolve(__dirname, "../../shared/types/enums.ts"),
  path.resolve(__dirname, "./services/artista.mapper.ts"),
  path.resolve(__dirname, "./forms/artist-form.definition.ts"),
  path.resolve(__dirname, "./types/artista.types.ts"),
];

describe("artists.tipo — representação canônica única (solo, nunca artista_solo)", () => {
  it.each(FILES_TO_SCAN)("%s não contém a forma 'artista_solo'", (file) => {
    const source = fs.readFileSync(file, "utf8");
    expect(source).not.toMatch(/artista_solo/);
  });

  it("emptyPreservedInput() usa 'solo' como default de tipoArtista", () => {
    expect(emptyPreservedInput().tipoArtista).toBe("solo");
  });

  it("artistaToFormFields() cai para 'solo' quando artista.tipo vem vazio (nunca 'artista_solo')", () => {
    const fields = artistaToFormFields({ tipo: null } as never);
    expect(fields.tipoArtista).toBe("solo");
  });

  it("artistaToFormFields() preserva o valor real do banco quando presente", () => {
    const fields = artistaToFormFields({ tipo: "banda" } as never);
    expect(fields.tipoArtista).toBe("banda");
  });
});
