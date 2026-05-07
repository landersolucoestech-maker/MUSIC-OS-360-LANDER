/**
 * Submodule: integrations/abramus
 *
 * Barrel de exports para a integração ABRAMUS.
 *
 * Arquitetura em 3 camadas:
 * - abramus.client.ts  → I/O externo (API mock / real), credentials
 * - abramus.service.ts → lógica de domínio (import, sync, match)
 * - hooks/useAbramus   → hook de UI (TanStack Query, state)
 *
 * Imports legados (`hooks/useAbramus`) continuam funcionando via re-export.
 * Novo código deve importar da camada correta:
 *   import { abramusSearch } from "@/modules/integrations/abramus"
 *   import { importAbramusRecord } from "@/modules/integrations/abramus"
 */

// Client layer (I/O + credentials + mock DB)
export {
  abramusSearch,
  abramusGetStatus,
  abramusCredentialsClient,
  ABRAMUS_OBRAS_DB,
  ABRAMUS_FONOGRAMAS_DB,
} from "./abramus.client";
export type { AbramusCredentials, AbramusSyncSchedule } from "./abramus.client";

// Service layer (domain integration logic)
export {
  searchAbramus,
  findLocalMatch,
  importAbramusRecord,
  syncAllAbramus,
} from "./abramus.service";
export type { AbramusLocalMatch } from "./abramus.service";

// Hook layer (legacy + UI) — re-exported for backward compat
export * from "../hooks/useAbramus";
