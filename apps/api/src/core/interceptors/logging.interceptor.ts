import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url } = request;
    const startMs = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - startMs;
          const status = context.switchToHttp().getResponse().statusCode;
          this.logger.log(`${method} ${url} → ${status} [${ms}ms]`);
        },
        error: (err: unknown) => {
          const ms = Date.now() - startMs;
          const status =
            err && typeof err === 'object' && 'status' in err
              ? (err as { status: number }).status
              : 500;
          this.logger.warn(`${method} ${url} → ${status} [${ms}ms]`);
        },
      }),
    );
  }
}
