import { Injectable } from '@nestjs/common';
import { RegistrableEntityType, SocietyName } from '@music-os-360/types';
import { SocietyPayloadBuilderService } from './society-payload-builder.service';
import type { RegistryPayload } from './registry-payload.types';

/**
 * ABRAMUS-specific payload envelope. Wraps the generic registry payload with the
 * society + schema metadata that an export / future submission expects. Returns
 * a plain serialisable object (snapshot-ready).
 */
@Injectable()
export class AbramusPayloadBuilderService {
  static readonly SCHEMA_VERSION = '1.0';

  constructor(private readonly generic: SocietyPayloadBuilderService) {}

  async build(
    tenantId: string,
    entityType: RegistrableEntityType,
    entityId: string,
  ): Promise<Record<string, unknown>> {
    const payload = await this.buildGeneric(tenantId, entityType, entityId);
    return {
      society: SocietyName.ABRAMUS,
      schema_version: AbramusPayloadBuilderService.SCHEMA_VERSION,
      entity_type: entityType,
      entity_id: entityId,
      generated_at: new Date().toISOString(),
      payload: payload as unknown as Record<string, unknown>,
    };
  }

  private async buildGeneric(tenantId: string, entityType: RegistrableEntityType, entityId: string): Promise<RegistryPayload> {
    if (entityType === RegistrableEntityType.WORK) {
      return this.generic.buildWorkPayload(tenantId, entityId);
    }
    return this.generic.buildRecordingPayload(tenantId, entityId);
  }
}
