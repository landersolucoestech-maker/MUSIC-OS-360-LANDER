import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

/**
 * Regressão: validação client-side esperada (campo obrigatório vazio) era
 * logada via `console.error`, poluindo o monitoramento de erros (Sentry
 * captura console.error) com eventos que não são falhas de runtime — a
 * validação já tem feedback visual suficiente (toast + FieldError inline).
 */
const SOURCE = fs.readFileSync(path.resolve(__dirname, "SchedulerFormModal.tsx"), "utf8");

describe("SchedulerFormModal — logging de validação não usa console.error", () => {
  it("não chama console.error para erros de validação esperados", () => {
    expect(SOURCE).not.toMatch(/console\.error\(["']SchedulerFormModal validation errors/);
  });

  it("usa console.warn (ou equivalente não-error) para o detalhe de debug", () => {
    expect(SOURCE).toMatch(/console\.warn\(["']SchedulerFormModal validation errors/);
  });

  it("continua avisando o usuário via toast quando a validação falha", () => {
    expect(SOURCE).toMatch(/toast\.error\(/);
  });
});
