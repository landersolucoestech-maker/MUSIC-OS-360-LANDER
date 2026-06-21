/**
 * core/interceptors/request-tenant-context.interceptor.ts
 *
 * FASE 3J — Estabelece o contexto de tenant no banco para TODA requisição HTTP
 * autenticada, de forma transparente (nenhum service/controller precisa mudar).
 *
 * Fluxo: guards já populam `request.tenant` (TenantGuard). Este interceptor —
 * registrado como APP_INTERCEPTOR OUTERMOST — envolve o handler em
 * `DatabaseContextService.runInTenantContext`, que abre uma transação, executa
 * `set_config('app.current_tenant_id', …)` e liga o EntityManager ao
 * AsyncLocalStorage. O Proxy de DATA_SOURCE roteia então todas as queries
 * (inclusive repos globais capturados no construtor) para essa conexão/contexto.
 *
 * Resultado: `private_get_tenant_id()` passa a retornar o tenant correto durante
 * qualquer controller HTTP — corrigindo o achado da FASE 3I sem tocar em RLS,
 * policies, migrations, schema ou nos services de negócio.
 *
 * Compatibilidade: gated por `DatabaseContextService.isEnabled`
 * (DATABASE_SESSION_CONTEXT_ENABLED=true). Requests sem tenant (rotas públicas,
 * health) passam direto. Workers/jobs/schedulers continuam usando
 * runInTenantContext diretamente — inalterados.
 */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  Optional,
} from '@nestjs/common';
import { Observable, from, lastValueFrom } from 'rxjs';
import { DatabaseContextService } from '../../database/database-context.service';

interface TenantRequest {
  tenant?: { id?: string; org_id?: string; orgId?: string } | null;
  currentMember?: { role?: string } | null;
  auth?: { orgId?: string; orgRole?: string } | null;
}

@Injectable()
export class RequestTenantContextInterceptor implements NestInterceptor {
  constructor(@Optional() private readonly dbContext?: DatabaseContextService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Só HTTP e só com o primitivo de contexto habilitado.
    if (context.getType() !== 'http' || !this.dbContext?.isEnabled) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest<TenantRequest>();
    const tenantId = req?.tenant?.id ?? null;
    if (!tenantId) {
      // Rota pública / sem tenant resolvido → sem contexto (comportamento atual).
      return next.handle();
    }

    const orgId = req?.tenant?.org_id ?? req?.tenant?.orgId ?? req?.auth?.orgId ?? null;
    const role = req?.currentMember?.role ?? req?.auth?.orgRole ?? null;

    // Envolve TODO o restante da cadeia (interceptors internos + handler) na
    // transação contextualizada. Erros propagam → rollback automático.
    return from(
      this.dbContext.runInTenantContext({ tenantId, orgId, role }, () =>
        lastValueFrom(next.handle()),
      ),
    );
  }
}
