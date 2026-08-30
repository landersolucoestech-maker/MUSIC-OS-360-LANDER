import { Module } from '@nestjs/common';
import { InternalChatController } from './internal-chat.controller';
import { InternalChatService } from './internal-chat.service';

@Module({
  controllers: [InternalChatController],
  providers: [InternalChatService],
  exports: [InternalChatService],
})
export class InternalChatModule {}
