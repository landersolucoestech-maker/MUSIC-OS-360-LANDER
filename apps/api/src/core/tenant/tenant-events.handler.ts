/**
 * tenant-events.handler.ts
 *
 * Bootstrap automation triggered when a new organisation/tenant is provisioned.
 *
 * TenantCreated →
 *   1. Enqueue seed-tenant-data job: creates default transaction categories.
 *   2. Enqueue seed-tenant-roles job: creates default permission role templates.
 *   3. Enqueue seed-tenant-templates job: creates default contract templates.
 *   4. Send welcome email to the provisioning user.
 *   5. Send in-app welcome notification.
 */

import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../events/events.service';
import type { TenantCreatedPayload } from '../events/domain-events.types';
import { QueueService } from '../queue/queue.service';

type Envelope<P> = {
  tenantId:      string;
  userId:        string;
  aggregateType: string;
  aggregateId:   string;
  payload:       P;
};

/** Default transaction categories seeded per tenant */
const DEFAULT_CATEGORIES = [
  { key: 'royalties',      label: 'Royalties',         tipo: 'receita' },
  { key: 'sync',           label: 'Sync Licensing',     tipo: 'receita' },
  { key: 'shows',          label: 'Shows / Eventos',    tipo: 'receita' },
  { key: 'streaming',      label: 'Streaming',          tipo: 'receita' },
  { key: 'merchandising',  label: 'Merchandising',      tipo: 'receita' },
  { key: 'licenciamento',  label: 'Licenciamento',      tipo: 'receita' },
  { key: 'producao',       label: 'Produção Musical',   tipo: 'despesa' },
  { key: 'marketing',      label: 'Marketing',          tipo: 'despesa' },
  { key: 'distribuicao',   label: 'Distribuição',       tipo: 'despesa' },
  { key: 'administrativo', label: 'Administrativo',     tipo: 'despesa' },
];

/** Default permission roles seeded per tenant */
const DEFAULT_ROLES = [
  { key: 'admin',     label: 'Administrador',    permissions: ['*'] },
  { key: 'manager',   label: 'Gestor',           permissions: ['read:*', 'write:*', 'delete:own'] },
  { key: 'financeiro',label: 'Financeiro',       permissions: ['read:*', 'write:accounting'] },
  { key: 'producao',  label: 'Produção',         permissions: ['read:catalog', 'write:catalog', 'read:releases'] },
  { key: 'readonly',  label: 'Somente Leitura',  permissions: ['read:*'] },
];

/** Default contract templates seeded per tenant */
const DEFAULT_TEMPLATES = [
  { key: 'exclusividade', label: 'Contrato de Exclusividade',     categoria: 'artista' },
  { key: 'sessao',        label: 'Contrato de Sessão',            categoria: 'artista' },
  { key: 'distribuicao',  label: 'Contrato de Distribuição',      categoria: 'distribuicao' },
  { key: 'sync',          label: 'Contrato de Licença Sync',      categoria: 'licenciamento' },
  { key: 'servicos',      label: 'Contrato de Prestação de Serviços', categoria: 'servicos' },
];

@Injectable()
export class TenantEventsHandler {
  private readonly logger = new Logger(TenantEventsHandler.name);

  constructor(@Optional() private readonly queue: QueueService | null) {}

  /**
   * Bootstrap initial tenant data when a new organisation is provisioned.
   * Enqueues concrete jobs for: transaction categories, role templates,
   * contract templates, and welcome communications.
   */
  @OnEvent(DOMAIN_EVENTS.TENANT_CREATED, { async: true })
  async onTenantCreated(envelope: Envelope<TenantCreatedPayload>): Promise<void> {
    const { payload } = envelope;
    this.logger.log(
      `[TENANT_CREATED] Bootstrapping tenant=${payload.tenantId} slug=${payload.slug} plan=${payload.plan}`,
    );

    if (!this.queue) {
      this.logger.warn('[TENANT_CREATED] QueueService unavailable — bootstrap jobs skipped');
      return;
    }

    // 1. Enqueue job: seed default transaction categories
    await this.queue.addNotification({
      job:        'seed-tenant-categories',
      tenantId:   payload.tenantId,
      categories: DEFAULT_CATEGORIES,
    }).catch((err: unknown) =>
      this.logger.error(`[TENANT_CREATED] Failed to enqueue seed-tenant-categories — ${String(err)}`),
    );

    // 2. Enqueue job: seed default permission role templates
    await this.queue.addNotification({
      job:      'seed-tenant-roles',
      tenantId: payload.tenantId,
      roles:    DEFAULT_ROLES,
    }).catch((err: unknown) =>
      this.logger.error(`[TENANT_CREATED] Failed to enqueue seed-tenant-roles — ${String(err)}`),
    );

    // 3. Enqueue job: seed default contract templates
    await this.queue.addNotification({
      job:       'seed-tenant-templates',
      tenantId:  payload.tenantId,
      templates: DEFAULT_TEMPLATES,
    }).catch((err: unknown) =>
      this.logger.error(`[TENANT_CREATED] Failed to enqueue seed-tenant-templates — ${String(err)}`),
    );

    // 4. Send welcome email to provisioning user
    await this.queue.addMail({
      to:       envelope.userId,
      subject:  `Bem-vindo ao MUSIC OS 360 — ${payload.name}`,
      template: 'tenant-welcome',
      context: {
        tenantName:       payload.name,
        tenantSlug:       payload.slug,
        plan:             payload.plan,
        categoriesCount:  DEFAULT_CATEGORIES.length,
        rolesCount:       DEFAULT_ROLES.length,
        templatesCount:   DEFAULT_TEMPLATES.length,
      },
    }).catch((err: unknown) =>
      this.logger.error(`[TENANT_CREATED] Failed to enqueue welcome email — ${String(err)}`),
    );

    // 5. In-app welcome notification
    await this.queue.addNotification({
      tenantId:   payload.tenantId,
      userId:     envelope.userId,
      type:       'tenant_created',
      title:      `Organização "${payload.name}" configurada`,
      message:    `Workspace criado com ${DEFAULT_CATEGORIES.length} categorias, ${DEFAULT_ROLES.length} perfis e ${DEFAULT_TEMPLATES.length} modelos de contrato. Plano: ${payload.plan}.`,
      entityType: 'tenant',
      entityId:   payload.tenantId,
    }).catch((err: unknown) =>
      this.logger.error(`[TENANT_CREATED] Failed to enqueue welcome notification — ${String(err)}`),
    );

    this.logger.log(
      `[TENANT_CREATED] All bootstrap jobs enqueued for tenant=${payload.tenantId} (${DEFAULT_CATEGORIES.length} categories, ${DEFAULT_ROLES.length} roles, ${DEFAULT_TEMPLATES.length} templates)`,
    );
  }
}
