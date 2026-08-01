import { Module }              from '@nestjs/common';
import { QueueModule }        from '../../queues/queue.module';
import { AppCacheModule }     from '../../core/cache/cache.module';
import { IntegrationBaseService } from './integration-base.service';
import { ACRCloudService }     from './acrcloud/acrcloud.service';
import { AutentiqueService }   from './autentique/autentique.service';
import { SpotifyService }      from './spotify/spotify.service';
import { YouTubeService }      from './youtube/youtube.service';
import { DeezerService }       from './deezer/deezer.service';
import { SoundCloudService }   from './soundcloud/soundcloud.service';
import { AppleMusicService }   from './apple-music/apple-music.service';
import { InstagramService }    from './instagram/instagram.service';
import { InstagramTokenRefreshScheduler } from './instagram/instagram-token-refresh.scheduler';
import { InstagramTokenRefreshCronController } from './instagram/instagram-token-refresh-cron.controller';
import { TikTokService }       from './tiktok/tiktok.service';
import { GoogleAdsService }    from './google-ads/google-ads.service';
import { AbramusService }      from './abramus/abramus.service';
import { IntegrationsController } from './integrations.controller';
import { AutentiqueController } from './autentique/autentique.controller';
import { ExternalDataController } from './external-data.controller';
import { WebhookService }         from './webhooks/webhook.service';

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
  InstagramTokenRefreshScheduler,
  TikTokService,
  GoogleAdsService,
  AbramusService,
  WebhookService,
];

@Module({
  imports:     [QueueModule, AppCacheModule],
  controllers: [IntegrationsController, AutentiqueController, ExternalDataController, InstagramTokenRefreshCronController],
  providers:   ALL_SERVICES,
  exports:     ALL_SERVICES,
})
export class IntegrationsModule {}
