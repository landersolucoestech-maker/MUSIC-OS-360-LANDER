import { Optional,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RbacErrorLogService } from './rbac-error-log.service';
import { Sentry } from '../../instrument';

const INVALIDATION_CHANNEL = 'rbac:cache:invalidate';

@Injectable()
export class RbacDistributedCacheService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RbacDistributedCacheService.name);
  private command: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly listeners = new Set<(roleIds: Set<string>) => void>();

  constructor(
    @Optional() private readonly config?: ConfigService,
    @Optional() private readonly errorLog?: RbacErrorLogService,
  ) {}

  async onModuleInit(): Promise<void> {
    const distributedCacheEnabled =
      this.config?.get<string>('RBAC_DISTRIBUTED_CACHE_ENABLED') ??
      process.env.RBAC_DISTRIBUTED_CACHE_ENABLED;
    if (distributedCacheEnabled === 'false') {
      return;
    }

    const url =
      this.config?.get<string>('REDIS_URL') ??
      this.config?.get<string>('REDIS_QUEUE_URL') ??
      process.env.REDIS_URL ??
      process.env.REDIS_QUEUE_URL;
    if (!url) return;

    try {
      this.command = new Redis(url, {
        lazyConnect: true,
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        connectTimeout: 2_000,
        retryStrategy: () => null,
      });
      this.subscriber = this.command.duplicate();
      await this.command.connect();
      await this.subscriber.connect();
      await this.subscriber.subscribe(INVALIDATION_CHANNEL);
      this.subscriber.on('message', (_channel, payload) => {
        try {
          const roleIds = new Set<string>(JSON.parse(payload) as string[]);
          for (const listener of this.listeners) listener(roleIds);
        } catch (error) {
          this.reportFailure('subscriber_payload', error);
        }
      });
      this.logger.log('RBAC distributed cache connected');
    } catch (error) {
      this.reportFailure('connect', error);
      this.disconnect();
    }
  }

  onInvalidation(listener: (roleIds: Set<string>) => void): void {
    this.listeners.add(listener);
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.command) return null;
    try {
      const value = await this.command.get(`rbac:value:${key}`);
      return value ? (JSON.parse(value) as T) : null;
    } catch (error) {
      this.reportFailure('get', error);
      return null;
    }
  }

  async set(
    key: string,
    value: unknown,
    roleIds: string[],
    ttlSeconds: number,
  ): Promise<void> {
    if (!this.command) return;
    try {
      const pipeline = this.command.pipeline();
      pipeline.set(
        `rbac:value:${key}`,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
      for (const roleId of roleIds) {
        const indexKey = `rbac:role:${roleId}:keys`;
        pipeline.sadd(indexKey, key);
        pipeline.expire(indexKey, ttlSeconds * 2);
      }
      await pipeline.exec();
    } catch (error) {
      this.reportFailure('set', error);
    }
  }

  async delete(...keys: string[]): Promise<void> {
    if (!this.command || keys.length === 0) return;
    try {
      await this.command.del(...keys.map((key) => `rbac:value:${key}`));
    } catch (error) {
      this.reportFailure('delete', error);
    }
  }

  async invalidateRoleIds(roleIds: Set<string>): Promise<void> {
    if (!this.command || roleIds.size === 0) return;
    try {
      const keys = new Set<string>();
      for (const roleId of roleIds) {
        const indexed = await this.command.smembers(`rbac:role:${roleId}:keys`);
        indexed.forEach((key) => keys.add(key));
      }

      const pipeline = this.command.pipeline();
      for (const key of keys) pipeline.del(`rbac:value:${key}`);
      for (const roleId of roleIds) {
        pipeline.del(`rbac:role:${roleId}:keys`);
      }
      await pipeline.exec();
      await this.command.publish(
        INVALIDATION_CHANNEL,
        JSON.stringify([...roleIds]),
      );
    } catch (error) {
      this.reportFailure('invalidate', error);
    }
  }

  async onModuleDestroy(): Promise<void> {
    this.disconnect();
  }

  private disconnect(): void {
    this.subscriber?.disconnect(false);
    this.command?.disconnect(false);
    this.subscriber = null;
    this.command = null;
  }

  private reportFailure(operation: string, error: unknown): void {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(
      JSON.stringify({
        event: 'rbac_cache_failure',
        operation,
        message,
      }),
    );
    try {
      Sentry.captureMessage(`RBAC cache failure: ${operation}`, {
        level: 'error',
        extra: { message },
      });
    } catch {
      // Observability must never affect authorization.
    }
    void this.errorLog?.record({
      errorType: 'cache_error',
      errorSource: `RbacDistributedCache:${operation}`,
      error,
    });
  }
}
