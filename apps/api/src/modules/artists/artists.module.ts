import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';
import { ArtistsService }    from './artists.service';
import { ArtistEventsHandler }  from './handlers/artist-events.handler';
import { ArtistWorkflowHandler } from './handlers/artist-workflow.handler';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports:     [ActivityLogsModule],
  controllers: [ArtistsController],
  providers:   [ArtistsService, ArtistEventsHandler, ArtistWorkflowHandler],
  exports:     [ArtistsService],
})
export class ArtistsModule {}
