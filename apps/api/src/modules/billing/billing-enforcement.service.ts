import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { AuditService } from '../../core/audit/audit.service';

export type TenantBillingStatus =
  | 'active'
  | 'trial'
  | 'payment_grace'
  | 'read_only'
  | 'suspended'
  | 'cancelled';

export interface TenantBillingState {
  id: string;
  tenant_id: string;
  status: TenantBillingStatus;
  last_payment_at: Date | null;
  next_payment_at: Date | null;
  grace_until: Date | null;
  suspended_at: Date | null;
  manual_override: boolean;
  manual_override_reason: string | null;
  manual_override_until: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface BillingEnforcementSettings {
  grace_period_days: number;
  read_only_after_days: number;
  suspend_after_days: number;
  billing_warning_emails: boolean;
  billing_retry_emails: boolean;
  max_payment_attempts: number;
  manual_override_allowed: boolean;
  manual_override_max_days: number;
}

const DEFAULT_SETTINGS: BillingEnforcementSettings = {
  grace_period_days: 3,
  read_only_after_days: 4,
  suspend_after_days: 15,
  billing_warning_emails: true,
  billing_retry_emails: true,
  max_payment_attempts: 4,
  manual_override_allowed: true,
  manual_override_max_days: 30,
};

function addDays(base: Date, days: number): Date {
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function normalizeSettings(value: unknown): BillingEnforcementSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    grace_period_days: Number(raw['grace_period_days'] ?? DEFAULT_SETTINGS.grace_period_days),
    read_only_after_days: Number(raw['read_only_after_days'] ?? DEFAULT_SETTINGS.read_only_after_days),
    suspend_after_days: Number(raw['suspend_after_days'] ?? DEFAULT_SETTINGS.suspend_after_days),
    billing_warning_emails: raw['billing_warning_emails'] !== false,
    billing_retry_emails: raw['billing_retry_emails'] !== false,
    max_payment_attempts: Number(raw['max_payment_attempts'] ?? DEFAULT_SETTINGS.max_payment_attempts),
    manual_override_allowed: raw['manual_override_allowed'] !== false,
    manual_override_max_days: Number(raw['manual_override_max_days'] ?? DEFAULT_SETTINGS.manual_override_max_days),
  };
}

@Injectable()
export class BillingEnforcementService {
  private readonly logger = new Logger(BillingEnforcementService.name);

  constructor(
    @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly audit: AuditService,
  ) {}

  private assertDb(): DataSource {
    if (!this.ds) throw new ServiceUnavailableException('Billing enforcement persistence unavailable');
    return this.ds;
  }

  async getSettings(): Promise<BillingEnforcementSettings> {
    if (!this.ds) return DEFAULT_SETTINGS;
    const rows = await this.ds.query(
      `SELECT value FROM billing_settings WHERE key = $1 LIMIT 1`,
      ['default_enforcement'],
    ) as Array<{ value: unknown }>;
    return normalizeSettings(rows[0]?.value);
  }

  async ensureState(tenantId: string): Promise<TenantBillingState> {
    const ds = this.assertDb();
    await ds.query(
      `INSERT INTO tenant_billing_state (tenant_id, status)
       VALUES ($1, 'trial')
       ON CONFLICT (tenant_id) DO NOTHING`,
      [tenantId],
    );
    return this.getState(tenantId) as Promise<TenantBillingState>;
  }

  async getState(tenantId: string): Promise<TenantBillingState | null> {
    if (!this.ds) return null;
    const rows = await this.ds.query(
      `SELECT * FROM tenant_billing_state WHERE tenant_id = $1 LIMIT 1`,
      [tenantId],
    ) as TenantBillingState[];
    const state = rows[0] ?? null;
    if (!state) return null;
    return this.applyOverrideAndEscalation(state);
  }

  async findTenantIdByStripe(params: {
    customerId?: string | null;
    subscriptionId?: string | null;
    tenantId?: string | null;
  }): Promise<string | null> {
    if (params.tenantId) return params.tenantId;
    if (!this.ds) return null;
    const rows = await this.ds.query(
      `SELECT tenant_id
         FROM billing_subscriptions
        WHERE ($1::varchar IS NOT NULL AND stripe_customer_id = $1)
           OR ($2::varchar IS NOT NULL AND (stripe_subscription_id = $2 OR stripe_sub_id = $2))
        LIMIT 1`,
      [params.customerId ?? null, params.subscriptionId ?? null],
    ) as Array<{ tenant_id: string | null }>;
    return rows[0]?.tenant_id ?? null;
  }

