import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { EventsService }    from './events.service';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({ imports: [ActivityLogsModule], controllers: [EventsController], providers: [EventsService], exports: [EventsService] })
export class EventsModule {}
