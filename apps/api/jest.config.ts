import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.module.ts',
    '!**/main.ts',
    '!**/instrument.ts',
    '!**/*.dto.ts',
    '!**/*.entity.ts',
    '!**/index.ts',
    '!**/*.d.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      lines:      70,
      statements: 75,
      functions:  80,
      branches:   80,
    },
  },
};

export default config;
