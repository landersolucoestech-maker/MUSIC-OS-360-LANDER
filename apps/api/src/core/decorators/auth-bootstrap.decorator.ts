import { SetMetadata } from '@nestjs/common';

export const AUTH_BOOTSTRAP_KEY = 'authBootstrap';

/**
 * Requires a valid JWT but skips tenant and RBAC guards while the user's first
 * tenant/membership is being created.
 */
export const AuthBootstrap = () => SetMetadata(AUTH_BOOTSTRAP_KEY, true);
