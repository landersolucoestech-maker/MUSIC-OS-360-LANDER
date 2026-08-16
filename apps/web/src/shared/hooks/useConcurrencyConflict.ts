import { toast } from "sonner";
import { IntegrationError } from "@/shared/lib/errors";

/**
 * Task L — leitura do `updated_at` original de uma entidade carregada, para
 * reenviar como `expectedUpdatedAt` no update/patch (proteção de concorrência
 * do backend — ver apps/api/src/common/persistence/optimistic-update.util.ts).
 *
 * Deliberadamente NÃO um hook com estado/ref: os modais de edição recebem a
 * entidade como prop no momento em que abrem e essa prop não é atualizada
 * enquanto o formulário está aberto — ler `updated_at` no submit já reflete o
 * valor ORIGINAL carregado, nunca "agora". Se algum formulário passar a
 * refazer fetch da entidade em background enquanto edita, ele precisa
 * congelar o valor lido na primeira renderização (useRef/useState inicial)
 * antes de usar este helper — isso é responsabilidade do chamador.
 */
export function getExpectedUpdatedAt(
  entity: { updated_at?: unknown; updatedAt?: unknown } | null | undefined,
): string | undefined {
  const value = entity?.updated_at ?? entity?.updatedAt;
  return typeof value === "string" ? value : undefined;
}

/** True quando o erro é um 409 do backend (versão desatualizada — outra sessão salvou primeiro). */
export function isConcurrencyConflict(err: unknown): boolean {
  return err instanceof IntegrationError && err.statusCode === 409;
}

/**
 * Trata um 409 de concorrência de forma consistente em qualquer formulário:
 * avisa que o registro mudou (nunca finge sucesso, nunca sobrescreve), e
 * devolve `true` para o chamador NÃO fechar o modal/limpar o form. Se o erro
 * não for um 409, relança para o catch do chamador tratar como erro genérico.
 *
 * Uso típico:
 *   } catch (err) {
 *     if (handleConcurrencyConflict(err, "contrato")) return;
 *     toast.error("Erro ao salvar contrato. Tente novamente.");
 *   }
 */
export function handleConcurrencyConflict(err: unknown, entityLabel: string): boolean {
  if (!isConcurrencyConflict(err)) return false;
  toast.error(
    `Este ${entityLabel} foi alterado por outra pessoa desde que você o carregou. ` +
    `Feche e reabra o formulário para ver a versão mais recente antes de salvar novamente.`,
  );
  return true;
}
