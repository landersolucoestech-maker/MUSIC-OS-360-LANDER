import { Injectable, Logger, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import * as schema from '../../database/schema';
import { DRIZZLE_DB } from '../../database/database.module';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

@Injectable()
export class ClerkSyncService {
  private readonly logger = new Logger(ClerkSyncService.name);

  constructor(
    @Inject(DRIZZLE_DB)
    private readonly db: NodePgDatabase<typeof schema>,
  ) {}

  async process(event: Record<string, unknown>): Promise<void> {
    switch (event['type']) {
      case 'organization.created':
        await this.onOrgCreated(event['data'] as Record<string, unknown>);
        break;
      case 'organization.updated':
        await this.onOrgUpdated(event['data'] as Record<string, unknown>);
        break;
      case 'organizationMembership.created':
        await this.onMemberAdded(event['data'] as Record<string, unknown>);
        break;
      case 'organizationMembership.deleted':
        await this.onMemberRemoved(event['data'] as Record<string, unknown>);
        break;
      case 'user.deleted':
        await this.onUserDeleted(event['data'] as Record<string, unknown>);
        break;
      default:
        this.logger.debug(`Evento Clerk ignorado: ${String(event['type'])}`);
    }
  }

  // ─── Organização criada ────────────────────────────────────────────────────

  private async onOrgCreated(data: Record<string, unknown>): Promise<void> {
    const clerkOrgId = String(data['id'] ?? '');
    const name       = String(data['name'] ?? '');
    const rawSlug    = String(data['slug'] ?? slugify(name));
    const slug       = rawSlug.slice(0, 90) || `org-${Date.now()}`;

    // 1. Upsert organizations
    const existingOrg = await this.db
      .select()
      .from(schema.organizations)
      .where(eq(schema.organizations.clerk_org_id, clerkOrgId))
      .limit(1);

    let orgId: string;

    if (existingOrg.length > 0) {
      orgId = existingOrg[0].id;
      await this.db
        .update(schema.organizations)
        .set({ name, updated_at: new Date() })
        .where(eq(schema.organizations.clerk_org_id, clerkOrgId));
    } else {
      const [newOrg] = await this.db
        .insert(schema.organizations)
        .values({ clerk_org_id: clerkOrgId, name, slug, plan: 'starter', billing_status: 'trial' })
        .returning({ id: schema.organizations.id });
      orgId = newOrg.id;
    }

    // 2. Upsert tenants (linked to organization)
    const existingTenant = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.clerk_org_id, clerkOrgId))
      .limit(1);

    let tenantId: string;

    if (existingTenant.length > 0) {
      tenantId = existingTenant[0].id;
      await this.db
        .update(schema.tenants)
        .set({ name, updated_at: new Date() })
        .where(eq(schema.tenants.clerk_org_id, clerkOrgId));
    } else {
      const [newTenant] = await this.db
        .insert(schema.tenants)
        .values({ org_id: orgId, clerk_org_id: clerkOrgId, name, slug, plan: 'starter', features: {}, active: true })
        .returning({ id: schema.tenants.id });
      tenantId = newTenant.id;
    }

    // 3. Upsert billing_subscriptions
    const existingBilling = await this.db
      .select()
      .from(schema.billingSubscriptions)
      .where(eq(schema.billingSubscriptions.org_id, orgId))
      .limit(1);

    if (existingBilling.length === 0) {
      await this.db.insert(schema.billingSubscriptions).values({
        org_id:             orgId,
        stripe_customer_id: `pending_${orgId}`,
        plan:               'starter',
        status:             'trial',
        seats:              3,
        seats_used:         0,
      });
    }

    this.logger.log(`Org sincronizada: ${name} (${clerkOrgId}) → org=${orgId} tenant=${tenantId}`);
  }

  // ─── Organização actualizada ───────────────────────────────────────────────

  private async onOrgUpdated(data: Record<string, unknown>): Promise<void> {
    const clerkOrgId = String(data['id'] ?? '');
    const name       = String(data['name'] ?? '');

    await this.db
      .update(schema.organizations)
      .set({ name, updated_at: new Date() })
      .where(eq(schema.organizations.clerk_org_id, clerkOrgId));

    await this.db
      .update(schema.tenants)
      .set({ name, updated_at: new Date() })
      .where(eq(schema.tenants.clerk_org_id, clerkOrgId));

    this.logger.log(`Org actualizada: ${name}`);
  }

  // ─── Membro adicionado ─────────────────────────────────────────────────────

  private async onMemberAdded(data: Record<string, unknown>): Promise<void> {
    const org            = data['organization'] as Record<string, unknown>;
    const publicUserData = data['public_user_data'] as Record<string, unknown>;
    const clerkOrgId     = String(org?.['id'] ?? '');
    const clerkUserId    = String(publicUserData?.['user_id'] ?? '');
    const email          = String(publicUserData?.['identifier'] ?? '');
    const firstName      = String(publicUserData?.['first_name'] ?? '');
    const lastName       = String(publicUserData?.['last_name'] ?? '');
    const fullName       = `${firstName} ${lastName}`.trim() || email;
    const clerkRole      = String(data['role'] ?? 'org:member');
    const role           = clerkRole === 'org:admin' ? 'admin' : 'viewer';

    // 1. Find tenant by clerk_org_id
    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.clerk_org_id, clerkOrgId))
      .limit(1);

    if (!tenant) {
      this.logger.warn(`Tenant não encontrado para org ${clerkOrgId}`);
      return;
    }

    // 2. Upsert org_members
    const existingMember = await this.db
      .select()
      .from(schema.orgMembers)
      .where(
        and(
          eq(schema.orgMembers.tenant_id, tenant.id),
          eq(schema.orgMembers.clerk_user_id, clerkUserId),
        ),
      )
      .limit(1);

    if (existingMember.length > 0) {
      await this.db
        .update(schema.orgMembers)
        .set({ role, is_active: true, updated_at: new Date() })
        .where(
          and(
            eq(schema.orgMembers.tenant_id, tenant.id),
            eq(schema.orgMembers.clerk_user_id, clerkUserId),
          ),
        );
    } else {
      await this.db.insert(schema.orgMembers).values({
        org_id:        tenant.org_id,
        tenant_id:     tenant.id,
        clerk_user_id: clerkUserId,
        email,
        full_name:     fullName,
        role,
        is_active:     true,
        joined_at:     new Date(),
      });
    }

    // 3. Increment seats_used in billing_subscriptions
    const [billing] = await this.db
      .select()
      .from(schema.billingSubscriptions)
      .where(eq(schema.billingSubscriptions.org_id, tenant.org_id))
      .limit(1);

    if (billing && existingMember.length === 0) {
      await this.db
        .update(schema.billingSubscriptions)
        .set({ seats_used: (billing.seats_used ?? 0) + 1, updated_at: new Date() })
        .where(eq(schema.billingSubscriptions.org_id, tenant.org_id));
    }

    this.logger.log(`Membro sincronizado: ${email} → tenant ${tenant.name} (${role})`);
  }

  // ─── Membro removido ──────────────────────────────────────────────────────

  private async onMemberRemoved(data: Record<string, unknown>): Promise<void> {
    const org            = data['organization'] as Record<string, unknown>;
    const publicUserData = data['public_user_data'] as Record<string, unknown>;
    const clerkOrgId     = String(org?.['id'] ?? '');
    const clerkUserId    = String(publicUserData?.['user_id'] ?? '');

    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.clerk_org_id, clerkOrgId))
      .limit(1);

    if (!tenant) return;

    await this.db
      .update(schema.orgMembers)
      .set({ is_active: false, updated_at: new Date() })
      .where(
        and(
          eq(schema.orgMembers.tenant_id, tenant.id),
          eq(schema.orgMembers.clerk_user_id, clerkUserId),
        ),
      );

    // Decrement seats_used
    const [billing] = await this.db
      .select()
      .from(schema.billingSubscriptions)
      .where(eq(schema.billingSubscriptions.org_id, tenant.org_id))
      .limit(1);

    if (billing && (billing.seats_used ?? 0) > 0) {
      await this.db
        .update(schema.billingSubscriptions)
        .set({ seats_used: (billing.seats_used ?? 1) - 1, updated_at: new Date() })
        .where(eq(schema.billingSubscriptions.org_id, tenant.org_id));
    }

    this.logger.log(`Membro desactivado: ${clerkUserId} no tenant ${tenant.name}`);
  }

  // ─── User eliminado ───────────────────────────────────────────────────────

  private async onUserDeleted(data: Record<string, unknown>): Promise<void> {
    const clerkUserId = String(data['id'] ?? '');

    await this.db
      .update(schema.orgMembers)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(schema.orgMembers.clerk_user_id, clerkUserId));

    this.logger.log(`User eliminado: ${clerkUserId}`);
  }
}
