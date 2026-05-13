import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'core/security/encryption.service.ts',
    'core/guards/clerk-auth.guard.ts',
    'modules/artists/artists.service.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      lines:      80,
      statements: 80,
      functions:  80,
      branches:   60,
    },
  },
};

export default config;
