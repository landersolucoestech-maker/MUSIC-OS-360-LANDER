import { Module } from '@nestjs/common';
import { LeadInteractionsController } from './lead-interactions.controller';
import { LeadInteractionsService }    from './lead-interactions.service';

@Module({ controllers: [LeadInteractionsController], providers: [LeadInteractionsService], exports: [LeadInteractionsService] })
export class LeadInteractionsModule {}
