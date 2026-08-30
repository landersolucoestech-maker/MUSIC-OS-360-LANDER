/**
 * ContratoFormModal.documentos-persist.guard.test.ts
 *
 * Guarda permanente (REM-02 — Remaining Product Completion Backlog):
 * "Documentos Anexos" fazia upload real ao R2 via FileUpload/useUploadToR2,
 * mas o array `documentos` nunca era incluído no payload salvo — falso
 * sucesso: o upload funcionava, mas a referência nunca sobrevivia a um
 * reload (contracts.documentos não existia, e o handleSubmit nem lia o
 * estado `documentos`). Este teste falha se a regressão voltar.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const SOURCE = fs.readFileSync(path.resolve(__dirname, "ContratoFormModal.tsx"), "utf8");

describe("ContratoFormModal — documentos anexos persistem no contrato (REM-02)", () => {
  it("inclui documentos no payload enviado ao backend", () => {
    expect(SOURCE).toMatch(/documentos:\s*documentos\s*\?\?\s*\[\]/);
  });

  it("repassa o estado documentos para o onSubmit em ambos os pontos de submit", () => {
    const matches = SOURCE.match(/onSubmit\(\{\s*\.\.\.data,\s*documentos\s*\}\)/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it("popula documentos a partir do contrato ao editar (não reinicia sempre vazio)", () => {
    expect(SOURCE).toMatch(/setDocumentos\(initialData\.documentos\s*\?\?\s*\[\]\)/);
    expect(SOURCE).toMatch(/documentos:\s*Array\.isArray\(c\.documentos\)/);
  });
});
