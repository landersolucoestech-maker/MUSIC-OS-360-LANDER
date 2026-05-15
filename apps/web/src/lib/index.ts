/**
 * lib/index.ts — Barrel de saída da camada lib.
 *
 * Importações recomendadas para novos módulos:
 *
 *   import { api }         from '@/lib/api';
 *   import { queryClient } from '@/lib/query-client';
 *   import { MOCK_MODE }   from '@/lib/env';
 *   import { storage }     from '@/lib/storage';
 */
export * from "./api";
export * from "./query-client";
export * from "./env";
export * from "./storage";
