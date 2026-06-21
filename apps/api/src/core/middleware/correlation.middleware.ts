/**
 * correlation.middleware.ts
 *
 * NestJS middleware that injects a correlation ID into every HTTP request.
 *
 * - Reads  `x-correlation-id` header if provided by the caller.
 * - Otherwise generates a new UUID v4.
 * - Stores the id in AsyncLocalStorage via CorrelationContext so all
 *   domain events emitted during the request lifecycle carry the same id.
 * - Echoes the id back in the `x-correlation-id` response header.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { CorrelationContext } from '../events/correlation.context';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
      traceId?: string;
    }
  }
}

function traceIdFromTraceparent(value: string | undefined): string | null {
  if (!value) return null;
  const match = value
    .trim()
    .match(/^[\da-f]{2}-([\da-f]{32})-([\da-f]{16})-[\da-f]{2}$/i);
  if (!match || /^0{32}$/.test(match[1])) return null;
  return match[1].toLowerCase();
}

function validExternalId(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^[A-Za-z0-9._:-]{1,128}$/.test(trimmed) ? trimmed : null;
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const traceparent = Array.isArray(req.headers['traceparent'])
      ? req.headers['traceparent'][0]
      : req.headers['traceparent'];
    const incomingTrace = Array.isArray(req.headers['x-trace-id'])
      ? req.headers['x-trace-id'][0]
      : req.headers['x-trace-id'];
    const incomingCorrelation = Array.isArray(
      req.headers['x-correlation-id'],
    )
      ? req.headers['x-correlation-id'][0]
      : req.headers['x-correlation-id'];
    const traceId =
      traceIdFromTraceparent(traceparent) ??
      validExternalId(incomingTrace) ??
      validExternalId(incomingCorrelation) ??
      randomUUID().replace(/-/g, '');

    req.traceId = traceId;
    req.correlationId = traceId;
    res.setHeader('X-Trace-ID', traceId);
    res.setHeader('X-Correlation-ID', traceId);

    CorrelationContext.run(traceId, () => next());
  }
}
