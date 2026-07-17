/**
 * test/e2e/e2e-db-guard.ts — guard fail-closed do bootstrap E2E (setupFiles).
 *
 * Executa ANTES de qualquer spec: se as variáveis de banco do processo
 * apontarem para um alvo não autorizado para o NODE_ENV (em jest, `test` →
 * nenhum projeto Supabase remoto; Postgres local permitido), o processo aborta
 * antes de qualquer DataSource ser criado. Specs E2E contra um branch remoto
 * autorizado exigem decisão explícita (NODE_ENV e env coerentes com a matriz
 * de docs/SUPABASE_ENVIRONMENTS.md).
 */
import { assertDatabaseCommandEnv } from '../../src/core/config/env.schema';

assertDatabaseCommandEnv('jest-e2e');
