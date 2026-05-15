/**
 * queues/queue.module.ts
 *
 * Módulo central de filas BullMQ do Music OS 360.
 *
 * Implementado como DynamicModule para que a decisão de activar BullMQ
 * ocorra inteiramente em runtime (dentro do register() síncrono que lê
 * process.env APÓS dotenv ter sido carregado pelo main.ts).
 *
 * Quando REDIS_QUEUE_URL não é uma URL ioredis válida e acessível:
 *   - BullModule NÃO é importado (nenhuma connection ioredis é criada)
 *   - Workers (processors) NÃO são registrados
 *   - Serviços produtores são registrados mas @Optional() @InjectQueue
 *     resolve para null → métodos enqueue são no-op explícito
 *
 * Quando REDIS_QUEUE_URL é válido:
 *   - BullModule.forRoot + BullModule.registerQueue para todas as filas
 *   - Todos os workers e producers registrados normalmente
 */

import { DynamicModule, Global, Module, Logger, forwardRef } from '@nestjs/common';
import { BullModule }              from '@nestjs/bullmq';
import { QUEUE_NAMES }             from './queue.constants';

import { EmailProcessor }           from './processors/email.processor';
import { NotificationsProcessor }   from './processors/notifications.processor';
import { AIJobsProcessor }          from './processors/ai-jobs.processor';
import { ClerkSyncProcessor }       from './processors/clerk-sync.processor';

import { EmailQueueService }         from './services/email-queue.service';
import { NotificationsQueueService } from './services/notifications-queue.service';
import { AIJobsQueueService }        from './services/ai-jobs-queue.service';

import { CoreModule }  from '../core/core.module';
import { AIModule }    from '../modules/ai/ai.module';
import { AuthModule }  from '../modules/auth/auth.module';

const moduleLogger = new Logger('QueueModule');

/** URL ioredis válida e acessível */
function isAccessibleIoRedisUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) return false;
  if (url.includes('railway.internal')) return false;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return false;
  return true;
}

const ALL_QUEUES = [
  QUEUE_NAMES.EMAILS,
  QUEUE_NAMES.NOTIFICATIONS,
  QUEUE_NAMES.AI_JOBS,
  QUEUE_NAMES.INTEGRATIONS_SYNC,
  QUEUE_NAMES.STREAMING_SYNC,
  QUEUE_NAMES.WEBHOOKS,
  QUEUE_NAMES.EXPORTS,
  QUEUE_NAMES.IMPORTS,
  QUEUE_NAMES.CLERK_SYNC,
  QUEUE_NAMES.BILLING,
  QUEUE_NAMES.UPLOADS_PROCESS,
];

@Global()
@Module({})
export class QueueModule {
  static register(): DynamicModule {
    const url       = process.env['REDIS_QUEUE_URL'];
    const available = isAccessibleIoRedisUrl(url);

    if (!available) {
      moduleLogger.warn(
        'REDIS_QUEUE_URL não configurado ou inacessível — BullMQ desactivado (sem conexão Redis)',
      );

      return {
        global:     true,
        module:     QueueModule,
        imports:    [],
        providers:  [EmailQueueService, NotificationsQueueService, AIJobsQueueService],
        exports:    [EmailQueueService, NotificationsQueueService, AIJobsQueueService],
      };
    }

    moduleLogger.log(`BullMQ activado — Redis: ${url!.substring(0, 40)}...`);

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const IORedis    = require('ioredis');
    const connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck:     false,
      enableOfflineQueue:   false,
      lazyConnect:          true,
      retryStrategy: (times: number) =>
        times >= 3 ? null : Math.min(times * 2000, 6000),
    });
    connection.on('error', (err: NodeJS.ErrnoException) => {
      if (['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET'].includes(err.code ?? '')) {
        moduleLogger.error(
          `Redis ${err.code}: ${
            (err as unknown as Record<string, string>)['hostname'] ??
            err.message?.split('\n')[0]
          }`,
        );
      }
    });

    return {
      global: true,
      module: QueueModule,
      imports: [
        BullModule.forRoot({
          connection,
          defaultJobOptions: {
            attempts:         3,
            removeOnComplete: 100,
            removeOnFail:     1000,
            backoff: { type: 'exponential', delay: 3000 },
          },
        }),
        BullModule.registerQueue(...ALL_QUEUES.map((name) => ({ name }))),
        CoreModule,
        AIModule,
        forwardRef(() => AuthModule),
      ],
      providers: [
        EmailQueueService,
        NotificationsQueueService,
        AIJobsQueueService,
        EmailProcessor,
        NotificationsProcessor,
        AIJobsProcessor,
        ClerkSyncProcessor,
      ],
      exports: [
        BullModule,
        EmailQueueService,
        NotificationsQueueService,
        AIJobsQueueService,
      ],
    };
  }
}
