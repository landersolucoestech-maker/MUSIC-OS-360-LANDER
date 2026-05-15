/**
 * drizzle.config.ts
 *
 * Configuração do Drizzle Kit para migrations (PostgreSQL / node-postgres).
 *
 * Comandos:
 *   npx drizzle-kit generate   → gera ficheiros SQL em drizzle/
 *   npx drizzle-kit migrate    → aplica migrations na BD
 *   npx drizzle-kit studio     → abre Drizzle Studio (UI)
 */

import { defineConfig } from 'drizzle-kit';

const url = process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    'Defina DATABASE_URL para usar o Drizzle Kit (ex: postgres://user:pass@host:5432/db)',
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
