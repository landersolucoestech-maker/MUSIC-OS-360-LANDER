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
  // Guard fail-closed: aborta antes de qualquer spec se o alvo de banco não
  // for autorizado para o NODE_ENV (test → nenhum Supabase remoto).
  setupFiles: ['<rootDir>/test/e2e/e2e-db-guard.ts'],
};

export default config;
