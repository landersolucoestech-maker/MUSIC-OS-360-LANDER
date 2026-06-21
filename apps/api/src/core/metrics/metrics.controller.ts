/**
 * core/metrics/metrics.controller.ts
 *
 * GET /metrics — Prometheus text/plain.
 *
 * Production policy:
 *  - METRICS_TOKEN env var: if set, request must include `Authorization: Bearer <token>`
 *    OR `?token=<token>` query param.
 *  - METRICS_TOKEN unset in production → only allow from loopback / private network
 *    (handled at infra layer; here we still serve, with a startup warning logged elsewhere).
 *  - Always exposed in development for local prom scrapers.
 */

import { Controller, Get, Header, Req, ForbiddenException, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Request } from 'express';
import { Public } from '../decorators/public.decorator';
import { DATA_SOURCE } from '../../database/database.module';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
    @Optional() @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
  ) {}

  @Get('metrics')
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  async scrape(@Req() req: Request): Promise<string> {
    const expected = this.config.get<string>('METRICS_TOKEN');
    if (expected) {
      const headerToken = (req.headers['authorization'] ?? '').replace(/^Bearer\s+/i, '');
      const queryToken = (req.query?.['token'] as string | undefined) ?? '';
      if (headerToken !== expected && queryToken !== expected) {
        throw new ForbiddenException('Invalid metrics token');
      }
    }

    // Sample DB health right before scrape
    if (this.ds && this.ds.isInitialized) {
      try {
        await this.ds.query('SELECT 1');
        this.metrics.dbUp.set(1);
      } catch {
        this.metrics.dbUp.set(0);
      }
    } else {
      this.metrics.dbUp.set(0);
    }

    // Sample Redis health + queue counts via a single ioredis probe
    const redisUrl = this.config.get<string>('REDIS_URL') ?? this.config.get<string>('REDIS_QUEUE_URL');
    if (redisUrl) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const IORedis = require('ioredis');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { Queue } = require('bullmq');
        const probe = new IORedis(redisUrl, {
          lazyConnect: true,
          enableReadyCheck: false,
          enableOfflineQueue: false,
          connectTimeout: 2000,
          maxRetriesPerRequest: 0,
          retryStrategy: () => null,
        });
        try {
          await probe.connect();
          await probe.ping();
          this.metrics.redisUp.set(1);
          // Sample queue counts (4 main queues — keep cardinality low)
          for (const qname of ['emails', 'notifications', 'ai-jobs', 'streaming-sync']) {
            try {
              const q = new Queue(qname, { connection: probe });
              const counts = await q.getJobCounts('wait', 'active', 'completed', 'failed', 'delayed');
              for (const [state, count] of Object.entries(counts)) {
                this.metrics.queueJobs.labels(qname, state).set(Number(count));
              }
              await q.close();
            } catch { /* per-queue best-effort */ }
          }
        } catch {
          this.metrics.redisUp.set(0);
        } finally {
          probe.disconnect(false);
        }
      } catch {
        this.metrics.redisUp.set(0);
      }
    } else {
      this.metrics.redisUp.set(0);
    }

    return this.metrics.render();
  }
}
