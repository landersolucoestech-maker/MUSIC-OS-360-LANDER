import { Module }              from '@nestjs/common';
import { BullModule }          from '@nestjs/bullmq';
import { ACRCloudService }     from './acrcloud/acrcloud.service';
import { AutentiqueService }   from './autentique/autentique.service';
import { SpotifyService }      from './spotify/spotify.service';
import { YouTubeService }      from './youtube/youtube.service';
import { DeezerService }       from './deezer/deezer.service';
import { IntegrationsController } from './integrations.controller';
import { QUEUE_NAMES }         from '../../queues/queue.constants';

const ALL_SERVICES = [
  ACRCloudService,
  AutentiqueService,
  SpotifyService,
  YouTubeService,
  DeezerService,
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
