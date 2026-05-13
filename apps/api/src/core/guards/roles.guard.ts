/**
 * core/guards/roles.guard.ts
 *
 * Guard de RBAC por hierarquia de roles.
 * Verifica que o currentMember tem role suficiente para aceder à rota.
 * Usado em conjunto com @RequireRole(...).
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { Request } from 'express';

const ROLE_HIERARCHY: Record<string, number> = {
  viewer:  1,
  editor:  2,
  manager: 3,
  admin:   4,
  owner:   5,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const { currentMember } = context.switchToHttp().getRequest<Request>();
    const memberRole  = (currentMember as Record<string, unknown>)?.['orgRole'] as string ?? 'viewer';
    const memberLevel = ROLE_HIERARCHY[memberRole] ?? 0;
    const minRequired = Math.min(...required.map((r) => ROLE_HIERARCHY[r] ?? 99));

    if (memberLevel < minRequired) {
      throw new ForbiddenException(
        `Permissão insuficiente. Necessário: ${required.join(' ou ')}`,
      );
    }
    return true;
  }
}
