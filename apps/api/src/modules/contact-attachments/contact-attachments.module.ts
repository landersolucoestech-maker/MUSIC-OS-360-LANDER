import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { ContactAttachmentsController } from './contact-attachments.controller';
import { ContactAttachmentsService } from './contact-attachments.service';

@Module({
  imports: [ContactsModule],
  controllers: [ContactAttachmentsController],
  providers: [ContactAttachmentsService],
  exports: [ContactAttachmentsService],
})
export class ContactAttachmentsModule {}
