import { Module } from '@nestjs/common';
import { CampaignsController }   from './campaigns.controller';
import { CampaignsService }      from './campaigns.service';
import { CampaignEventsHandler } from './handlers/campaign-events.handler';

@Module({
  controllers: [CampaignsController],
  providers:   [CampaignsService, CampaignEventsHandler],
  exports:     [CampaignsService],
})
export class CampaignsModule {}
