/**
 * core/interceptors/idempotency.interceptor.ts
 *
 * Prevents duplicate execution of critical write operations.
 *
 * Usage: decorate a controller method with @UseInterceptors(IdempotencyInterceptor)
 * or apply globally to POST routes on specific controllers.
 *
 * The client sends `X-Idempotency-Key: <uuid>` with each request.
 * If the same key is seen again within TTL_MS for the same user, the interceptor
 * returns the previously cached response without re-executing the handler.
 *
 * Cache key: `{userId}:{idempotencyKey}` — scoped per user to prevent
 * cross-user key collisions.
 *
 * TTL: 24 hours (configurable via IDEMPOTENCY_TTL_HOURS env var).
 *
 * Note: In-memory store — safe for single-instance deployments and dev.
 * Phase 8 will migrate to Redis-backed storage for multi-replica production.
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { Observable, of, tap } from 'rxjs';
import type { Request, Response } from 'express';
import type { JwtAuth } from '../guards/auth.guard';

interface CachedEntry {
  body:        unknown;
  statusCode:  number;
  expiresAt:   number;
}

const HEADER = 'x-idempotency-key';
const TTL_MS = (parseInt(process.env['IDEMPOTENCY_TTL_HOURS'] ?? '24', 10) || 24) * 60 * 60 * 1000;

// Module-level store (shared across all handler invocations, cleared on restart).
const store = new Map<string, CachedEntry>();

// Evict expired entries every 10 minutes to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}, 10 * 60 * 1000).unref();

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request & { auth?: JwtAuth }>();

    const idempotencyKey = req.headers[HEADER] as string | undefined;
    if (!idempotencyKey) return next.handle();

    // Validate key format (must be a UUID or alphanumeric, max 128 chars).
    if (!/^[\w\-]{1,128}$/.test(idempotencyKey)) {
      this.logger.warn(`Idempotency key format inválido: ${idempotencyKey}`);
      return next.handle();
    }

    const userId  = req.auth?.userId ?? 'anon';
    const cacheKey = `${userId}:${idempotencyKey}`;
    const now      = Date.now();

    const cached = store.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      this.logger.log(`Idempotency hit: ${cacheKey} → returning cached response`);
      const res = context.switchToHttp().getResponse<Response>();
      res.setHeader('X-Idempotency-Replayed', 'true');
      res.status(cached.statusCode);
      return of(cached.body);
    }

    // Mark as in-flight to detect concurrent duplicate requests.
    if (store.get(cacheKey)?.expiresAt === -1) {
      throw new ConflictException('Requisição duplicada em andamento — aguarde a conclusão da requisição original');
    }

    // Placeholder to block concurrent duplicates.
    store.set(cacheKey, { body: null, statusCode: 0, expiresAt: -1 });

    return next.handle().pipe(
      tap({
        next: (body) => {
          const res = context.switchToHttp().getResponse<Response>();
          store.set(cacheKey, {
            body,
            statusCode: res.statusCode,
            expiresAt:  now + TTL_MS,
          });
        },
        error: () => {
          // On error, remove the placeholder so the client can retry.
          store.delete(cacheKey);
        },
      }),
    );
  }
}
