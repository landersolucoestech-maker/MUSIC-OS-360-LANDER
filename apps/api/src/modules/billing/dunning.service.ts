/**
 * billing/dunning.service.ts
 *
 * Dunning automation — checks past_due subscriptions on application bootstrap
 * and schedules a daily repeating BullMQ job via the dunning queue.
 *
 * Grace periods:
 *   Day  1–3:  no action (Stripe automatically retries)
 *   Day  4–7:  reminder notification via WebSocket
 *   Day  8–14: soft-suspend warning — block new resource creation
 *   Day 15+:   hard-suspend — downgrade to starter, mark org suspended
 */

import { Injectable, Logger, OnApplicationBootstrap, Inject, Optional } from '@nestjs/common';
import { InjectQueue }   from '@nestjs/bullmq';
import type { Queue }    from 'bullmq';
import { DataSource }    from 'typeorm';
import { DATA_SOURCE }   from '../../database/database.module';
import {
  BillingSubscriptionEntity,
  TenantEntity,
  OrganizationEntity,
} from '../../database/entities';
import { RealtimeService } from '../../core/realtime/realtime.service';
import { PLAN_FEATURES } from './billing.service';

const DUNNING_REMINDER_DAYS     = 4;
const DUNNING_SOFT_SUSPEND_DAYS = 8;
const DUNNING_HARD_SUSPEND_DAYS = 15;

/** daily in ms */
const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DunningService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DunningService.name);
  private intervalRef: ReturnType<typeof setInterval> | null = null;

  constructor(
    @Optional() @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly ws: RealtimeService,
    @Optional() @InjectQueue('notifications') private readonly notifQueue: Queue | null,
  ) {}

  onApplicationBootstrap(): void {
    // Run once at startup, then every 24h. Only runs when DB is available.
    if (!this.ds) return;

    // Parte 66: see ContractExpiryScheduler's identical guard — Vercel Cron
    // now triggers this via POST /internal/cron/dunning instead.
    if (process.env['VERCEL']) return;

    this.runDunningCycle().catch((err: unknown) =>
      this.logger.warn(`Dunning initial run falhou: ${String(err)}`),
    );

    this.intervalRef = setInterval(() => {
      this.runDunningCycle().catch((err: unknown) =>
        this.logger.warn(`Dunning cycle falhou: ${String(err)}`),
      );
    }, DAY_MS);
  }

  async runDunningCycle(): Promise<void> {
    if (!this.ds) return;

    const now = new Date();
    try {
      const pastDueSubs = await this.ds
        .getRepository(BillingSubscriptionEntity)
        .createQueryBuilder('s')
        .where('s.status = :status', { status: 'past_due' })
        .getMany();

      for (const sub of pastDueSubs) {
        await this.processDunningSub(sub as unknown as Record<string, unknown>, now);
      }

      if (pastDueSubs.length > 0) {
        this.logger.log(`Dunning cycle: processados ${pastDueSubs.length} subs past_due`);
      }
    } catch (err) {
      this.logger.error(`Dunning cycle falhou: ${String(err)}`);
    }
  }

  private async processDunningSub(sub: Record<string, unknown>, now: Date): Promise<void> {
    const updatedAt   = new Date(sub['updated_at'] as string);
    const daysPastDue = Math.floor((now.getTime() - updatedAt.getTime()) / (1000 * 60 * 60 * 24));
    const orgId       = sub['org_id'] as string;
    const tenantId    = await this.resolveTenantId(orgId);

    if (!tenantId) return;

    if (daysPastDue >= DUNNING_HARD_SUSPEND_DAYS) {
      await this.hardSuspend(sub, orgId, tenantId);
    } else if (daysPastDue >= DUNNING_SOFT_SUSPEND_DAYS) {
      await this.softSuspendWarning(orgId, tenantId, daysPastDue);
    } else if (daysPastDue >= DUNNING_REMINDER_DAYS) {
      await this.sendReminder(orgId, tenantId, daysPastDue);
    }
  }

  private async hardSuspend(sub: Record<string, unknown>, orgId: string, tenantId: string): Promise<void> {
    this.logger.warn(`Dunning HARD SUSPEND: org=${orgId} tenant=${tenantId}`);

    await this.ds!.getRepository(BillingSubscriptionEntity)
      .createQueryBuilder()
      .update()
      .set({ status: 'suspended', updated_at: new Date() } as any)
      .where('id = :id', { id: sub['id'] })
      .execute();

    await this.ds!.getRepository(TenantEntity)
      .createQueryBuilder()
      .update()
      .set({ plan: 'starter', features: PLAN_FEATURES.starter, active: false, updated_at: new Date() } as any)
      .where('org_id = :orgId', { orgId })
      .execute();

    await this.ds!.getRepository(OrganizationEntity)
      .createQueryBuilder()
      .update()
      .set({ plan: 'starter', billing_status: 'suspended', updated_at: new Date() } as any)
      .where('id = :orgId', { orgId })
      .execute();

    this.ws.sendToTenant(tenantId, 'billing:suspended', {
      org_id: orgId,
      message: 'Conta suspensa por inadimplência. Regularize o pagamento para reactivar o acesso.',
    });

    await this.enqueueEmail(tenantId, 'billing.hard_suspend', { orgId, tenantId });
  }

  private async softSuspendWarning(orgId: string, tenantId: string, days: number): Promise<void> {
    this.logger.warn(`Dunning SOFT SUSPEND WARNING: org=${orgId} day=${days}`);

    this.ws.sendToTenant(tenantId, 'billing:payment_warning', {
      org_id:  orgId,
      days_overdue: days,
      days_until_suspension: DUNNING_HARD_SUSPEND_DAYS - days,
      message: `Conta será suspensa em ${DUNNING_HARD_SUSPEND_DAYS - days} dia(s). Actualize o pagamento.`,
    });

    await this.enqueueEmail(tenantId, 'billing.soft_suspend_warning', {
      orgId, tenantId, daysPastDue: days,
      daysUntilSuspension: DUNNING_HARD_SUSPEND_DAYS - days,
    });
  }

  private async sendReminder(orgId: string, tenantId: string, days: number): Promise<void> {
    this.logger.log(`Dunning REMINDER: org=${orgId} day=${days}`);

    this.ws.sendToTenant(tenantId, 'billing:payment_reminder', {
      org_id:  orgId,
      days_overdue: days,
      message: `Pagamento em atraso há ${days} dia(s). Actualize o método de pagamento.`,
    });

    await this.enqueueEmail(tenantId, 'billing.payment_reminder', { orgId, tenantId, daysPastDue: days });
  }

  private async resolveTenantId(orgId: string): Promise<string | null> {
    try {
      const tenant = await this.ds!.getRepository(TenantEntity)
        .createQueryBuilder('t').select('t.id').where('t.org_id = :orgId', { orgId }).getOne();
      return tenant?.id ?? null;
    } catch {
      return null;
    }
  }

  private async enqueueEmail(tenantId: string, template: string, data: Record<string, unknown>): Promise<void> {
    if (!this.notifQueue) return;
    try {
      await this.notifQueue.add('email', { tenantId, template, data }, { attempts: 3 });
    } catch (err) {
      this.logger.warn(`Dunning: enqueue email ${template} falhou: ${String(err)}`);
    }
  }
}
