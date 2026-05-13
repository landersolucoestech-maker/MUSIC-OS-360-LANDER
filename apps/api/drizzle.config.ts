/**
 * drizzle.config.ts
 *
 * Configuração do Drizzle Kit para migrations.
 * Usa NEON_DATABASE_DIRECT_URL (ligação directa, sem pooler) para DDL.
 *
 * Comandos:
 *   npx drizzle-kit generate   → gera ficheiros SQL em drizzle/
 *   npx drizzle-kit migrate    → aplica migrations na BD
 *   npx drizzle-kit studio     → abre Drizzle Studio (UI)
 */

import { defineConfig } from 'drizzle-kit';

const url =
  process.env.NEON_DATABASE_DIRECT_URL ??
  process.env.NEON_DATABASE_URL ??
  process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'Defina NEON_DATABASE_DIRECT_URL, NEON_DATABASE_URL ou DATABASE_URL para usar o Drizzle Kit',
  );
}

export default defineConfig({
  schema:    './src/database/schema.ts',
  out:       './drizzle',
  dialect:   'postgresql',
  dbCredentials: { url },
  verbose: true,
  strict:  true,
});
