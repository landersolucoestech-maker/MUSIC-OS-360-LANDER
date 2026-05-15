/**
 * lib/storage.ts — Camada de acesso a dados canónica.
 *
 * Re-exporta de shared/lib/storage. TODOS os services devem importar
 * de @/lib/storage (ou @/shared/lib/storage) — nunca localStorage directamente.
 */
export { storage } from "@/shared/lib/storage";
export type { StorageRow, ListOptions } from "@/shared/lib/storage";
