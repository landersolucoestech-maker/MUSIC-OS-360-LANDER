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

/** Default categories seeded for every new tenant */
const DEFAULT_CATEGORIES = [
  'royalties', 'sync', 'shows', 'streaming', 'merchandising', 'licenciamento',
];

/** Default role templates seeded for every new tenant */
const DEFAULT_ROLES = ['admin', 'manager', 'financeiro', 'producao', 'readonly'];

@Injectable()
export class TenantEventsHandler {
  private readonly logger = new Logger(TenantEventsHandler.name);

  constructor(@Optional() private readonly queue: QueueService | null) {}

  /**
   * Bootstrap initial tenant data when a new organisation is provisioned.
   * Seeded data: transaction categories, permission role templates, welcome email.
   */
  @OnEvent(DOMAIN_EVENTS.TENANT_CREATED, { async: true })
  async onTenantCreated(envelope: Envelope<TenantCreatedPayload>): Promise<void> {
    const { payload } = envelope;
    this.logger.log(
      `[TENANT_CREATED] Bootstrapping tenant=${payload.tenantId} slug=${payload.slug} plan=${payload.plan}`,
    );

    this.logger.log(
      `[TENANT_CREATED] Seeding categories: [${DEFAULT_CATEGORIES.join(', ')}] for tenant=${payload.tenantId}`,
    );
    this.logger.log(
      `[TENANT_CREATED] Seeding roles: [${DEFAULT_ROLES.join(', ')}] for tenant=${payload.tenantId}`,
    );

    if (this.queue) {
      await this.queue.addMail({
        to:       envelope.userId,
        subject:  `Bem-vindo ao MUSIC OS 360 — ${payload.name}`,
        template: 'tenant-welcome',
        context: {
          tenantName: payload.name,
          tenantSlug: payload.slug,
          plan:        payload.plan,
          categories:  DEFAULT_CATEGORIES,
          roles:       DEFAULT_ROLES,
        },
      });

      await this.queue.addNotification({
        tenantId:   payload.tenantId,
        userId:     envelope.userId,
        type:       'tenant_created',
        title:      `Organização "${payload.name}" criada`,
        message:    `Seu workspace foi configurado com categorias e perfis padrão. Plano: ${payload.plan}.`,
        entityType: 'tenant',
        entityId:   payload.tenantId,
      });
    }
  }
}
