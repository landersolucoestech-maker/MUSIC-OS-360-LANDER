/**
 * Projetos.metadata-guard.test.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — projects CRÍTICO confirmado):
 * o import em massa de projetos (Projetos.tsx) também serializava musicas[]
 * com JSON.stringify() dentro de `descricao` — segundo writer real com o
 * mesmo anti-padrão do ProjetoFormModal. Normalizado em project_tracks
 * (migration 20260718000013). Este teste falha se o arquivo voltar a
 * serializar musicas em descricao.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const FILE_PATH = path.resolve(__dirname, "Projetos.tsx");
const SOURCE = fs.readFileSync(FILE_PATH, "utf8");

describe("Projetos.tsx (import em massa) — não serializa musicas em descricao", () => {
  it("não usa mais JSON.stringify(musicasParaSalvar) no fluxo de import", () => {
    expect(SOURCE).not.toMatch(/JSON\.stringify\(musicasParaSalvar\)/);
  });

  it("envia musicas como campo estruturado ao criar o projeto importado", () => {
    expect(SOURCE).toMatch(/musicas:\s*musicasParaSalvar/);
  });
});
