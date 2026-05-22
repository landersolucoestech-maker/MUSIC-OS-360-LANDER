/**
 * core/guards/roles.guard.ts
 *
 * Guard de RBAC por hierarquia de roles.
 * Verifica que o currentMember tem role suficiente para aceder à rota.
 * Classe e método são combinados de forma fail-closed: uma rota nunca pode
 * reduzir a exigência definida no controller.
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

export const ROLE_HIERARCHY: Record<string, number> = {
  [SystemRole.SUPER_ADMIN]: 100,
  [SystemRole.TENANT_OWNER]: 90,
  [SystemRole.OWNER]: 90,
  [SystemRole.ADMIN]: 80,
  [SystemRole.MANAGER]: 70,
  [SystemRole.EDITOR]: 60,
  [SystemRole.VIEWER]: 10,
  [FunctionalRole.FINANCIAL]: 60,
  [FunctionalRole.ACCOUNTING]: 60,
  [FunctionalRole.JURIDICO]: 55,
  [FunctionalRole.MARKETING]: 50,
  [FunctionalRole.MARKETING_MANAGER]: 55,
  [FunctionalRole.ARTIST]: 30,
  [FunctionalRole.ARTISTA]: 30,
  [FunctionalRole.PRODUTOR]: 40,
  [FunctionalRole.COMERCIAL]: 45,
  [FunctionalRole.COLABORADOR]: 20,
  [FunctionalRole.RH_MANAGER]: 55,
  [FunctionalRole.RADIO]: 40,
  [FunctionalRole.TV]: 40,
};

function minAcceptedLevel(roles: string[] | undefined): number | null {
  if (!roles || roles.length === 0) return null;
  return Math.min(...roles.map((role) => ROLE_HIERARCHY[role] ?? 99));
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const classRoles = this.reflector.get<string[]>(ROLES_KEY, context.getClass());
    const handlerRoles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler());

    const classLevel = minAcceptedLevel(classRoles);
    const handlerLevel = minAcceptedLevel(handlerRoles);

    if (classLevel === null && handlerLevel === null) return true;

    const requiredLevel = Math.max(classLevel ?? 0, handlerLevel ?? 0);
    const requiredLabels = [classRoles, handlerRoles]
      .filter((roles): roles is string[] => Array.isArray(roles) && roles.length > 0)
      .map((roles) => roles.join(' ou '))
      .join(' + ');

    const { currentMember } = context.switchToHttp().getRequest<Request>();

    if (!currentMember) {
      throw new ForbiddenException('Contexto RBAC ausente. TenantGuard deve resolver o membro antes da autorização.');
    }

    const memberRole = ((currentMember as Record<string, unknown>)['role'] as string | undefined) ?? SystemRole.VIEWER;
    const memberLevel = ROLE_HIERARCHY[memberRole] ?? 0;

    if (memberLevel < requiredLevel) {
      throw new ForbiddenException(
        `Permissão insuficiente. Role actual: ${memberRole}. Necessário: ${requiredLabels}`,
      );
    }

    return true;
  }
}
