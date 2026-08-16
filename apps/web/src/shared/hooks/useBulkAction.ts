import { toast } from "sonner";

export interface BulkActionResult {
  succeeded: string[];
  failed: Array<{ id: string; error: string }>;
}

/**
 * Task K — substitui o padrão `selectedIds.forEach(id => mutation.mutate(id))`
 * seguido de um toast de sucesso IMEDIATO (antes de qualquer request
 * terminar) — encontrado em ~27 páginas com seleção em massa. Esse padrão
 * mostra "sucesso" mesmo quando parte das operações falha, sem contar ou
 * identificar o que falhou.
 *
 * `runBulkAction` espera todas as operações resolverem (Promise.allSettled —
 * uma falha não cancela as demais) e devolve contagem exata de sucesso/falha
 * para o chamador decidir a mensagem correta via `reportBulkResult`.
 */
export async function runBulkAction<T>(
  ids: string[],
  action: (id: string) => Promise<T>,
): Promise<BulkActionResult> {
  const results = await Promise.allSettled(ids.map((id) => action(id)));
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      succeeded.push(ids[i]);
    } else {
      const reason = result.reason as unknown;
      failed.push({ id: ids[i], error: reason instanceof Error ? reason.message : String(reason) });
    }
  });
  return { succeeded, failed };
}

/**
 * Mensagem honesta sobre o resultado real: nunca "sucesso" quando houve
 * falha parcial, nunca silêncio sobre quantos itens falharam.
 */
export function reportBulkResult(result: BulkActionResult, actionLabel: string, itemLabel: string): void {
  const { succeeded, failed } = result;
  if (failed.length === 0) {
    toast.success(`${succeeded.length} ${itemLabel}${succeeded.length === 1 ? "" : "(s)"} ${actionLabel} com sucesso`);
    return;
  }
  if (succeeded.length === 0) {
    toast.error(`Nenhum ${itemLabel} foi ${actionLabel} (${failed.length} falha${failed.length === 1 ? "" : "s"}). Tente novamente.`);
    return;
  }
  toast.warning(
    `${succeeded.length} ${itemLabel}(s) ${actionLabel} com sucesso, ${failed.length} falharam. Verifique e tente novamente para os que falharam.`,
  );
}
