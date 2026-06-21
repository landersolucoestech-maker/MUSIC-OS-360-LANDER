import { Module } from '@nestjs/common';
import { ContactsModule } from '../contacts/contacts.module';
import { ContactContractsController } from './contact-contracts.controller';
import { ContactContractsService } from './contact-contracts.service';

@Module({
  imports: [ContactsModule],
  controllers: [ContactContractsController],
  providers: [ContactContractsService],
  exports: [ContactContractsService],
})
export class ContactContractsModule {}
