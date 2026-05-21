/**
 * lead-events.handler.ts
 *
 * Concrete automations triggered by lead domain events.
 *
 * LeadConverted →
 *   1. Create ClientEntity from lead data (CRM conversion).
 *   2. Update LeadEntity.status = 'convertido' + store client_id link.
 *   3. Create ArtistEntity (onboarding stub) for the new client.
 *   4. Enqueue welcome email to new client.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import {
  ClientEntity,
  LeadEntity,
  ArtistEntity,
} from '../../../database/entities';
import { ArtistStatus, ArtistStatusCadastro } from '@music-os-360/types';
import { QueueService } from '../../../core/queue/queue.service';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { DomainEvent } from '../../../core/events/events.service';
import type { LeadConvertedPayload } from '../../../core/events/domain-events.types';

@Injectable()
export class LeadEventsHandler {
  private readonly logger = new Logger(LeadEventsHandler.name);
  private readonly clientRepo: Repository<ClientEntity> | null = null;
  private readonly leadRepo: Repository<LeadEntity> | null = null;
  private readonly artistRepo: Repository<ArtistEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly queue: QueueService,
  ) {
    if (ds) {
      this.clientRepo = ds.getRepository(ClientEntity);
      this.leadRepo   = ds.getRepository(LeadEntity);
      this.artistRepo = ds.getRepository(ArtistEntity);
    }
  }

  @OnEvent(DOMAIN_EVENTS.LEAD_CONVERTED)
  async onLeadConverted(event: DomainEvent<LeadConvertedPayload>): Promise<void> {
    const { leadId, tenantId, nome, empresa, convertedBy, convertedAt } = event.payload;

    let clientId: string | null = null;

    // 1. Create ClientEntity from lead data
    if (this.clientRepo) {
      try {
        const client = this.clientRepo.create({
          id:             randomUUID(),
          tenant_id:      tenantId,
          nome,
          segmento:       null,
          tipo_pessoa:    empresa ? 'pessoa_juridica' : 'pessoa_fisica',
          responsavel:    convertedBy,
          observacoes:    `Convertido de lead ${leadId} em ${convertedAt}`,
          metadata: {
            leadId,
            convertedAt,
            convertedBy,
            correlationId: event.correlationId ?? null,
          },
          created_by: event.userId ?? convertedBy,
        });
        const saved = await this.clientRepo.save(client);
        clientId = saved.id;
        this.logger.log(
          `LeadEventsHandler: client "${clientId}" created from lead "${leadId}" (${nome}) tenant=${tenantId}`,
        );
      } catch (err) {
        this.logger.error(
          `LeadEventsHandler: failed to create client from lead "${leadId}" — ${String(err)}`,
        );
      }
    }

    // 2. Update LeadEntity — link cliente_id + mark convertido
    if (this.leadRepo && clientId) {
      try {
        await this.leadRepo.update(
          { id: leadId, tenant_id: tenantId },
          { cliente_id: clientId, status: 'convertido' as any },
        );
        this.logger.log(
          `LeadEventsHandler: lead "${leadId}" → status=convertido, cliente_id="${clientId}"`,
        );
      } catch (err) {
        this.logger.error(
          `LeadEventsHandler: failed to update lead "${leadId}" with client link — ${String(err)}`,
        );
      }
    }

    // 3. Create ArtistEntity onboarding stub so the client appears in artist roster
    if (this.artistRepo) {
      try {
        const artistId = randomUUID();
        const artist = this.artistRepo.create({
          id:              artistId,
          tenant_id:       tenantId,
          nome_artistico:  nome,
          nome_civil:      null,
          tipo:            'solo',
          status:          ArtistStatus.EM_NEGOCIACAO,
          status_cadastro: ArtistStatusCadastro.ATIVO,
          observacoes:     `Criado automaticamente a partir da conversão do lead "${leadId}" em ${convertedAt}`,
          metadata: {
            leadId,
            clientId,
            convertedAt,
            convertedBy,
            correlationId: event.correlationId ?? null,
            source:        'lead_conversion',
          },
          created_by: event.userId ?? convertedBy,
        });
        await this.artistRepo.save(artist);
        this.logger.log(
          `LeadEventsHandler: artist onboarding stub "${artistId}" created for lead "${leadId}" (${nome})`,
        );
      } catch (err) {
        this.logger.error(
          `LeadEventsHandler: failed to create artist onboarding for lead "${leadId}" — ${String(err)}`,
        );
      }
    }

    // 4. Enqueue welcome email to new client
    if (this.queue && clientId) {
      try {
        await this.queue.addMail({
          template:      'lead-converted-welcome',
          clientId,
          nome,
          empresa:       empresa ?? null,
          tenantId,
          correlationId: event.correlationId ?? null,
        });
      } catch (err) {
        this.logger.warn(
          `LeadEventsHandler: failed to enqueue welcome email for client "${clientId}" — ${String(err)}`,
        );
      }
    }
  }
}
