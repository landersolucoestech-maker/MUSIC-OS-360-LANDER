import { describe, it, expect, vi, beforeEach } from "vitest";
import { runBulkAction, reportBulkResult } from "./useBulkAction";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

import { toast } from "sonner";

/**
 * Task K — prova de que bulk delete/update não mente sobre sucesso parcial:
 * antes, `selectedIds.forEach(id => mutation.mutate(id))` seguido de um toast
 * de sucesso IMEDIATO reportava "sucesso" mesmo quando parte das operações
 * falhava, sem contar nem identificar o que falhou.
 */
describe("runBulkAction", () => {
  it("aguarda todas as operações e reporta sucesso total quando todas resolvem", async () => {
    const action = vi.fn(async (id: string) => id);
    const result = await runBulkAction(["a", "b", "c"], action);
    expect(result.succeeded).toEqual(["a", "b", "c"]);
    expect(result.failed).toEqual([]);
  });

  it("uma falha não cancela as demais (Promise.allSettled) e é contabilizada, não escondida", async () => {
    const action = vi.fn(async (id: string) => {
      if (id === "b") throw new Error("conflito 409");
      return id;
    });
    const result = await runBulkAction(["a", "b", "c"], action);
    expect(action).toHaveBeenCalledTimes(3);
    expect(result.succeeded).toEqual(["a", "c"]);
    expect(result.failed).toEqual([{ id: "b", error: "conflito 409" }]);
  });

  it("todas falhando: nenhuma reportada como sucesso", async () => {
    const action = vi.fn(async () => { throw new Error("falhou"); });
    const result = await runBulkAction(["a", "b"], action);
    expect(result.succeeded).toEqual([]);
    expect(result.failed).toHaveLength(2);
  });
});

describe("reportBulkResult", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sucesso total -> toast.success, nunca warning/error", () => {
    reportBulkResult({ succeeded: ["a", "b"], failed: [] }, "excluído", "item");
    expect(toast.success).toHaveBeenCalled();
    expect(toast.warning).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("falha total -> toast.error, nunca success", () => {
    reportBulkResult({ succeeded: [], failed: [{ id: "a", error: "x" }] }, "excluído", "item");
    expect(toast.error).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("sucesso parcial -> toast.warning (nunca success, que mentiria sobre o resultado)", () => {
    reportBulkResult(
      { succeeded: ["a"], failed: [{ id: "b", error: "x" }] },
      "excluído",
      "item",
    );
    expect(toast.warning).toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    const message = vi.mocked(toast.warning).mock.calls[0][0] as string;
    expect(message).toContain("1");
  });
});
