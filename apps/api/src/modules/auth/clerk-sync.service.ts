/**
 * modules/auth/clerk-sync.service.ts
 *
 * Sincronização automática de organizações e utilizadores Clerk → Neon PostgreSQL.
 * Adaptado para Drizzle ORM (sem Prisma).
 *
 * Eventos tratados:
 *   organization.created         → cria/actualiza tenant
 *   organization.updated         → actualiza nome do tenant
 *   organizationMembership.created  → cria/actualiza user no tenant
 *   organizationMembership.deleted  → desactiva user no tenant
 *   user.deleted                 → desactiva todos os membros do user
 */

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

    const existing = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.clerkOrgId, clerkOrgId))
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(schema.tenants)
        .set({ name, updatedAt: new Date() })
        .where(eq(schema.tenants.clerkOrgId, clerkOrgId));
    } else {
      await this.db.insert(schema.tenants).values({
        name,
        slug,
        clerkOrgId,
        plan:   'starter',
        active: true,
      });
    }

    this.logger.log(`Org sincronizada: ${name} (${clerkOrgId})`);
  }

  // ─── Organização actualizada ───────────────────────────────────────────────

  private async onOrgUpdated(data: Record<string, unknown>): Promise<void> {
    const clerkOrgId = String(data['id'] ?? '');
    const name       = String(data['name'] ?? '');

    await this.db
      .update(schema.tenants)
      .set({ name, updatedAt: new Date() })
      .where(eq(schema.tenants.clerkOrgId, clerkOrgId));

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
    const orgRole        = clerkRole === 'org:admin' ? 'admin' : 'viewer';

    const [tenant] = await this.db
      .select()
      .from(schema.tenants)
      .where(eq(schema.tenants.clerkOrgId, clerkOrgId))
      .limit(1);

    if (!tenant) {
      this.logger.warn(`Tenant não encontrado para org ${clerkOrgId}`);
      return;
    }

    const existing = await this.db
      .select()
      .from(schema.users)
      .where(
        and(
          eq(schema.users.tenantId, tenant.id),
          eq(schema.users.clerkId, clerkUserId),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await this.db
        .update(schema.users)
        .set({ orgRole, isActive: true, updatedAt: new Date() })
        .where(
          and(
            eq(schema.users.tenantId, tenant.id),
            eq(schema.users.clerkId, clerkUserId),
          ),
        );
    } else {
      await this.db.insert(schema.users).values({
        tenantId: tenant.id,
        clerkId:  clerkUserId,
        email,
        fullName,
        role:     'user',
        orgRole,
        isActive: true,
        status:   'active',
      });
    }

    this.logger.log(`Membro sincronizado: ${email} → tenant ${tenant.name} (${orgRole})`);
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
      .where(eq(schema.tenants.clerkOrgId, clerkOrgId))
      .limit(1);

    if (!tenant) return;

    await this.db
      .update(schema.users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(schema.users.tenantId, tenant.id),
          eq(schema.users.clerkId, clerkUserId),
        ),
      );

    this.logger.log(`Membro desactivado: ${clerkUserId} no tenant ${tenant.name}`);
  }

  // ─── User eliminado ───────────────────────────────────────────────────────

  private async onUserDeleted(data: Record<string, unknown>): Promise<void> {
    const clerkUserId = String(data['id'] ?? '');

    await this.db
      .update(schema.users)
      .set({ isActive: false, status: 'deleted', updatedAt: new Date() })
      .where(eq(schema.users.clerkId, clerkUserId));

    this.logger.log(`User eliminado: ${clerkUserId}`);
  }
}
