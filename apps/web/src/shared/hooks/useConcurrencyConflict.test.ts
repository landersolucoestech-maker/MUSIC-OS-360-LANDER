import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConflictError, IntegrationError } from "@/shared/lib/errors";
import { getExpectedUpdatedAt, isConcurrencyConflict, handleConcurrencyConflict } from "./useConcurrencyConflict";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));
import { toast } from "sonner";

describe("getExpectedUpdatedAt", () => {
  it("lê updated_at (snake_case) quando presente", () => {
    expect(getExpectedUpdatedAt({ updated_at: "2026-08-14T10:00:00.000Z" })).toBe("2026-08-14T10:00:00.000Z");
  });

  it("cai para updatedAt (camelCase) quando snake_case ausente", () => {
    expect(getExpectedUpdatedAt({ updatedAt: "2026-08-14T10:00:00.000Z" })).toBe("2026-08-14T10:00:00.000Z");
  });

  it("undefined para entidade nula/ausente", () => {
    expect(getExpectedUpdatedAt(null)).toBeUndefined();
    expect(getExpectedUpdatedAt(undefined)).toBeUndefined();
  });

  it("undefined quando o valor não é string (nunca inventa um timestamp)", () => {
    expect(getExpectedUpdatedAt({ updated_at: 12345 })).toBeUndefined();
  });
});

describe("isConcurrencyConflict", () => {
  it("true apenas para ConflictError — é o que api-client.ts realmente lança em HTTP 409", () => {
    expect(isConcurrencyConflict(new ConflictError("conflict"))).toBe(true);
    expect(isConcurrencyConflict(new IntegrationError("api", "not found", { statusCode: 404 }))).toBe(false);
    expect(isConcurrencyConflict(new IntegrationError("api", "conflict", { statusCode: 409 }))).toBe(false);
    expect(isConcurrencyConflict(new Error("outro erro"))).toBe(false);
    expect(isConcurrencyConflict(null)).toBe(false);
  });
});

describe("handleConcurrencyConflict", () => {
  beforeEach(() => vi.clearAllMocks());

  it("409: mostra toast específico, retorna true (chamador NÃO fecha o formulário)", () => {
    const err = new ConflictError("conflict");
    const handled = handleConcurrencyConflict(err, "contrato");
    expect(handled).toBe(true);
    expect(toast.error).toHaveBeenCalledTimes(1);
    const message = vi.mocked(toast.error).mock.calls[0][0] as string;
    expect(message).toContain("contrato");
    expect(message).toContain("alterado por outra pessoa");
  });

  it("não-409: retorna false, não mostra toast (deixa o chamador tratar)", () => {
    const handled = handleConcurrencyConflict(new Error("falha de rede"), "contrato");
    expect(handled).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
