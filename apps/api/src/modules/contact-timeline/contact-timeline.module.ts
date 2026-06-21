import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { ContactTimelineController } from './contact-timeline.controller';
import { ContactTimelineService } from './contact-timeline.service';

@Module({
  imports: [ContactsModule],
  controllers: [ContactTimelineController],
  providers: [ContactTimelineService],
  exports: [ContactTimelineService],
})
export class ContactTimelineModule {}
