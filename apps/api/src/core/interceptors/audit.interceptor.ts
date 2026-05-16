/**
 * core/interceptors/audit.interceptor.ts
 *
 * AuditInterceptor — intercepta rotas decoradas com @Audit('entidade.acao')
 * e regista a mutação no AuditService após a resposta.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  SetMetadata,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap }        from 'rxjs/operators';
import { Reflector }  from '@nestjs/core';
import { AuditService } from '../audit/audit.service';

export const AUDIT_KEY = 'audit_action';

/** Decorator para marcar uma rota para auditoria. */
export const Audit = (action: string) => SetMetadata(AUDIT_KEY, action);

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector:    Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const action = this.reflector.get<string>(AUDIT_KEY, context.getHandler());
    if (!action) return next.handle();

    const request   = context.switchToHttp().getRequest<{
      auth?:      { userId?: string };
      tenant?:    { id?: string };
      ip?:        string;
      requestId?: string;
      headers?:   Record<string, string>;
    }>();

    return next.handle().pipe(
      tap(async (result: unknown) => {
        const resultObj = result as Record<string, unknown> | null;
        // Usa requestId injectado pelo RequestIdMiddleware; fallback para header
        const requestId = request.requestId ?? request.headers?.['x-request-id'];
        await this.auditService.log({
          tenantId:  request.tenant?.id  ?? null,
          userId:    request.auth?.userId ?? null,
          action,
          entity:    action.split('.')[0],
          entityId:
            (resultObj?.['id'] as string | undefined) ??
            ((resultObj?.['data'] as Record<string, unknown> | undefined)?.['id'] as string | undefined),
          after:     result,
          ip:        request.ip,
          userAgent: request.headers?.['user-agent'],
          requestId,
        });
      }),
    );
  }
}
