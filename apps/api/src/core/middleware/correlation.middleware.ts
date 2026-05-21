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
    }
  }
}

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const existing = req.headers['x-correlation-id'];
    const correlationId =
      (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();

    req.correlationId = correlationId;
    res.setHeader('x-correlation-id', correlationId);

    CorrelationContext.run(correlationId, () => next());
  }
}
