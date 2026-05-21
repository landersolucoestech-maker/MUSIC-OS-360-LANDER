import { Global, Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventsService }          from './events.service';
import { DomainEventLogService }  from './domain-event-log.service';
import { NotificationHandler }    from './notification.handler';
import { UniversalEventLogHandler } from './universal-event-log.handler';
import { WorkflowEventsHandler }  from './workflow-events.handler';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      newListener: false,
      removeListener: false,
      maxListeners: 50,
      verboseMemoryLeak: false,
      ignoreErrors: false,
    }),
  ],
  providers: [
    EventsService,
    DomainEventLogService,
    UniversalEventLogHandler,
    NotificationHandler,
    WorkflowEventsHandler,
  ],
  exports: [
    EventsService,
    DomainEventLogService,
  ],
})
export class DomainEventsModule {}
