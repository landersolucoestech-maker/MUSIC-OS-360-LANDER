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
  // Baseline locked just below the verified CI coverage from 2026-08-05:
  // lines 46.43%, statements 46.23%, functions 39.24%, branches 29.59%.
  // Any meaningful regression now fails CI instead of remaining hidden behind
  // the former 13/12/2/1 thresholds.
  coverageThreshold: {
    global: {
      lines:      45,
      statements: 45,
      functions:  38,
      branches:   28,
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
