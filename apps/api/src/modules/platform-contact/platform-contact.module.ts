import { Module } from '@nestjs/common';
import { PlatformContactController } from './platform-contact.controller';
import { PlatformContactService } from './platform-contact.service';

@Module({
  controllers: [PlatformContactController],
  providers: [PlatformContactService],
})
export class PlatformContactModule {}
