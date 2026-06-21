/**
 * modules/ai/hooks/useSkill.ts
 *
 * Hook genérico READ-ONLY para executar as 12 Skills novas via RunSkillUseCase.
 * Espelha o padrão de useAI, porém:
 *  — NÃO executa em mount; só roda quando run() é chamado;
 *  — NÃO oferece abort (executeSync não é cancelável — não inventar cancelamento falso);
 *  — não tem efeitos colaterais: apenas executa a skill e expõe o resultado.
 */

import { useState, useCallback } from "react";
import { getRunSkillUseCase } from "../application/RunSkill.usecase";
import type { RunSkillInput, RunSkillResult } from "../application/RunSkill.usecase";

// ─── State ────────────────────────────────────────────────────────────────────

interface UseSkillState {
  isLoading: boolean;
  error:     string | null;
  result:    RunSkillResult | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSkill() {
  const [state, setState] = useState<UseSkillState>({
    isLoading: false,
    error:     null,
    result:    null,
  });

  const useCase = getRunSkillUseCase();

  const run = useCallback(
    async (input: RunSkillInput): Promise<RunSkillResult | null> => {
      setState({ isLoading: true, error: null, result: null });

      try {
        const result = await useCase.executeSync(input);
        setState({ isLoading: false, error: null, result });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao executar a skill.";
        setState({ isLoading: false, error: message, result: null });
        return null;
      }
    },
    [useCase],
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, result: null });
  }, []);

  return {
    run,
    reset,
    isLoading: state.isLoading,
    error:     state.error,
    result:    state.result,
  };
}

export type { RunSkillInput, RunSkillResult };
