import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AUTH_BOOTSTRAP_KEY } from '../decorators/auth-bootstrap.decorator';
import { AUTH_DISABLED } from '../auth-disabled';
import { BillingEnforcementService } from '../../modules/billing/billing-enforcement.service';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const ALWAYS_ALLOWED_PREFIXES = [
  '/auth/logout',
  '/billing',
  '/support',
  '/support-tickets',
  '/health',
  '/metrics',
];

const SUSPENDED_BLOCKED_PREFIXES = [
  '/artists',
  '/works',
  '/phonograms',
  '/catalog',
  '/contracts',
  '/contract-templates',
  '/marketing',
  '/campaigns',
  '/briefings',
  '/transactions',
  '/finance',
  '/financial',
  '/invoices',
  '/storage',
  '/uploads',
  '/clients',
  '/leads',
  '/contacts',
  '/academy',
  '/workspace',
  '/reports',
  '/projects',
  '/releases',
  '/assets',
  '/inventory',
  '/licensing',
  '/registry',
];

function normalizePath(req: Request): string {
  const raw = (req.route?.path && typeof req.route.path === 'string')
    ? req.originalUrl
    : req.originalUrl ?? req.url ?? '';
  return raw.replace(/^\/api\/v\d+/, '').split('?')[0] || '/';
}

function startsWithAny(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

@Injectable()
export class BillingEnforcementGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly billing: BillingEnforcementService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (AUTH_DISABLED) return true;

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const isAuthBootstrap = this.reflector.getAllAndOverride<boolean>(
      AUTH_BOOTSTRAP_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (isAuthBootstrap) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const tenantId = (request.tenant as Record<string, unknown> | undefined)?.['id'];
    if (typeof tenantId !== 'string' || tenantId.length === 0) return true;

    const path = normalizePath(request);
    if (startsWithAny(path, ALWAYS_ALLOWED_PREFIXES)) return true;

    const state = await this.billing.getState(tenantId);
    if (!state) return true;

    if (state.status === 'suspended' && startsWithAny(path, SUSPENDED_BLOCKED_PREFIXES)) {
      throw new ForbiddenException({
        error: 'TENANT_SUSPENDED',
        message: 'Subscription payment overdue',
      });
    }

    if (state.status === 'read_only' && !READ_METHODS.has((request.method ?? '').toUpperCase())) {
      throw new ForbiddenException({
        error: 'TENANT_READ_ONLY',
        message: 'Subscription payment overdue. Workspace is temporarily read-only.',
      });
    }

    return true;
  }
}