  async recordWebhookProcessed(input: {
    tenantId: string | null;
    stripeEventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<'inserted' | 'duplicate'> {
    const ds = this.assertDb();
    const result = await ds.query(
      `INSERT INTO payment_events (stripe_event_id, tenant_id, event_type, payload, processed_at)
       VALUES ($1, $2, $3, $4::jsonb, now())
       ON CONFLICT (stripe_event_id) DO NOTHING
       RETURNING id`,
      [
        input.stripeEventId,
        input.tenantId,
        input.eventType,
        JSON.stringify(input.payload),
      ],
    ) as Array<{ id: string }>;
    return result.length > 0 ? 'inserted' : 'duplicate';
  }

  async startPaymentGrace(tenantId: string, reason: string, now = new Date()): Promise<TenantBillingState> {
    const ds = this.assertDb();
    const settings = await this.getSettings();
    const graceUntil = addDays(now, settings.grace_period_days);
    const before = await this.getState(tenantId);

    await ds.query(
      `UPDATE billing_subscriptions
          SET status = 'past_due',
              grace_until = $2,
              updated_at = now()
        WHERE tenant_id = $1`,
      [tenantId, graceUntil],
    );
    const rows = await ds.query(
      `INSERT INTO tenant_billing_state (tenant_id, status, grace_until)
       VALUES ($1, 'payment_grace', $2)
       ON CONFLICT (tenant_id)
       DO UPDATE SET
         status = CASE
           WHEN tenant_billing_state.manual_override = true
            AND tenant_billing_state.manual_override_until IS NOT NULL
            AND tenant_billing_state.manual_override_until > now()
           THEN tenant_billing_state.status
           ELSE 'payment_grace'
         END,
         grace_until = $2,
         updated_at = now()
       RETURNING *`,
      [tenantId, graceUntil],
    ) as TenantBillingState[];
    const after = rows[0];
    await this.auditStateChange('billing.grace_started', tenantId, before, after, reason);
    return after;
  }

  async activateTenant(tenantId: string, reason: string, now = new Date()): Promise<TenantBillingState> {
    const ds = this.assertDb();
    const before = await this.getState(tenantId);
    await ds.query(
      `UPDATE billing_subscriptions
          SET status = 'active',
              grace_until = NULL,
              suspended_at = NULL,
              resumed_at = $2,
              updated_at = now()
        WHERE tenant_id = $1`,
      [tenantId, now],
    );
    const rows = await ds.query(
      `INSERT INTO tenant_billing_state (
         tenant_id, status, last_payment_at, grace_until, suspended_at, manual_override,
         manual_override_reason, manual_override_until
       )
       VALUES ($1, 'active', $2, NULL, NULL, false, NULL, NULL)
       ON CONFLICT (tenant_id)
       DO UPDATE SET
         status = 'active',
         last_payment_at = $2,
         grace_until = NULL,
         suspended_at = NULL,
         manual_override = false,
         manual_override_reason = NULL,
         manual_override_until = NULL,
         updated_at = now()
       RETURNING *`,
      [tenantId, now],
    ) as TenantBillingState[];
    const after = rows[0];
    await this.auditStateChange('tenant.reactivated', tenantId, before, after, reason);
    return after;
  }

  async cancelTenant(tenantId: string, reason: string): Promise<TenantBillingState> {
    const before = await this.getState(tenantId);
    const rows = await this.assertDb().query(
      `INSERT INTO tenant_billing_state (tenant_id, status)
       VALUES ($1, 'cancelled')
       ON CONFLICT (tenant_id)
       DO UPDATE SET status = 'cancelled', updated_at = now()
       RETURNING *`,
      [tenantId],
    ) as TenantBillingState[];
    const after = rows[0];
    await this.auditStateChange('subscription.cancelled', tenantId, before, after, reason);
    return after;
  }

  async suspendTenant(tenantId: string, reason: string, now = new Date()): Promise<TenantBillingState> {
    const ds = this.assertDb();
    const before = await this.getState(tenantId);
    await ds.query(
      `UPDATE billing_subscriptions
          SET suspended_at = COALESCE(suspended_at, $2),
              updated_at = now()
        WHERE tenant_id = $1`,
      [tenantId, now],
    );
    const rows = await ds.query(
      `INSERT INTO tenant_billing_state (tenant_id, status, suspended_at)
       VALUES ($1, 'suspended', $2)
       ON CONFLICT (tenant_id)
       DO UPDATE SET status = 'suspended',
                     suspended_at = COALESCE(tenant_billing_state.suspended_at, $2),
                     updated_at = now()
       RETURNING *`,
      [tenantId, now],
    ) as TenantBillingState[];
    const after = rows[0];
    await this.auditStateChange('tenant.suspended', tenantId, before, after, reason);
    return after;
  }

  async applyManualOverride(input: {
    tenantId: string;
    status: TenantBillingStatus;
    reason: string;
    until: Date;
    userId?: string | null;
    ip?: string | null;
  }): Promise<TenantBillingState> {
    const settings = await this.getSettings();
    if (!settings.manual_override_allowed) {
      throw new ServiceUnavailableException('Manual billing override is disabled');
    }
    const maxUntil = addDays(new Date(), settings.manual_override_max_days);
    const until = input.until > maxUntil ? maxUntil : input.until;
    const before = await this.getState(input.tenantId);
    const rows = await this.assertDb().query(
      `INSERT INTO tenant_billing_state (
         tenant_id, status, manual_override, manual_override_reason, manual_override_until
       )
       VALUES ($1, $2, true, $3, $4)
       ON CONFLICT (tenant_id)
       DO UPDATE SET status = $2,
                     manual_override = true,
                     manual_override_reason = $3,
                     manual_override_until = $4,
                     updated_at = now()
       RETURNING *`,
      [input.tenantId, input.status, input.reason, until],
    ) as TenantBillingState[];
    const after = rows[0];
    await this.audit.log({
      tenantId: input.tenantId,
      userId: input.userId ?? 'billing:system',
      actorRole: input.userId ? 'admin' : 'system',
      action: 'billing.override_enabled',
      entity: 'billing',
      entityId: input.tenantId,
      before,
      after,
      ip: input.ip ?? null,
    });
    return after;
  }

  async removeManualOverride(tenantId: string, reason: string, userId?: string | null): Promise<TenantBillingState> {
    const before = await this.getState(tenantId);
    const rows = await this.assertDb().query(
      `UPDATE tenant_billing_state
          SET manual_override = false,
              manual_override_reason = NULL,
              manual_override_until = NULL,
              updated_at = now()
        WHERE tenant_id = $1
        RETURNING *`,
      [tenantId],
    ) as TenantBillingState[];
    const after = rows[0] ?? await this.ensureState(tenantId);
    await this.audit.log({
      tenantId,
      userId: userId ?? 'billing:system',
      actorRole: userId ? 'admin' : 'system',
      action: 'billing.override_disabled',
      entity: 'billing',
      entityId: tenantId,
      before,
      after,
      metadata: { reason },
    } as any);
    return this.applyOverrideAndEscalation(after);
  }

  async applyOverrideAndEscalation(state: TenantBillingState, now = new Date()): Promise<TenantBillingState> {
    if (state.manual_override && state.manual_override_until && new Date(state.manual_override_until) > now) {
      return state;
    }
    if (state.status !== 'payment_grace' && state.status !== 'read_only') {
      if (state.manual_override && state.manual_override_until && new Date(state.manual_override_until) <= now) {
        return this.removeManualOverride(state.tenant_id, 'manual override expired');
      }
      return state;
    }

    const settings = await this.getSettings();
    const graceUntil = state.grace_until ? new Date(state.grace_until) : null;
    if (!graceUntil) return state;

    const suspendAt = addDays(graceUntil, Math.max(0, settings.suspend_after_days - settings.grace_period_days));
    if (now >= suspendAt) {
      return this.suspendTenant(state.tenant_id, 'billing grace and read-only windows expired', now);
    }
    if (now > graceUntil && state.status !== 'read_only') {
      const before = state;
      const rows = await this.assertDb().query(
        `UPDATE tenant_billing_state
            SET status = 'read_only', updated_at = now()
          WHERE tenant_id = $1
          RETURNING *`,
        [state.tenant_id],
      ) as TenantBillingState[];
      const after = rows[0];
      await this.auditStateChange('billing.read_only', state.tenant_id, before, after, 'payment grace expired');
      return after;
    }
    return state;
  }

  private async auditStateChange(
    action: string,
    tenantId: string,
    before: unknown,
    after: unknown,
    reason: string,
  ): Promise<void> {
    await this.audit.log({
      tenantId,
      userId: 'billing:system',
      actorRole: 'system',
      action,
      entity: 'billing',
      entityId: tenantId,
      before,
      after,
      metadata: { reason },
    } as any);
    this.logger.log(`${action}: tenant=${tenantId} reason=${reason}`);
  }
}
