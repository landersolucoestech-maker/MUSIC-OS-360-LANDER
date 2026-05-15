/**
 * queues/queue.module.ts
 *
 * Módulo central de filas BullMQ do Music OS 360.
 * Quando REDIS_QUEUE_URL não é uma URL ioredis acessível, o módulo
 * opera em modo no-op: sem BullModule.forRoot, sem workers, producers
 * retornam null silenciosamente.
 */

import { Global, Module, forwardRef } from '@nestjs/common';
import { BullModule }              from '@nestjs/bullmq';
import { QUEUE_NAMES }             from './queue.constants';

import { EmailProcessor }          from './processors/email.processor';
import { NotificationsProcessor }  from './processors/notifications.processor';
import { AIJobsProcessor }         from './processors/ai-jobs.processor';
import { ClerkSyncProcessor }      from './processors/clerk-sync.processor';

import { EmailQueueService }        from './services/email-queue.service';
import { NotificationsQueueService } from './services/notifications-queue.service';
import { AIJobsQueueService }       from './services/ai-jobs-queue.service';

import { CoreModule }  from '../core/core.module';
import { AIModule }    from '../modules/ai/ai.module';
import { AuthModule }  from '../modules/auth/auth.module';

function isBullRedisAvailable(): boolean {
  const url = process.env.REDIS_QUEUE_URL ?? '';
  return (
    url.length > 0 &&
    !url.includes('railway.internal') &&
    !url.includes('localhost') &&
    !url.includes('127.0.0.1')
  );
}

function buildBullRoot() {
  if (!isBullRedisAvailable()) {
    process.stdout.write('[BullMQ] REDIS_QUEUE_URL não configurado — filas desactivadas\n');
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const IORedis    = require('ioredis');
  const connection = new IORedis(process.env.REDIS_QUEUE_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck:     false,
    enableOfflineQueue:   false,
    lazyConnect:          true,
    retryStrategy: (times: number) => (times >= 3 ? null : Math.min(times * 2000, 6000)),
  });
  connection.on('error', (err: NodeJS.ErrnoException) => {
    if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET'].includes(err.code ?? '')) {
      process.stdout.write(`[BullMQ Redis] ${err.code}: ${(err as unknown as Record<string, string>)['hostname'] ?? err.message?.split('\n')[0]}\n`);
    }
  });

  return [
    BullModule.forRoot({
      connection,
      defaultJobOptions: {
        attempts:         3,
        removeOnComplete: 100,
        removeOnFail:     1000,
        backoff: { type: 'exponential', delay: 3000 },
      },
    }),
  ];
}

const BULL_AVAILABLE = isBullRedisAvailable();

@Global()
@Module({
  imports: [
    ...buildBullRoot(),
    ...(BULL_AVAILABLE
      ? [
          BullModule.registerQueue(
            { name: QUEUE_NAMES.EMAILS },
            { name: QUEUE_NAMES.NOTIFICATIONS },
            { name: QUEUE_NAMES.AI_JOBS },
            { name: QUEUE_NAMES.INTEGRATIONS_SYNC },
            { name: QUEUE_NAMES.STREAMING_SYNC },
            { name: QUEUE_NAMES.WEBHOOKS },
            { name: QUEUE_NAMES.EXPORTS },
            { name: QUEUE_NAMES.IMPORTS },
            { name: QUEUE_NAMES.CLERK_SYNC },
            { name: QUEUE_NAMES.BILLING },
            { name: QUEUE_NAMES.UPLOADS_PROCESS },
          ),
          CoreModule,
          AIModule,
          forwardRef(() => AuthModule),
        ]
      : []),
  ],

  providers: [
    ...(BULL_AVAILABLE
      ? [
          EmailProcessor,
          NotificationsProcessor,
          AIJobsProcessor,
          ClerkSyncProcessor,
          EmailQueueService,
          NotificationsQueueService,
          AIJobsQueueService,
        ]
      : [
          EmailQueueService,
          NotificationsQueueService,
          AIJobsQueueService,
        ]),
  ],

  exports: [
    ...(BULL_AVAILABLE ? [BullModule] : []),
    EmailQueueService,
    NotificationsQueueService,
    AIJobsQueueService,
  ],
})
export class QueueModule {}
