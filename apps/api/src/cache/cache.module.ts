/**
 * cache/cache.module.ts
 *
 * Módulo Upstash Redis para cache e rate limiting.
 * Usa o cliente @upstash/redis com REST API (funciona em edge e serverless).
 *
 * Token: UPSTASH_REDIS_TOKEN
 * URL:   UPSTASH_REDIS_URL   (deve começar com https://)
 *
 * Se o URL não for Upstash (https://), o módulo fica desactivado graciosamente.
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

        if (!url.startsWith('https://')) {
          logger.warn(
            `UPSTASH_REDIS_URL deve começar com https:// (Upstash REST API). ` +
            `Recebido: "${url.substring(0, 20)}..." — cache desactivado`,
          );
          return null;
        }

        try {
          const redis = new Redis({ url, token });
          logger.log('Upstash Redis conectado (cache / rate-limit)');
          return redis;
        } catch (err) {
          logger.warn(`Falha ao conectar Upstash Redis: ${err.message} — cache desactivado`);
          return null;
        }
      },
    },
  ],
  exports: [UPSTASH_REDIS],
})
export class CacheModule {}
