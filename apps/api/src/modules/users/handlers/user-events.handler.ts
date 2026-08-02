import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENTS } from '../../../core/events/events.service';
import type { UserInvitedPayload } from '../../../core/events/domain-events.types';

type Envelope<P> = {
  tenantId:      string;
  userId:        string;
  aggregateType: string;
  aggregateId:   string;
  payload:       P;
};

/**
 * The in-app "user invited" notification is created generically by
 * core/events/notification.handler.ts (EVENT_MESSAGE[USER_INVITED]) — this
 * handler only logs. It used to also enqueue an invite email/notification
 * through a QueueService that was never registered as a provider anywhere
 * (dead code, silently a no-op in every environment). Sending a real invite
 * email needs an actual invite link/token, which nothing in the invite flow
 * generates yet — that's a real gap to wire up with EmailQueueService.enqueueInviteUserEmail,
 * not something to fake here.
 */
@Injectable()
export class UserEventsHandler {
  private readonly logger = new Logger(UserEventsHandler.name);

  @OnEvent(DOMAIN_EVENTS.USER_INVITED, { async: true })
  async onUserInvited(envelope: Envelope<UserInvitedPayload>): Promise<void> {
    const { payload } = envelope;
    this.logger.log(
      `[USER_INVITED] email=${payload.email} role=${payload.role} tenant=${payload.tenantId}`,
    );
  }
}
