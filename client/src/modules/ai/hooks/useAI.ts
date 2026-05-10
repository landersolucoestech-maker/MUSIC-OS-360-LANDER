/**
 * modules/ai/hooks/useAI.ts
 *
 * Hook principal de geração de conteúdo de IA.
 *
 * Expõe:
 *  — generate(input)    → resultado síncrono via GenerateContentUseCase.executeSync()
 *  — isLoading          → boolean
 *  — error              → string | null
 *  — result             → GenerateContentResult | null
 *  — reset()            → limpar estado
 *  — abort()            → cancelar geração em curso (MOCK_MODE: não-operacional)
 *
 * Preserva UX existente de IACriativa.tsx — drop-in replacement de useMarketingAI
 * para novos componentes. Não alterar IACriativa.tsx nem useMarketingAI.ts — apenas
 * novos componentes usam este hook.
 */

import { useState, useCallback, useRef } from "react";
import { getGenerateContentUseCase } from "../application/GenerateContent.usecase";
import type {
  GenerateContentInput,
  GenerateContentResult,
} from "../application/GenerateContent.usecase";

// ─── State ────────────────────────────────────────────────────────────────────

interface UseAIState {
  isLoading: boolean;
  error:     string | null;
  result:    GenerateContentResult | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAI() {
  const [state, setState] = useState<UseAIState>({
    isLoading: false,
    error:     null,
    result:    null,
  });

  const abortRef = useRef(false);
  const useCase  = getGenerateContentUseCase();

  // ── Generate ───────────────────────────────────────────────────────────────

  const generate = useCallback(
    async (input: GenerateContentInput): Promise<GenerateContentResult | null> => {
      abortRef.current = false;

      setState({ isLoading: true, error: null, result: null });

      try {
        const result = await useCase.executeSync(input);

        if (abortRef.current) {
          setState((prev) => ({ ...prev, isLoading: false }));
          return null;
        }

        setState({ isLoading: false, error: null, result });
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao gerar conteúdo.";
        setState({ isLoading: false, error: message, result: null });
        return null;
      }
    },
    [useCase],
  );

  // ── Reset ──────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    abortRef.current = false;
    setState({ isLoading: false, error: null, result: null });
  }, []);

  // ── Abort (best-effort) ────────────────────────────────────────────────────

  const abort = useCallback(() => {
    abortRef.current = true;
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  return {
    generate,
    reset,
    abort,
    isLoading: state.isLoading,
    error:     state.error,
    result:    state.result,
  };
}

export type { GenerateContentInput, GenerateContentResult };
