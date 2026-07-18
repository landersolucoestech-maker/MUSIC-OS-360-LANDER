/**
 * useUsuarios.guard.test.ts
 *
 * Guarda permanente (auditoria 2026-07-18 — settings/usuários): o hook
 * enviava full_name/phone/cargo direto para PATCH /users/:id
 * (UpdateUserDto), que só aceita fullName/phone/role — full_name e cargo
 * eram sempre rejeitados pelo whitelist, e phone não tinha coluna nem campo
 * de DTO. Este teste falha se o hook voltar a enviar os nomes errados.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const FILE_PATH = path.resolve(__dirname, "useUsuarios.ts");
const SOURCE = fs.readFileSync(FILE_PATH, "utf8");

describe("useUsuarios — envia o contrato real do UpdateUserDto", () => {
  it("traduz full_name/cargo para fullName/role antes de enviar ao backend", () => {
    expect(SOURCE).toMatch(/fullName:\s*full_name/);
    expect(SOURCE).toMatch(/role:\s*cargo/);
  });

  it("não envia mais full_name/cargo como chaves literais do payload HTTP", () => {
    expect(SOURCE).not.toMatch(/storage\.update[\s\S]{0,200}\{\s*full_name,?\s*phone,?\s*cargo,?\s*\}/);
  });
});
