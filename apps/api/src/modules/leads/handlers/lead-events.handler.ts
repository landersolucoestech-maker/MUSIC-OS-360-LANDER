import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ArtistStatus, ArtistStatusCadastro } from '@music-os-360/types';
import { DATA_SOURCE } from '../../../database/database.module';
import { DatabaseContextService } from '../../../database/database-context.service';
import {
  ArtistEntity,
  ClientEntity,
  LeadEntity,
} from '../../../database/entities';
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
    @Optional() private readonly dbContext?: DatabaseContextService,
  ) {
    if (ds) {
      this.clientRepo = ds.getRepository(ClientEntity);
      this.leadRepo = ds.getRepository(LeadEntity);
      this.artistRepo = ds.getRepository(ArtistEntity);
    }
  }

  @OnEvent(DOMAIN_EVENTS.LEAD_CONVERTED)
  async onLeadConverted(event: DomainEvent<LeadConvertedPayload>): Promise<void> {
    const tenantId = event.tenantId ?? event.payload.tenantId;
    if (!tenantId) return this.failClosed(event.type);

    const { leadId, nome, empresa, convertedBy, convertedAt } = event.payload;
    let clientId: string | null = null;

    if (this.clientRepo || this.leadRepo || this.artistRepo) {
      await this.runInTenantContext(tenantId, async (manager) => {
        const clientRepo = manager ? manager.getRepository(ClientEntity) : this.clientRepo;
        const leadRepo = manager ? manager.getRepository(LeadEntity) : this.leadRepo;
        const artistRepo = manager ? manager.getRepository(ArtistEntity) : this.artistRepo;

        if (clientRepo) {
          try {
            const client = clientRepo.create({
              id: randomUUID(),
              tenant_id: tenantId,
              nome,
              segmento: null,
              tipo_pessoa: empresa ? 'pessoa_juridica' : 'pessoa_fisica',
              responsavel: convertedBy,
              observacoes: `Convertido de lead ${leadId} em ${convertedAt}`,
              metadata: {
                leadId,
                convertedAt,
                convertedBy,
                correlationId: event.correlationId ?? null,
              },
              created_by: event.userId ?? convertedBy,
            });
            const saved = await clientRepo.save(client);
            clientId = saved.id;
            this.logger.log(
              `LeadEventsHandler: client "${clientId}" created from lead "${leadId}" (${nome}) tenant=${tenantId}`,
            );
          } catch (err) {
            this.logger.error(
              `LeadEventsHandler: failed to create client from lead "${leadId}" - ${String(err)}`,
            );
          }
        }

        if (leadRepo && clientId) {
          try {
            await leadRepo.update(
              { id: leadId, tenant_id: tenantId },
              { cliente_id: clientId, status: 'convertido' as any },
            );
            this.logger.log(
              `LeadEventsHandler: lead "${leadId}" -> status=convertido, cliente_id="${clientId}"`,
            );
          } catch (err) {
            this.logger.error(
              `LeadEventsHandler: failed to update lead "${leadId}" with client link - ${String(err)}`,
            );
          }
        }

        if (artistRepo) {
          try {
            const artistId = randomUUID();
            const artist = artistRepo.create({
              id: artistId,
              tenant_id: tenantId,
              nome_artistico: nome,
              nome_civil: null,
              tipo: 'solo',
              status: ArtistStatus.EM_NEGOCIACAO,
              status_cadastro: ArtistStatusCadastro.ATIVO,
              observacoes: `Criado automaticamente a partir da conversão do lead "${leadId}" em ${convertedAt}`,
              metadata: {
                leadId,
                clientId,
                convertedAt,
                convertedBy,
                correlationId: event.correlationId ?? null,
                source: 'lead_conversion',
              },
              created_by: event.userId ?? convertedBy,
            });
            await artistRepo.save(artist);
            this.logger.log(
              `LeadEventsHandler: artist onboarding stub "${artistId}" created for lead "${leadId}" (${nome})`,
            );
          } catch (err) {
            this.logger.error(
              `LeadEventsHandler: failed to create artist onboarding for lead "${leadId}" - ${String(err)}`,
            );
          }
        }
      });
    }

    if (!this.queue || !clientId) return;
    try {
      await this.queue.addMail({
        template: 'lead-converted-welcome',
        clientId,
        nome,
        empresa: empresa ?? null,
        tenantId,
        correlationId: event.correlationId ?? null,
      });
    } catch (err) {
      this.logger.warn(
        `LeadEventsHandler: failed to enqueue welcome email for client "${clientId}" - ${String(err)}`,
      );
    }
  }

  private failClosed(eventType: string): void {
    this.logger.warn(`LeadEventsHandler: event "${eventType}" sem tenantId - abortado (fail-closed)`);
  }

  private runInTenantContext<T>(
    tenantId: string,
    work: (manager: EntityManager | undefined) => Promise<T>,
  ): Promise<T> {
    return this.dbContext
      ? this.dbContext.runInTenantContext({ tenantId, orgId: null, role: null }, work)
      : work(undefined);
  }
}
