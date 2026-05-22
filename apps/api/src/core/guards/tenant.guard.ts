import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  ServiceUnavailableException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { TenantEntity, OrgMemberEntity } from '../../database/entities';
import { IS_PUBLIC_KEY } from './auth.guard';
import type { Request } from 'express';
import type { JwtAuth } from './auth.guard';

function readTenantHeader(request: Request): string | null {
  const raw = request.headers['x-tenant-id'];
  if (Array.isArray(raw)) return raw[0] ?? null;
  if (typeof raw === 'string' && raw.trim().length > 0) return raw.trim();
  return null;
}

@Injectable()
export class TenantGuard implements CanActivate {
  private readonly tenantRepo: Repository<TenantEntity> | null = null;
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
    const auth = request.auth;

    if (!auth?.orgId) {
      throw new UnauthorizedException('Organization not identified in token');
    }

    if (!this.tenantRepo || !this.memberRepo) {
      throw new ServiceUnavailableException('Tenant database unavailable');
    }

    const tenantHeader = readTenantHeader(request);

    if (tenantHeader && tenantHeader !== auth.orgId) {
      throw new ForbiddenException('Tenant header does not match authenticated organization');
    }

    const tenant = await this.tenantRepo
      .createQueryBuilder('t')
      .where(
        '(t.org_id::text = :orgId OR t.external_auth_org_id = :orgId) AND t.deleted_at IS NULL',
        { orgId: auth.orgId },
      )
      .getOne();

    if (!tenant || !tenant.active) {
      throw new UnauthorizedException('Tenant not found or inactive');
    }

    const tenantOrgId = String((tenant as unknown as Record<string, unknown>)['org_id'] ?? '');
    const tenantExternalOrgId = String((tenant as unknown as Record<string, unknown>)['external_auth_org_id'] ?? '');

    if (tenantHeader && tenantHeader !== tenantOrgId && tenantHeader !== tenantExternalOrgId) {
      throw new ForbiddenException('Tenant header does not match resolved tenant');
    }

    const member = await this.memberRepo
      .createQueryBuilder('m')
      .where(
        'm.tenant_id = :tenantId AND m.auth_user_id = :userId AND m.is_active = :active',
        { tenantId: tenant.id, userId: auth.userId, active: true },
      )
      .getOne();

    if (!member) {
      throw new ForbiddenException('User is not an active member of this tenant');
    }

    request.tenant = tenant as unknown as Record<string, unknown>;
    request.currentMember = member as unknown as Record<string, unknown>;

    return true;
  }
}
