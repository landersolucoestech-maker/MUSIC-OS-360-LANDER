import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  Logger,
  Inject,
} from '@nestjs/common';
import { Reflector }  from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { TenantEntity, OrgMemberEntity } from '../../database/entities';
import { IS_PUBLIC_KEY } from './auth.guard';
import type { Request } from 'express';
import type { JwtAuth } from './auth.guard';

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);
  private readonly tenantRepo: Repository<TenantEntity>    | null = null;
  private readonly memberRepo: Repository<OrgMemberEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly reflector: Reflector,
  ) {
    if (ds) {
      this.tenantRepo = ds.getRepository(TenantEntity);
      this.memberRepo = ds.getRepository(OrgMemberEntity);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request & { auth?: JwtAuth }>();
    const auth    = request.auth;

    if (!auth?.orgId) {
      throw new UnauthorizedException('OrganizaÃ§Ã£o nÃ£o identificada no token');
    }

    if (!this.tenantRepo || !this.memberRepo) {
  throw new ServiceUnavailableException(
    'Tenant database unavailable',
  );
}

    // Primary lookup: org_id UUID (Supabase app_metadata.org_id â†’ organizations.id).
    // Fallback:       external_auth_org_id for tenants provisioned before the Supabase migration.
    const tenant = await this.tenantRepo
      .createQueryBuilder('t')
      .where(
        '(t.org_id::text = :orgId OR t.external_auth_org_id = :orgId) AND t.deleted_at IS NULL',
        { orgId: auth.orgId },
      )
      .getOne();

    if (!tenant || !tenant.active) {
      throw new UnauthorizedException('Tenant nÃ£o encontrado ou inativo');
    }

    // auth_user_id stores the user identifier from the JWT `sub` claim.
    // With Supabase, `sub` is a UUID â€” same column, different value format.
    const member = await this.memberRepo
      .createQueryBuilder('m')
      .where(
        'm.tenant_id = :tenantId AND m.auth_user_id = :userId AND m.is_active = :active',
        { tenantId: tenant.id, userId: auth.userId, active: true },
      )
      .getOne();

    if (!member) {
      throw new ForbiddenException('Utilizador nÃ£o Ã© membro activo deste tenant');
    }

    request.tenant        = tenant as unknown as Record<string, unknown>;
    request.currentMember = member as unknown as Record<string, unknown>;

    return true;
  }
}
