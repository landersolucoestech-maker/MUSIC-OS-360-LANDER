import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';
import { ArtistsService }    from './artists.service';
import { ArtistEventsHandler } from './handlers/artist-events.handler';

@Module({
  controllers: [ArtistsController],
  providers:   [ArtistsService, ArtistEventsHandler],
  exports:     [ArtistsService],
})
export class ArtistsModule {}
