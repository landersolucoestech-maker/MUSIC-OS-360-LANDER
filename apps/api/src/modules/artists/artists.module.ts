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
import { DeezerArtistProfileProvider } from './platform-profiles/providers/deezer-artist-profile.provider';
import { SoundCloudArtistProfileProvider } from './platform-profiles/providers/soundcloud-artist-profile.provider';
import { InstagramArtistProfileProvider } from './platform-profiles/providers/instagram-artist-profile.provider';
import { TikTokArtistProfileProvider } from './platform-profiles/providers/tiktok-artist-profile.provider';
import { AppleMusicArtistProfileProvider } from './platform-profiles/providers/apple-music-artist-profile.provider';
import { SoundchartsService } from '../integrations/soundcharts/soundcharts.service';

@Module({
  imports:     [ActivityLogsModule],
  controllers: [ArtistsController],
  providers:   [
    ArtistsService,
    ArtistEventsHandler,
    ArtistWorkflowHandler,
    ArtistPlatformProfilesService,
    ArtistExternalProfileSyncService,
    SoundchartsService,
    SpotifyArtistProfileProvider,
    YouTubeArtistProfileProvider,
    DeezerArtistProfileProvider,
    SoundCloudArtistProfileProvider,
    InstagramArtistProfileProvider,
    TikTokArtistProfileProvider,
    AppleMusicArtistProfileProvider,
  ],
  exports:     [ArtistsService, ArtistPlatformProfilesService, ArtistExternalProfileSyncService],
})
export class ArtistsModule {}
