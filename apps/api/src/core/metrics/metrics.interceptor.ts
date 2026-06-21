/**
 * core/metrics/metrics.interceptor.ts
 *
 * Records HTTP request count + duration histogram on every request.
 * Route label is taken from `req.route?.path` (Express pattern) so cardinality
 * stays bounded — never logs full URL with IDs as label.
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request>();
    const res = httpCtx.getResponse<Response>();
    const start = Date.now();

    const record = (statusOverride?: number) => {
      const status = String(statusOverride ?? res.statusCode);
      const route = (req.route?.path as string | undefined) ?? req.path ?? 'unknown';
      const method = req.method ?? 'UNKNOWN';
      this.metrics.httpRequestsTotal.labels(method, route, status).inc();
      this.metrics.httpRequestDuration.labels(method, route).observe(Date.now() - start);
    };

    return next.handle().pipe(
      tap({
        next: () => record(),
        error: (err: unknown) => {
          const status =
            err && typeof err === 'object' && 'status' in err
              ? (err as { status: number }).status
              : 500;
          record(status);
        },
      }),
    );
  }
}
