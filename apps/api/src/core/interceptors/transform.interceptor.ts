import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponse<T> {
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((value) => {
        // Se o valor já tem formato { data, meta }, preservar
        if (
          value !== null &&
          typeof value === 'object' &&
          'data' in value &&
          !Array.isArray(value)
        ) {
          return {
            ...value,
            timestamp: new Date().toISOString(),
          } as ApiResponse<T>;
        }

        // Caso contrário, envolver em { data }
        return {
          data: value,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
