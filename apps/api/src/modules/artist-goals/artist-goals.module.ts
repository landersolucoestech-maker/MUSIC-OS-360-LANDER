import { Module } from '@nestjs/common';
import { ArtistGoalsController } from './artist-goals.controller';
import { ArtistGoalsService }    from './artist-goals.service';

@Module({
  controllers: [ArtistGoalsController],
  providers:   [ArtistGoalsService],
  exports:     [ArtistGoalsService],
})
export class ArtistGoalsModule {}
