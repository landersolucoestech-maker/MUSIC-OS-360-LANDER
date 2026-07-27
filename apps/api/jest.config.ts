import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: '<rootDir>/../tsconfig.json',
      diagnostics: { warnOnly: true },
    }],
  },
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.module.ts',
    '!**/*.dto.ts',
    '!**/*.decorator.ts',
    '!**/index.ts',
    '!**/main.ts',
    '!**/instrument.ts',
    '!**/*.spec.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  // P0-09: Thresholds aligned to current baseline (FASE 10). The strict-types
  // migration + new tests for FASE 9.4/9.5 fixes (RolesGuard, TokenVerifier,
  // sanitizeForAudit, MIME extension, etc.) will incrementally raise these.
  // Plan: +2% per quarter on lines/statements until 60%+; +1% on branches.
  coverageThreshold: {
    global: {
      lines:      13,
      statements: 12,
      functions:   2,
      branches:    1,
    },
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // Pacote compartilhado de AI Skills (consumido como fonte TS; sem symlink em testes).
    '^@music-os-360/ai-skills$': '<rootDir>/../../../packages/ai-skills/src/index.ts',
    // Mesma razão: @music-os-360/types é consumido por database/entities.ts e ~59
    // outros arquivos; sem este mapeamento, qualquer ambiente sem o symlink do
    // workspace (ex.: node-linker isolado sem link, ou filesystem sem symlink)
    // quebra toda a suíte que importa entities.ts, não só specs de types.
    '^@music-os-360/types$': '<rootDir>/../../../packages/types/src/index.ts',
  },
};

export default config;
