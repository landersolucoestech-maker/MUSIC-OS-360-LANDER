/**
 * cache/cache.module.ts
 *
 * Módulo Upstash Redis para cache e rate limiting.
 * Usa o cliente @upstash/redis com REST API (funciona em edge e serverless).
 *
 * Token: UPSTASH_REDIS_TOKEN
 * URL:   UPSTASH_REDIS_URL
 */

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

export const UPSTASH_REDIS = Symbol('UPSTASH_REDIS');

@Global()
@Module({
  providers: [
    {
      provide: UPSTASH_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('CacheModule');

        const url   = config.get<string>('UPSTASH_REDIS_URL');
        const token = config.get<string>('UPSTASH_REDIS_TOKEN');

        if (!url || !token) {
          logger.warn(
            'UPSTASH_REDIS_URL / UPSTASH_REDIS_TOKEN não configurados — cache desactivado',
          );
          return null;
        }

        const redis = new Redis({ url, token });
        logger.log('Upstash Redis conectado (cache / rate-limit)');
        return redis;
      },
    },
  ],
  exports: [UPSTASH_REDIS],
})
export class CacheModule {}
