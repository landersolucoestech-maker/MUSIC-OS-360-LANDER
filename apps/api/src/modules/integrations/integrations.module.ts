import { Module }              from '@nestjs/common';
import { BullModule }          from '@nestjs/bullmq';
import { ACRCloudService }     from './acrcloud/acrcloud.service';
import { AutentiqueService }   from './autentique/autentique.service';
import { SpotifyService }      from './spotify/spotify.service';
import { IntegrationsController } from './integrations.controller';
import { QUEUE_NAMES }         from '../../queues/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: QUEUE_NAMES.STREAMING_SYNC }),
    BullModule.registerQueue({ name: QUEUE_NAMES.INTEGRATIONS_SYNC }),
  ],
  controllers: [IntegrationsController],
  providers:   [ACRCloudService, AutentiqueService, SpotifyService],
  exports:     [ACRCloudService, AutentiqueService, SpotifyService],
})
export class IntegrationsModule {}
