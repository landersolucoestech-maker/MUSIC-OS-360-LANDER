/**
 * core/interceptors/audit.interceptor.ts
 *
 * AuditInterceptor — intercepta rotas decoradas com @Audit('entidade.acao')
 * e regista a mutação no AuditService após a resposta.
 *
 * Captura automática:
 *  - before: SELECT da entidade por (tenant_id, id) antes do handler
 *  - after:  resposta do handler
 *  - diff:   calculado pelo AuditService a partir de before + after
 *  - correlation_id: lido do CorrelationContext (FASE 3 AsyncLocalStorage)
 *  - http_method / http_path: do request
 *  - actor_role: do JWT (orgRole)
 *  - session_id: do header X-Session-Id
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
  Inject,
  Optional,
} from '@nestjs/common';
import { Observable }        from 'rxjs';
import { tap }               from 'rxjs/operators';
import { Reflector }         from '@nestjs/core';
import { DataSource }        from 'typeorm';
import { AuditService }      from '../audit/audit.service';
import { DATA_SOURCE }       from '../../database/database.module';
import { CorrelationContext } from '../events/correlation.context';

export const AUDIT_KEY = 'audit_action';

/** Decorator para marcar uma rota para auditoria. */
export const Audit = (action: string) => SetMetadata(AUDIT_KEY, action);

// ── Entity table map ─────────────────────────────────────────────────────────
/**
 * Maps the entity prefix of an action (e.g. "contract" from "contract.updated")
 * to its TypeORM table name for the before-snapshot SELECT.
 */
const ENTITY_TABLE_MAP: Record<string, string> = {
  contract:    'contracts',
  release:     'releases',
  artist:      'artists',
  transaction: 'transactions',
  invoice:     'invoices',
  campaign:    'campaigns',
  upload:      'uploads',
  setting:     'tenants',
  user:        'org_members',
  billing:     'billing_subscriptions',
  lead:        'leads',
  client:      'clients',
  ticket:      'support_tickets',
};

/** Request shape expected inside the interceptor */
interface AuditRequest {
  auth?:        { userId?: string; orgRole?: string };
  /** tenant is a TypeORM entity — fields are snake_case */
  tenant?:      { id?: string; orgId?: string; org_id?: string };
  ip?:          string;
  requestId?:   string;
  method?:      string;
  url?:         string;
  params?:      Record<string, string>;
  headers?:     Record<string, string>;
  body?:        Record<string, unknown>;
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector:    Reflector,
    private readonly auditService: AuditService,
    @Optional() @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_KEY, context.getHandler());
    if (!action) return next.handle();

    const request = context.switchToHttp().getRequest<AuditRequest>();

    // Derive entity name from the action prefix (e.g. "contract.updated" → "contract")
    const entityName = action.split('.')[0];
    const tenantId   = request.tenant?.id  ?? null;

    // Generalised entity-id extraction:
    //  1. Prefer params.id (most common REST pattern)
    //  2. Fallback to any first route param (handles fileId, contractId, …)
    //  3. Fallback to body.id (POST mutations that embed the id in the payload)
    const params = request.params ?? {};
    const entityId: string | null =
      params['id'] ??
      (Object.values(params)[0] as string | undefined) ??
      (request.body?.['id'] as string | undefined) ??
      null;

    // Snapshot captured before the handler fires
    let beforeSnapshot: Record<string, unknown> | null = null;

    const captureBeforeAndHandle = async (): Promise<Observable<unknown>> => {
      // Attempt to load the entity state before the mutation (PATCH / DELETE).
      // Using ds.query() with positional params returns real column names (no alias prefix),
      // which is required for computeDiff to produce a correct before/after diff.
      if (entityId && tenantId && this.ds) {
        const table = ENTITY_TABLE_MAP[entityName];
        if (table) {
          try {
            const rows = await this.ds.query(
              `SELECT * FROM "${table}" WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
              [entityId, tenantId],
            ) as Record<string, unknown>[];
            beforeSnapshot = rows[0] ?? null;
          } catch {
            // Non-critical — proceed without before snapshot
          }
        }
      }

      return next.handle().pipe(
        tap(async (result: unknown) => {
          try {
            const resultObj = result as Record<string, unknown> | null;

            const afterEntityId =
              entityId ??
              (resultObj?.['id'] as string | undefined) ??
              ((resultObj?.['data'] as Record<string, unknown> | undefined)?.['id'] as string | undefined) ??
              null;

            const requestId    = request.requestId ?? request.headers?.['x-request-id'] ?? null;
            const correlationId = CorrelationContext.get() ?? null;
            const sessionId    = request.headers?.['x-session-id'] ?? null;
            const actorRole    = request.auth?.orgRole ?? null;
            // tenant is a TypeORM entity — fields are snake_case (org_id, not orgId)
            const orgId = (request.tenant?.['org_id'] as string | undefined) ?? null;

            await this.auditService.log({
              tenantId:       tenantId,
              orgId,
              userId:         request.auth?.userId ?? null,
              actorRole,
              action,
              entity:         entityName,
              entityId:       afterEntityId,
              before:         beforeSnapshot,
              after:          result,
              ip:             request.ip         ?? null,
              userAgent:      request.headers?.['user-agent'] ?? null,
              requestId,
              correlationId,
              sessionId,
              httpMethod:     request.method     ?? null,
              httpPath:       request.url        ?? null,
            });
          } catch {
            // AuditInterceptor must never throw — swallow all errors
          }
        }),
      );
    };

    // Return a synchronous Observable that bridges the async setup
    return new Observable(subscriber => {
      captureBeforeAndHandle().then(obs => {
        obs.subscribe({
          next:     v => subscriber.next(v),
          error:    e => subscriber.error(e),
          complete: () => subscriber.complete(),
        });
      }).catch(e => subscriber.error(e));
    });
  }
}
