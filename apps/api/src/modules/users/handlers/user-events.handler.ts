import { Injectable, Logger, Optional } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { UserInvitedPayload } from '../../../core/events/domain-events.types';
import { QueueService } from '../../../core/queue/queue.service';

type Envelope<P> = {
  tenantId:      string;
  userId:        string;
  aggregateType: string;
  aggregateId:   string;
  payload:       P;
};

@Injectable()
export class UserEventsHandler {
  private readonly logger = new Logger(UserEventsHandler.name);

  constructor(@Optional() private readonly queue: QueueService | null) {}

  /** Send invite email + create in-app welcome notification */
  @OnEvent(DOMAIN_EVENTS.USER_INVITED, { async: true })
  async onUserInvited(envelope: Envelope<UserInvitedPayload>): Promise<void> {
    const { payload } = envelope;
    this.logger.log(
      `[USER_INVITED] email=${payload.email} role=${payload.role} tenant=${payload.tenantId}`,
    );

    if (this.queue) {
      await this.queue.addMail({
        to:       payload.email,
        subject:  'Você foi convidado para o MUSIC OS 360',
        template: 'user-invite',
        context: {
          email:     payload.email,
          role:      payload.role,
          invitedBy: payload.invitedBy,
          tenantId:  payload.tenantId,
        },
      });

      await this.queue.addNotification({
        tenantId:  payload.tenantId,
        userId:    payload.userId,
        type:      'user_invited',
        title:     'Bem-vindo ao MUSIC OS 360',
        message:   `Você foi convidado como ${payload.role}. Acesse sua conta para começar.`,
        entityType: 'user',
        entityId:   payload.userId,
      });
    }
  }
}
