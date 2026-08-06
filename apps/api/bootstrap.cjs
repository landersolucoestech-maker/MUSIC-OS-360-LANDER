'use strict';

/**
 * Production entrypoint copied into apps/api/dist by the Docker build.
 *
 * Runtime workspace imports (for example @music-os-360/types) must resolve
 * through pnpm's node_modules links and each package's compiled `dist` export.
 * Registering tsconfig-paths here previously redirected those imports to
 * non-existent source paths under apps/api/dist and referenced a removed
 * packages/shared-types workspace.
 */
require('./apps/api/src/main.js');
