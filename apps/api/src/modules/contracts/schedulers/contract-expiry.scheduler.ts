import { Injectable, Logger, OnApplicationBootstrap, Inject, Optional } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ContractEntity } from '../../../database/entities';
import { EventsService, DOMAIN_EVENTS } from '../../../core/events/events.service';
import { ContractStatus } from '@music-os-360/types';

const DAY_MS           = 24 * 60 * 60 * 1000;
const EXPIRY_WINDOW    = 30;   // days ahead to start alerting
const DEDUP_DAYS       = 7;    // minimum days between repeat notifications

@Injectable()
export class ContractExpiryScheduler implements OnApplicationBootstrap {
  private readonly logger = new Logger(ContractExpiryScheduler.name);
  private readonly repo: Repository<ContractEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    @Optional() private readonly events: EventsService,
  ) {
    if (ds) this.repo = ds.getRepository(ContractEntity);
  }

  onApplicationBootstrap(): void {
    if (!this.repo || !this.events) return;

    this.runCheck().catch((err: unknown) =>
      this.logger.warn(`ContractExpiryScheduler initial run failed: ${String(err)}`),
    );

    setInterval(() => {
      this.runCheck().catch((err: unknown) =>
        this.logger.warn(`ContractExpiryScheduler daily run failed: ${String(err)}`),
      );
    }, DAY_MS);
  }

  async runCheck(): Promise<void> {
    if (!this.repo || !this.events) return;

    const now     = new Date();
    const horizon = new Date(now.getTime() + EXPIRY_WINDOW * DAY_MS);
    const dedupCutoff = new Date(now.getTime() - DEDUP_DAYS * DAY_MS);

    const contracts = await this.repo
      .createQueryBuilder('c')
      .where('c.data_fim IS NOT NULL')
      .andWhere('c.data_fim >= :now', { now })
      .andWhere('c.data_fim <= :horizon', { horizon })
      .andWhere('c.status IN (:...statuses)', {
        statuses: [ContractStatus.VIGENTE, ContractStatus.ASSINADO, ContractStatus.VENCENDO],
      })
      .andWhere('c.deleted_at IS NULL')
      .getMany();

    for (const contract of contracts) {
      const lastNotified = contract.metadata?.['expiry_notified_at'] as string | undefined;
      if (lastNotified && new Date(lastNotified) > dedupCutoff) continue;

      const dataFim  = contract.data_fim!;
      const daysLeft = Math.ceil((dataFim.getTime() - now.getTime()) / DAY_MS);

      try {
        this.events.emitTyped(DOMAIN_EVENTS.CONTRACT_EXPIRING_SOON, {
          tenantId:      contract.tenant_id,
          userId:        'system',
          aggregateType: 'contract',
          aggregateId:   contract.id,
          payload: {
            contractId: contract.id,
            tenantId:   contract.tenant_id,
            titulo:     contract.titulo,
            artistId:   contract.artista_id,
            dataFim:    dataFim.toISOString(),
            daysLeft,
          },
        });

        await this.repo
          .createQueryBuilder()
          .update(ContractEntity)
          .set({
            metadata:   { ...contract.metadata, expiry_notified_at: now.toISOString() },
            updated_at: now,
          } as any)
          .where('id = :id', { id: contract.id })
          .execute();

        this.logger.log(`ContractExpiryScheduler: notified "${contract.titulo}" (${contract.id}) — ${daysLeft} days left`);
      } catch (err) {
        this.logger.warn(`ContractExpiryScheduler: failed for "${contract.id}" — ${String(err)}`);
      }
    }
  }
}
