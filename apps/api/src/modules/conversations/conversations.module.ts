import { Module }                  from '@nestjs/common';
import { ConversationsController }  from './conversations.controller';
import { MusicChatAutomationController } from './musicchat-automation.controller';
import { ConversationsService }     from './conversations.service';
import { MusicChatAutomationService } from './musicchat-automation.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports:     [NotificationsModule],
  controllers: [ConversationsController, MusicChatAutomationController],
  providers:   [ConversationsService, MusicChatAutomationService],
  exports:     [ConversationsService, MusicChatAutomationService],
})
export class ConversationsModule {}
