/**
 * core/interceptors/etag.interceptor.ts
 *
 * Adiciona ETag + Cache-Control a respostas GET bem-sucedidas.
 * Se o cliente enviar If-None-Match igual ao ETag calculado, retorna 304.
 *
 * Uso: registar globalmente ou por rota com @UseInterceptors(ETagInterceptor).
 */

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map }        from 'rxjs/operators';
import { createHash } from 'crypto';
import type { Request, Response } from 'express';

const DEFAULT_MAX_AGE = 30; // segundos

@Injectable()
export class ETagInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http     = context.switchToHttp();
    const request  = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    if (request.method !== 'GET') return next.handle();

    return next.handle().pipe(
      map((body) => {
        if (response.headersSent) return body;

        const json = JSON.stringify(body ?? null);
        const etag = `"${createHash('sha1').update(json).digest('hex').slice(0, 16)}"`;

        response.setHeader('ETag', etag);
        response.setHeader('Cache-Control', `private, max-age=${DEFAULT_MAX_AGE}, must-revalidate`);
        response.setHeader('Vary', 'Accept-Encoding, Authorization');

        const ifNoneMatch = request.headers['if-none-match'];
        if (ifNoneMatch && ifNoneMatch === etag) {
          response.status(304).end();
          return null;
        }

        return body;
      }),
    );
  }
}
