/**
 * queues/queue.module.ts
 *
 * Módulo central de filas BullMQ do Music OS 360.
 *
 * register() é async: testa a conexão Redis com PING antes de ativar BullMQ.
 * Se a conexão falhar (WRONGPASS, ECONNREFUSED, timeout), cai em no-op mode:
 *   - BullModule NÃO é importado (nenhum RedisConnection interno é criado)
 *   - Workers (processors) NÃO são registrados
 *   - Serviços produtores são registrados mas @Optional() @InjectQueue
 *     resolve para null → métodos enqueue são no-op explícito
 */

import { DynamicModule, Global, Module, Logger } from '@nestjs/common';
import { BullModule }              from '@nestjs/bullmq';
import { QUEUE_NAMES }             from './queue.constants';

import { EmailProcessor }           from './processors/email.processor';
import { NotificationsProcessor }   from './processors/notifications.processor';
import { AIJobsProcessor }          from './processors/ai-jobs.processor';

import { EmailQueueService }         from './services/email-queue.service';
import { NotificationsQueueService } from './services/notifications-queue.service';
import { AIJobsQueueService }        from './services/ai-jobs-queue.service';

import { CoreModule }  from '../core/core.module';
import { AIModule }    from '../modules/ai/ai.module';

const moduleLogger = new Logger('QueueModule');

function isIoRedisUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) return false;
  if (url.includes('railway.internal')) return false;
  if (url.includes('localhost') || url.includes('127.0.0.1')) return false;
  return true;
}

/** Testa se a URL Redis é realmente acessível (PING + AUTH). Retorna false se falhar. */
async function probeRedis(url: string): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Redis } = require('ioredis') as { Redis: new (url: string, opts: object) => import('ioredis').Redis };
  const probe = new Redis(url, {
    lazyConnect:          true,
    enableReadyCheck:     false,
    enableOfflineQueue:   false,
    connectTimeout:       4000,
    maxRetriesPerRequest: 0,
    retryStrategy:        () => null,
  });

  return new Promise<boolean>((resolve) => {
    const done = (ok: boolean) => {
      probe.disconnect(false);
      resolve(ok);
    };

    const timer = setTimeout(() => {
      moduleLogger.warn('Redis: timeout na conexão de teste — BullMQ desativado');
      done(false);
    }, 5000);

    probe.on('ready', () => { clearTimeout(timer); done(true); });
    probe.on('error', (err: Error) => {
      clearTimeout(timer);
      moduleLogger.warn(`Redis inacessível: ${err.message?.split('\n')[0]} — BullMQ desativado`);
      done(false);
    });

    probe.connect().catch(() => { /* handled by 'error' event */ });
  });
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
  QUEUE_NAMES.BILLING,
  QUEUE_NAMES.UPLOADS_PROCESS,
];

@Global()
@Module({})
export class QueueModule {
  private static noOpModule(): DynamicModule {
    return {
      global:    true,
      module:    QueueModule,
      imports:   [],
      providers: [EmailQueueService, NotificationsQueueService, AIJobsQueueService],
      exports:   [EmailQueueService, NotificationsQueueService, AIJobsQueueService],
    };
  }

  static async register(): Promise<DynamicModule> {
    const url       = process.env['REDIS_QUEUE_URL'];
    const isProd    = process.env['NODE_ENV'] === 'production';

    if (!isIoRedisUrl(url)) {
      if (isProd) {
        moduleLogger.error('REDIS_QUEUE_URL não configurado em produção — abortando startup');
        process.exit(1);
      }
      moduleLogger.warn('REDIS_QUEUE_URL não configurado — BullMQ desativado (modo no-op)');
      return QueueModule.noOpModule();
    }

    const ok = await probeRedis(url!);
    if (!ok) {
      if (isProd) {
        moduleLogger.error('Redis inacessível em produção — abortando startup');
        process.exit(1);
      }
      return QueueModule.noOpModule();
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
      moduleLogger.error(`Redis error: ${err.code ?? err.message?.split('\n')[0]}`);
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
      ],
      providers: [
        EmailQueueService,
        NotificationsQueueService,
        AIJobsQueueService,
        EmailProcessor,
        NotificationsProcessor,
        AIJobsProcessor,
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
