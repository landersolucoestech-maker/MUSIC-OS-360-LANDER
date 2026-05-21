import { Module } from '@nestjs/common';
import { CampaignsController }           from './campaigns.controller';
import { CampaignsService }              from './campaigns.service';
import { CampaignEventsHandler }         from './handlers/campaign-events.handler';
import { CampaignOperationsController }  from './campaign-operations.controller';
import { CampaignOperationsService }     from './campaign-operations.service';

@Module({
  controllers: [CampaignsController, CampaignOperationsController],
  providers:   [CampaignsService, CampaignEventsHandler, CampaignOperationsService],
  exports:     [CampaignsService, CampaignOperationsService],
})
export class CampaignsModule {}
