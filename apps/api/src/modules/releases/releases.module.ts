import { Module } from '@nestjs/common';
import { ReleasesController } from './releases.controller';
import { ReleasesService }    from './releases.service';
import { ReleaseEventsHandler } from './handlers/release-events.handler';

@Module({
  controllers: [ReleasesController],
  providers:   [ReleasesService, ReleaseEventsHandler],
  exports:     [ReleasesService],
})
export class ReleasesModule {}
