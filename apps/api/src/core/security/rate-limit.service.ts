/**
 * core/security/rate-limit.service.ts
 *
 * RateLimitService — sliding window rate limiting com Upstash Redis.
 * Categorias: auth (5/15m), api (120/1m), ai (20/1h), upload (30/1h), webhook (100/1m).
 */

import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Ratelimit }   from '@upstash/ratelimit';
import { Redis }       from '@upstash/redis';
import { ConfigService } from '@nestjs/config';

type RateLimitCategory = 'auth' | 'api' | 'ai' | 'upload' | 'webhook';

@Injectable()
export class RateLimitService {
  private readonly logger   = new Logger(RateLimitService.name);
  private readonly limiters = new Map<RateLimitCategory, Ratelimit>();
  private readonly enabled:  boolean;

  constructor(private config: ConfigService) {
    const url   = this.config.get<string>('UPSTASH_REDIS_URL');
    const token = this.config.get<string>('UPSTASH_REDIS_TOKEN');

    if (!url || !token) {
      this.logger.warn('UPSTASH_REDIS_URL/TOKEN não configurados — rate limiting desactivado');
      this.enabled = false;
      return;
    }

    if (!url.startsWith('https://')) {
      this.logger.warn(
        `UPSTASH_REDIS_URL deve começar com https:// (Upstash REST API). ` +
        `Recebido: "${url.substring(0, 20)}..." — rate limiting desactivado`,
      );
      this.enabled = false;
      return;
    }

    this.enabled = true;
    const redis  = new Redis({ url, token });

    const configs: Record<RateLimitCategory, Ratelimit> = {
      auth:    new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5,   '15 m'), prefix: '@musicos360/auth' }),
      api:     new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(120, '1 m'),  prefix: '@musicos360/api' }),
      ai:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20,  '1 h'),  prefix: '@musicos360/ai' }),
      upload:  new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30,  '1 h'),  prefix: '@musicos360/upload' }),
      webhook: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(100, '1 m'),  prefix: '@musicos360/webhook' }),
    };

    for (const [name, limiter] of Object.entries(configs)) {
      this.limiters.set(name as RateLimitCategory, limiter);
    }
  }

  async check(category: RateLimitCategory, identifier: string): Promise<void> {
    if (!this.enabled) return;

    const limiter = this.limiters.get(category);
    if (!limiter) return;

    const { success, reset } = await limiter.limit(identifier);

    if (!success) {
      throw new HttpException(
        {
          message:    'Muitas requisições. Tente novamente em breve.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
