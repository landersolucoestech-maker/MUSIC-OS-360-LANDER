/**
 * core/guards/tenant.guard.ts
 *
 * Guard de isolamento multi-tenant.
 * Verifica que o org_id do token Clerk corresponde a um tenant activo
 * e que o utilizador é membro activo desse tenant.
 *
 * Popula request.tenant e request.currentMember para uso nos controllers.
 * Adaptado para Drizzle ORM (sem Prisma).
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { DRIZZLE_DB } from '../../database/database.module';
import { IS_PUBLIC_KEY } from './clerk-auth.guard';
import type { Request } from 'express';
import type { ClerkAuth } from './clerk-auth.guard';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { auth?: ClerkAuth }>();
    const auth    = request.auth;

    if (!auth?.orgId) {
      throw new UnauthorizedException('Organização não identificada no token');
    }

    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.clerkOrgId, auth.orgId))
      .limit(1);

    if (!tenant || !tenant.active) {
      throw new UnauthorizedException('Tenant não encontrado ou inativo');
    }

    const [member] = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenant.id),
          eq(schema.users.clerkId, auth.userId),
        ),
      )
      .limit(1);

    if (!member || !member.isActive) {
      throw new ForbiddenException('Utilizador não é membro activo deste tenant');
    }

    request.tenant        = tenant as unknown as Record<string, unknown>;
    request.currentMember = member as unknown as Record<string, unknown>;

    return true;
  }
}
