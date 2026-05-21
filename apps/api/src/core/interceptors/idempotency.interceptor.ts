/**
 * core/interceptors/idempotency.interceptor.ts
 *
 * Prevents duplicate execution of critical write operations.
 *
 * Usage: @UseInterceptors(IdempotencyInterceptor) on a controller method.
 *
 * The client sends `X-Idempotency-Key: <uuid>` with each request.
 * If the same key is seen again within TTL for the same user, the interceptor
 * returns the previously cached response without re-executing the handler.
 *
 * Cache key: `{userId}:{idempotencyKey}` — scoped per user.
 *
 * TTL: 24 hours (configurable via IDEMPOTENCY_TTL_HOURS env var, validated 1–168h).
 *
 * Storage: IdempotencyStore (Redis in production, in-memory in dev).
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, from, switchMap, tap, of } from 'rxjs';
import type { Request, Response } from 'express';
import type { JwtAuth } from '../guards/auth.guard';
import { IdempotencyStore } from './idempotency.store';

const HEADER = 'x-idempotency-key';
const TTL_MS = (parseInt(process.env['IDEMPOTENCY_TTL_HOURS'] ?? '24', 10) || 24) * 60 * 60 * 1000;

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(private readonly store: IdempotencyStore) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { auth?: JwtAuth }>();

    const idempotencyKey = req.headers[HEADER] as string | undefined;
    if (!idempotencyKey) return next.handle();

    if (!/^[\w\-]{1,128}$/.test(idempotencyKey)) {
      this.logger.warn(`Idempotency key format inválido: ${idempotencyKey}`);
      return next.handle();
    }

    const userId   = req.auth?.userId ?? 'anon';
    const cacheKey = `${userId}:${idempotencyKey}`;
    const now      = Date.now();

    return from(this.store.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          // In-flight placeholder — concurrent duplicate
          if (cached.expiresAt === -1) {
            throw new ConflictException('Requisição duplicada em andamento — aguarde a conclusão da requisição original');
          }

          // Expired entries that Redis didn't evict yet
          if (cached.expiresAt <= now) {
            return this.executeAndCache(context, next, cacheKey, now);
          }

          // Cache hit — replay
          this.logger.log(`Idempotency hit: ${cacheKey} → returning cached response`);
          const res = context.switchToHttp().getResponse<Response>();
          res.setHeader('X-Idempotency-Replayed', 'true');
          res.status(cached.statusCode);
          return of(cached.body);
        }

        return this.executeAndCache(context, next, cacheKey, now);
      }),
    );
  }

  private executeAndCache(
    context:  ExecutionContext,
    next:     CallHandler,
    cacheKey: string,
    now:      number,
  ): Observable<unknown> {
    return from(this.store.setInflight(cacheKey)).pipe(
      switchMap(() =>
        next.handle().pipe(
          tap({
            next: (body) => {
              const res = context.switchToHttp().getResponse<Response>();
              void this.store.set(cacheKey, { body, statusCode: res.statusCode, expiresAt: now + TTL_MS }, TTL_MS);
            },
            error: () => {
              void this.store.delete(cacheKey);
            },
          }),
        ),
      ),
    );
  }
}
