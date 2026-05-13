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
import { eq, and, isNull } from 'drizzle-orm';
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

    // 1. Find active tenant by clerk_org_id (new snake_case schema)
    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(
        and(
          eq(schema.tenants.clerk_org_id, auth.orgId),
          isNull(schema.tenants.deleted_at),
        ),
      )
      .limit(1);

    if (!tenant || !tenant.active) {
      throw new UnauthorizedException('Tenant não encontrado ou inativo');
    }

    // 2. Verify user is an active member via org_members (not users table)
    const [member] = await this.db
      .select()
      .from(schema.orgMembers)
      .where(
        and(
          eq(schema.orgMembers.tenant_id, tenant.id),
          eq(schema.orgMembers.clerk_user_id, auth.userId),
          eq(schema.orgMembers.is_active, true),
        ),
      )
      .limit(1);

    if (!member) {
      throw new ForbiddenException('Utilizador não é membro activo deste tenant');
    }

    request.tenant        = tenant as unknown as Record<string, unknown>;
    request.currentMember = member as unknown as Record<string, unknown>;

    return true;
  }
}
