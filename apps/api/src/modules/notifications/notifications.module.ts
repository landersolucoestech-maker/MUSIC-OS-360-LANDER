import { Module }              from '@nestjs/common';
import { QueueModule }        from '../../queues/queue.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService }    from './notifications.service';

@Module({
  imports:     [QueueModule],
  controllers: [NotificationsController],
  providers:   [NotificationsService],
  exports:     [NotificationsService],
})
export class NotificationsModule {}
