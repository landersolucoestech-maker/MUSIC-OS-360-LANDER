import { Module }              from '@nestjs/common';
import { QueueModule }        from '../../queues/queue.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService }    from './notifications.service';
import { NotificationSettingsService } from './notification-settings.service';

@Module({
  imports:     [QueueModule],
  controllers: [NotificationsController],
  providers:   [NotificationsService, NotificationSettingsService],
  exports:     [NotificationsService, NotificationSettingsService],
})
export class NotificationsModule {}
