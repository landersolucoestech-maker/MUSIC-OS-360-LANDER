/**
 * core/guards/roles.guard.ts
 *
 * Guard de RBAC por hierarquia de roles.
 * Verifica que o currentMember tem role suficiente para aceder à rota.
 * Usado em conjunto com @RequireRole(...) / @Roles(...).
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
import { SystemRole, FunctionalRole } from '@music-os-360/types';

/**
 * ROLE_HIERARCHY — fonte única de verdade para hierarquia de roles.
 * Alinhado com RbacService. Quanto maior o número, mais permissões.
 * tenant_owner e owner são equivalentes (nível 90) mas mantidos separados
 * para compatibilidade com dados legados.
 */
export const ROLE_HIERARCHY: Record<string, number> = {
  [SystemRole.SUPER_ADMIN]:  100,
  [SystemRole.TENANT_OWNER]: 90,
  [SystemRole.OWNER]:        90,
  [SystemRole.ADMIN]:        80,
  [SystemRole.MANAGER]:      70,
  [SystemRole.EDITOR]:       60,
  [SystemRole.VIEWER]:       10,
  [FunctionalRole.FINANCIAL]:         60,
  [FunctionalRole.ACCOUNTING]:        60,
  [FunctionalRole.JURIDICO]:          55,
  [FunctionalRole.MARKETING]:         50,
  [FunctionalRole.MARKETING_MANAGER]: 55,
  [FunctionalRole.ARTIST]:            30,
  [FunctionalRole.ARTISTA]:           30,
  [FunctionalRole.PRODUTOR]:          40,
  [FunctionalRole.COMERCIAL]:         45,
  [FunctionalRole.COLABORADOR]:       20,
  [FunctionalRole.RH_MANAGER]:        55,
  [FunctionalRole.RADIO]:             40,
  [FunctionalRole.TV]:                40,
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

    if (!currentMember) {
      throw new ForbiddenException('Contexto RBAC ausente. TenantGuard deve resolver o membro antes da autorização.');
    }

    const memberRole  = (currentMember as Record<string, unknown>)?.['role'] as string ?? SystemRole.VIEWER;
    const memberLevel = ROLE_HIERARCHY[memberRole] ?? 0;
    const minRequired = Math.min(...required.map((r) => ROLE_HIERARCHY[r] ?? 99));

    if (memberLevel < minRequired) {
      throw new ForbiddenException(
        `Permissão insuficiente. Role actual: ${memberRole}. Necessário: ${required.join(' ou ')}`,
      );
    }
    return true;
  }
}
