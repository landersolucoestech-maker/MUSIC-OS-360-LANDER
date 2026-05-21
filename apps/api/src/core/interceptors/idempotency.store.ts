/**
 * core/interceptors/idempotency.store.ts
 *
 * Pluggable backend for the IdempotencyInterceptor.
 *
 * - When REDIS_QUEUE_URL is set and reachable: stores entries in Redis so
 *   idempotency is consistent across multiple API replicas.
 * - Otherwise falls back to an in-process Map (dev / single-replica staging).
 *
 * In production without Redis the interceptor still works, but two concurrent
 * replicas can process the same key in parallel — acceptable during migration,
 * not for steady-state production (Phase 8 enforces REDIS_QUEUE_URL).
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';

export interface IdempotencyEntry {
  body:       unknown;
  statusCode: number;
  expiresAt:  number; // -1 = in-flight placeholder
}

@Injectable()
export class IdempotencyStore implements OnModuleDestroy {
  private readonly logger = new Logger(IdempotencyStore.name);
  private redis: import('ioredis').Redis | null = null;
  private readonly mem = new Map<string, IdempotencyEntry>();
  private gcTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  private init(): void {
    const url = process.env['REDIS_QUEUE_URL'];
    if (!url || url.includes('railway.internal')) {
      this.startMemGc();
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Redis } = require('ioredis') as { Redis: new (url: string, opts: object) => import('ioredis').Redis };
      this.redis = new Redis(url, {
        maxRetriesPerRequest: null,
        enableReadyCheck:     false,
        enableOfflineQueue:   false,
        lazyConnect:          true,
        retryStrategy: (times: number) => times >= 3 ? null : Math.min(times * 2000, 6000),
      });

      this.redis.on('ready',  () => this.logger.log('IdempotencyStore: Redis connected'));
      this.redis.on('error',  (err: Error) => {
        this.logger.warn(`IdempotencyStore Redis error — falling back to mem: ${err.message?.split('\n')[0]}`);
        this.redis = null;
        this.startMemGc();
      });
    } catch (err) {
      this.logger.warn(`IdempotencyStore: ioredis unavailable — using in-memory store: ${String(err)}`);
      this.startMemGc();
    }
  }

  private startMemGc(): void {
    if (this.gcTimer) return;
    this.gcTimer = setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.mem.entries()) {
        if (v.expiresAt !== -1 && v.expiresAt <= now) this.mem.delete(k);
      }
    }, 10 * 60 * 1000);
    this.gcTimer.unref();
  }

  async get(key: string): Promise<IdempotencyEntry | null> {
    if (this.redis) {
      try {
        const raw = await this.redis.get(`idem:${key}`);
        if (!raw) return null;
        return JSON.parse(raw) as IdempotencyEntry;
      } catch {
        // Redis unavailable — fall through to mem
      }
    }
    return this.mem.get(key) ?? null;
  }

  async set(key: string, entry: IdempotencyEntry, ttlMs: number): Promise<void> {
    if (this.redis) {
      try {
        const ttlSec = Math.ceil(ttlMs / 1000);
        await this.redis.set(`idem:${key}`, JSON.stringify(entry), 'EX', ttlSec);
        return;
      } catch {
        // fall through to mem
      }
    }
    this.mem.set(key, entry);
  }

  async setInflight(key: string): Promise<void> {
    await this.set(key, { body: null, statusCode: 0, expiresAt: -1 }, 60_000);
  }

  async delete(key: string): Promise<void> {
    if (this.redis) {
      try {
        await this.redis.del(`idem:${key}`);
        return;
      } catch {
        // fall through to mem
      }
    }
    this.mem.delete(key);
  }

  onModuleDestroy(): void {
    if (this.gcTimer) clearInterval(this.gcTimer);
    if (this.redis)   this.redis.disconnect();
  }
}
