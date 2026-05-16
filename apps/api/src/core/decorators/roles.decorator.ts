import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/**
 * @RequireRole('viewer') — preferred for method-level decorators.
 * Accepts one or more roles; the minimum in the hierarchy is applied.
 */
export const RequireRole = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

/**
 * @Roles('admin') — preferred for class-level decorators.
 * Alias for RequireRole; identical behavior.
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
