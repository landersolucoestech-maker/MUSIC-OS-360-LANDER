/**
 * shared/lib/env.ts — Fonte única de verdade para variáveis de ambiente.
 *
 * REGRA: nenhum outro ficheiro deve ler import.meta.env directamente
 * para flags de modo. Importar sempre daqui.
 *
 * MOCK_MODE: true  → standalone (MOCK_DATA + localStorage, sem backend)
 * MOCK_MODE: false → produção (HTTP API real, backend NestJS)
 *
 * VITE_USE_MOCK é a flag canónica.
 * VITE_MOCK_MODE é mantida por retrocompatibilidade.
 * Qualquer das duas definida como "false" desactiva o modo mock.
 */

export const MOCK_MODE: boolean =
  import.meta.env.VITE_USE_MOCK !== "false" &&
  import.meta.env.VITE_MOCK_MODE !== "false";

/** URL base da API backend. String vazia = URLs relativas (same-domain). */
export const API_BASE_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "";

/** true em ambiente de desenvolvimento Vite (npm run dev). */
export const IS_DEV: boolean = import.meta.env.DEV === true;

/** true em build de produção. */
export const IS_PROD: boolean = import.meta.env.PROD === true;
