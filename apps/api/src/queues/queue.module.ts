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
import { DiscoveryModule }          from '@nestjs/core';
import { BullModule }              from '@nestjs/bullmq';
import { QUEUE_NAMES }             from './queue.constants';
import { WorkerErrorThrottlerService } from './worker-error-throttler.service';

import { EmailProcessor }           from './processors/email.processor';
import { NotificationsProcessor }   from './processors/notifications.processor';
import { AIJobsProcessor }          from './processors/ai-jobs.processor';
import { ExternalDataProcessor }    from './processors/external-data.processor';
import { MarketingPublishingProcessor } from './processors/marketing-publishing.processor';
import { ArtistPlatformSyncProcessor } from './processors/artist-platform-sync.processor';

import { EmailQueueService }         from './services/email-queue.service';
import { NotificationsQueueService } from './services/notifications-queue.service';
import { AIJobsQueueService }        from './services/ai-jobs-queue.service';
import { WorkflowQueueService }      from './services/workflow-queue.service';
import { MarketingPublishingQueueService } from './services/marketing-publishing-queue.service';
import { ArtistPlatformProfilesService } from '../modules/artists/platform-profiles/artist-platform-profiles.service';
import { SpotifyArtistProfileProvider } from '../modules/artists/platform-profiles/providers/spotify-artist-profile.provider';
import { YouTubeArtistProfileProvider } from '../modules/artists/platform-profiles/providers/youtube-artist-profile.provider';

import { CoreModule }  from '../core/core.module';
import { AIModule }    from '../modules/ai/ai.module';

const moduleLogger = new Logger('QueueModule');
const REDIS_ERROR_LOG_INTERVAL_MS = 30_000;

function createRedisErrorLogger() {
  let lastCode = '';
  let lastLogAt = 0;

  return (err: NodeJS.ErrnoException) => {
    const now = Date.now();
    const code = err.code ?? err.message?.split('\n')[0] ?? 'UNKNOWN';
    if (code !== lastCode || now - lastLogAt >= REDIS_ERROR_LOG_INTERVAL_MS) {
      lastCode = code;
      lastLogAt = now;
      moduleLogger.warn(`Redis indisponivel (${code}); BullMQ aguardando reconnect`);
    }
  };
}

function createRedisReconnectLogger() {
  let lastLogAt = 0;

  return (delay: number) => {
    const now = Date.now();
    if (now - lastLogAt >= REDIS_ERROR_LOG_INTERVAL_MS) {
      lastLogAt = now;
      moduleLogger.warn(`Redis reconectando em ${delay}ms`);
    }
  };
}

function buildRedisUrlFromParts(): string | undefined {
  const host = process.env['REDIS_HOST'];
  if (!host) return undefined;

  const port = process.env['REDIS_PORT'] || '6379';
  const password = process.env['REDIS_PASSWORD'];
  const auth = password ? `:${encodeURIComponent(password)}@` : '';
  return `redis://${auth}${host}:${port}`;
}

function resolveRedisUrl(): string | undefined {
  return process.env['REDIS_QUEUE_URL'] || process.env['REDIS_URL'] || buildRedisUrlFromParts();
}

function isIoRedisUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (!url.startsWith('redis://') && !url.startsWith('rediss://')) return false;
  if (url.includes('railway.internal')) return false;
  return true;
}

/** Testa se a URL Redis e comandos estao realmente acessiveis. Retorna false se falhar. */
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
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      probe.disconnect(false);
      resolve(ok);
    };

    const timer = setTimeout(() => {
      moduleLogger.warn('Redis: timeout na conexão de teste — BullMQ desativado');
      done(false);
    }, 5000);

    probe.on('ready', async () => {
      try {
        await probe.ping();
        await probe.eval('return 1', 0);
        clearTimeout(timer);
        done(true);
      } catch (err: unknown) {
        clearTimeout(timer);
        const message = err instanceof Error ? err.message : String(err);
        moduleLogger.warn(`Redis indisponivel para comandos: ${message.split('\n')[0]} - BullMQ desativado`);
        done(false);
      }
    });
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
  QUEUE_NAMES.MARKETING_PUBLISHING,
  QUEUE_NAMES.ARTIST_PLATFORM_SYNC,
];

@Global()
@Module({})
export class QueueModule {
  private static noOpModule(): DynamicModule {
    return {
      global:    true,
      module:    QueueModule,
      imports:   [],
      providers: [EmailQueueService, NotificationsQueueService, AIJobsQueueService, WorkflowQueueService, MarketingPublishingQueueService],
      exports:   [EmailQueueService, NotificationsQueueService, AIJobsQueueService, WorkflowQueueService, MarketingPublishingQueueService],
    };
  }

  static async register(): Promise<DynamicModule> {
    const url       = resolveRedisUrl();
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
    const logRedisError = createRedisErrorLogger();
    const logRedisReconnect = createRedisReconnectLogger();
    const connection = new IORedis(url, {
      maxRetriesPerRequest: null,
      enableReadyCheck:     false,
      enableOfflineQueue:   false,
      lazyConnect:          true,
      retryStrategy: (times: number) => Math.min(times * 2000, 30_000),
    });

    connection.on('error', logRedisError);
    connection.on('ready', () => {
      moduleLogger.log('Redis pronto para BullMQ');
    });
    connection.on('reconnecting', logRedisReconnect);

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
        DiscoveryModule,
      ],
      providers: [
        EmailQueueService,
        NotificationsQueueService,
        AIJobsQueueService,
        WorkflowQueueService,
        MarketingPublishingQueueService,
        EmailProcessor,
        NotificationsProcessor,
        AIJobsProcessor,
        ExternalDataProcessor,
        MarketingPublishingProcessor,
        ArtistPlatformSyncProcessor,
        WorkerErrorThrottlerService,
        ArtistPlatformProfilesService,
        SpotifyArtistProfileProvider,
        YouTubeArtistProfileProvider,
      ],
      exports: [
        BullModule,
        EmailQueueService,
        NotificationsQueueService,
        AIJobsQueueService,
        WorkflowQueueService,
        MarketingPublishingQueueService,
      ],
    };
  }
}
