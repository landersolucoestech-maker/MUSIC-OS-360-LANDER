/**
 * modules/assets/handlers/asset-linking.handler.ts
 *
 * Liga o evento REAL existente asset.uploaded ao Asset Linking Skill.
 * Infraestrutura interna — sem exposição ao usuário.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS, type DomainEvent } from '../../../core/events/events.service';
import type { AssetUploadedPayload } from '../../../core/events/domain-events.types';
import { DatabaseContextService } from '../../../database/database-context.service';
import { AssetLinkingService } from '../asset-linking.service';

@Injectable()
export class AssetLinkingHandler {
  private readonly logger = new Logger(AssetLinkingHandler.name);

  constructor(
    private readonly assetLinking: AssetLinkingService,
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {}

  @OnEvent(DOMAIN_EVENTS.ASSET_UPLOADED, { async: true })
  async onAssetUploaded(event: DomainEvent<AssetUploadedPayload>): Promise<void> {
    const tenantId = event?.tenantId ?? event?.payload?.tenantId;
    // Fail-closed: an async handler without a tenant must not touch tenant data.
    if (!tenantId) {
      this.logger.warn('AssetLinkingHandler: evento sem tenantId — abortado (fail-closed)');
      return;
    }
    if (!this.dbContext) {
      this.logger.warn(
        'AssetLinkingHandler: DatabaseContextService indisponível — abortado (fail-closed)',
      );
      return;
    }

    try {
      const work = () => this.assetLinking.processUpload(event.payload);
      await this.dbContext.runInTenantContext(
        { tenantId, orgId: null, role: null },
        work,
      );
    } catch (err) {
      // A falha já é persistida no skill_run; aqui apenas log técnico interno.
      this.logger.error(
        `Asset linking falhou para upload "${event.payload.uploadId}"`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
