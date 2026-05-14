import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES }             from '../../queues/queue.constants';
import { NotificationsController } from './notifications.controller';
import { NotificationsService }    from './notifications.service';

@Module({
  imports: [
    // Acesso à fila NOTIFICATIONS para enqueue via @InjectQueue
    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
  ],
  controllers: [NotificationsController],
  providers:   [NotificationsService],
  exports:     [NotificationsService],
})
export class NotificationsModule {}
