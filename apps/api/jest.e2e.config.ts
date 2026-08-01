import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testEnvironment: 'node',
  testTimeout: 30000,
  // These specs run real INSERT/UPDATE/DELETE against one shared PostgreSQL
  // instance and some rely on fixtures (e.g. a well-known tenant UUID)
  // created by a sibling spec file — parallel workers race against that
  // shared state. Must run sequentially, one file at a time.
  maxWorkers: 1,
  // Guard fail-closed: aborta antes de qualquer spec se o alvo de banco não
  // for autorizado para o NODE_ENV (test → nenhum Supabase remoto).
  setupFiles: ['<rootDir>/test/e2e/e2e-db-guard.ts'],
};

export default config;
