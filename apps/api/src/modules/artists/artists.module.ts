import { Module } from '@nestjs/common';
import { ArtistsController } from './artists.controller';
import { ArtistsService }    from './artists.service';
import { ArtistEventsHandler }  from './handlers/artist-events.handler';
import { ArtistWorkflowHandler } from './handlers/artist-workflow.handler';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { ArtistPlatformProfilesService } from './platform-profiles/artist-platform-profiles.service';
import { ArtistExternalProfileSyncService } from './platform-profiles/artist-external-profile-sync.service';
import { SpotifyArtistProfileProvider } from './platform-profiles/providers/spotify-artist-profile.provider';
import { YouTubeArtistProfileProvider } from './platform-profiles/providers/youtube-artist-profile.provider';

@Module({
  imports:     [ActivityLogsModule],
  controllers: [ArtistsController],
  providers:   [
    ArtistsService,
    ArtistEventsHandler,
    ArtistWorkflowHandler,
    ArtistPlatformProfilesService,
    ArtistExternalProfileSyncService,
    SpotifyArtistProfileProvider,
    YouTubeArtistProfileProvider,
  ],
  exports:     [ArtistsService, ArtistPlatformProfilesService, ArtistExternalProfileSyncService],
})
export class ArtistsModule {}
