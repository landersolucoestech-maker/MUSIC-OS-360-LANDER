import { Module }              from '@nestjs/common';
import { QueueModule }        from '../../queues/queue.module';
import { AppCacheModule }     from '../../core/cache/cache.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { IntegrationBaseService } from './integration-base.service';
import { ACRCloudService }     from './acrcloud/acrcloud.service';
import { AutentiqueService }   from './autentique/autentique.service';
import { DocuSignService }     from './docusign/docusign.service';
import { IntegrationPolicyService } from './governance/integration-policy.service';
import { IntegrationAdminService } from './governance/integration-admin.service';
import { IntegrationUsageGuard } from './governance/integration-usage.guard';
import { IntegrationAdminController } from './governance/integration-admin.controller';
import { SpotifyService }      from './spotify/spotify.service';
import { YouTubeService }      from './youtube/youtube.service';
import { DeezerService }       from './deezer/deezer.service';
import { SoundCloudService }   from './soundcloud/soundcloud.service';
import { AppleMusicService }   from './apple-music/apple-music.service';
import { InstagramService }    from './instagram/instagram.service';
import { InstagramTokenRefreshScheduler } from './instagram/instagram-token-refresh.scheduler';
import { TikTokService }       from './tiktok/tiktok.service';
import { GoogleAdsService }    from './google-ads/google-ads.service';
import { AbramusService }      from './abramus/abramus.service';
import { WhatsAppModule } from './whatsapp/whatsapp.module';
import { SoundchartsService }  from './soundcharts/soundcharts.service';
import { IntegrationsController } from './integrations.controller';
import { AutentiqueController } from './autentique/autentique.controller';
import { DocuSignController } from './docusign/docusign.controller';
import { ExternalDataController } from './external-data.controller';
import { WhatsAppWebhookController } from './whatsapp/whatsapp-webhook.controller';
import { WebhookService }         from './webhooks/webhook.service';

const ALL_SERVICES = [
  IntegrationBaseService,
  ACRCloudService,
  AutentiqueService,
  DocuSignService,
  IntegrationPolicyService,
  IntegrationAdminService,
  IntegrationUsageGuard,
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
  SoundchartsService,
];

@Module({
  imports:     [QueueModule, AppCacheModule, ConversationsModule, WhatsAppModule],
  controllers: [
    IntegrationsController, AutentiqueController, DocuSignController, IntegrationAdminController, ExternalDataController,
    WhatsAppWebhookController,
  ],
  providers:   ALL_SERVICES,
  exports:     [...ALL_SERVICES, WhatsAppModule],
})
export class IntegrationsModule {}
