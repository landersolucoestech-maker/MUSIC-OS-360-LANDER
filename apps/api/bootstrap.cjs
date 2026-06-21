require('tsconfig-paths').register({
  baseUrl: __dirname,
  paths: {
    '@music-os-360/types': ['packages/types/src/index.js'],
    '@music-os-360/types/*': ['packages/types/src/*'],
    '@shared-types/*': ['../../packages/shared-types/src/*'],
  },
});
require('./apps/api/src/main.js');
