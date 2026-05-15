/**
 * core/audit/audit.service.ts
 *
 * AuditService — regista todas as mutações na tabela audit_logs (TypeORM).
 * Nunca quebra a operação principal (try/catch silencioso).
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { DataSource, Repository }     from 'typeorm';
import { DATA_SOURCE }                from '../../database/database.module';
import { AuditLogEntity }             from '../../database/entities';

export interface AuditParams {
  tenantId?:  string | null;
  userId?:    string | null;
  action:     string;
  entity:     string;
  entityId?:  string;
  before?:    unknown;
  after?:     unknown;
  ip?:        string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly repo: Repository<AuditLogEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(AuditLogEntity);
  }

  async log(params: AuditParams): Promise<void> {
    if (!this.repo) return;

    try {
      const entity = this.repo.create({
        tenant_id:  params.tenantId   ?? null,
        user_id:    params.userId     ?? null,
        action:     params.action,
        entity:     params.entity,
        entity_id:  params.entityId   ?? null,
        before:     (params.before    ?? null) as Record<string, unknown> | null,
        after:      (params.after     ?? null) as Record<string, unknown> | null,
        ip_address: params.ip         ?? null,
        user_agent: params.userAgent  ?? null,
        request_id: params.requestId  ?? null,
      });
      await this.repo.save(entity);
    } catch (err) {
      this.logger.warn(`AuditService.log failed silently: ${String(err)}`);
    }
  }
}
