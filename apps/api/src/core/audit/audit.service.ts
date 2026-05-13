/**
 * core/audit/audit.service.ts
 *
 * AuditService — regista todas as mutações na tabela audit_logs (Neon/Drizzle).
 * Nunca quebra a operação principal (try/catch silencioso).
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DRIZZLE_DB, DrizzleDB }      from '../../database/database.module';
import { auditLogs }                   from '../../database/schema';

export interface AuditParams {
  tenantId?:   string | null;
  userId?:     string | null;
  action:      string;
  entity:      string;
  entityId?:   string;
  before?:     unknown;
  after?:      unknown;
  ip?:         string;
  userAgent?:  string;
  requestId?:  string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB | null,
  ) {}

  async log(params: AuditParams): Promise<void> {
    if (!this.db) return;

    try {
      await this.db.insert(auditLogs).values({
        tenant_id:  params.tenantId   ?? null,
        user_id:    params.userId     ?? null,
        action:     params.action,
        entity:     params.entity,
        entity_id:  params.entityId   ?? null,
        before:     params.before     ?? null,
        after:      params.after      ?? null,
        ip_address: params.ip         ?? null,
        user_agent: params.userAgent  ?? null,
        request_id: params.requestId  ?? null,
      });
    } catch (err) {
      // Auditoria nunca deve quebrar a operação principal
      this.logger.warn(`AuditService.log failed silently: ${String(err)}`);
    }
  }
}
