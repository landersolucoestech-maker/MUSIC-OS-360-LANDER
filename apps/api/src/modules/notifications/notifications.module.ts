import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES }              from '../../queues/queue.constants';
import { NotificationsController }  from './notifications.controller';
import { NotificationsService }     from './notifications.service';
import { NotificationsProcessor }   from './notifications.processor';

@Module({
  imports: [
    // Acesso à fila NOTIFICATIONS para enqueue via @InjectQueue
    BullModule.registerQueue({ name: QUEUE_NAMES.NOTIFICATIONS }),
  ],
  controllers: [NotificationsController],
  providers:   [NotificationsService, NotificationsProcessor],
  exports:     [NotificationsService],
})
export class NotificationsModule {}
