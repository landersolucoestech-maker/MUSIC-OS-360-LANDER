import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller';
import { ClientsService }    from './clients.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [ActivityLogsModule],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
