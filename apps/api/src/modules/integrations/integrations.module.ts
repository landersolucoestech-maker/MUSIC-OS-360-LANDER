import { Module }              from '@nestjs/common';
import { BullModule }          from '@nestjs/bullmq';
import { IntegrationBaseService } from './integration-base.service';
import { ACRCloudService }     from './acrcloud/acrcloud.service';
import { AutentiqueService }   from './autentique/autentique.service';
import { SpotifyService }      from './spotify/spotify.service';
import { YouTubeService }      from './youtube/youtube.service';
import { DeezerService }       from './deezer/deezer.service';
import { SoundCloudService }   from './soundcloud/soundcloud.service';
import { AppleMusicService }   from './apple-music/apple-music.service';
import { InstagramService }    from './instagram/instagram.service';
import { TikTokService }       from './tiktok/tiktok.service';
import { GoogleAdsService }    from './google-ads/google-ads.service';
import { AbramusService }      from './abramus/abramus.service';
import { IntegrationsController } from './integrations.controller';
import { QUEUE_NAMES }         from '../../queues/queue.constants';

const ALL_SERVICES = [
  IntegrationBaseService,
  ACRCloudService,
  AutentiqueService,
  SpotifyService,
  YouTubeService,
  DeezerService,
  SoundCloudService,
  AppleMusicService,
  InstagramService,
  TikTokService,
  GoogleAdsService,
  AbramusService,
];

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.STREAMING_SYNC }),
    BullModule.registerQueue({ name: QUEUE_NAMES.INTEGRATIONS_SYNC }),
  ],
  controllers: [IntegrationsController],
  providers:   ALL_SERVICES,
  exports:     ALL_SERVICES,
})
export class IntegrationsModule {}
