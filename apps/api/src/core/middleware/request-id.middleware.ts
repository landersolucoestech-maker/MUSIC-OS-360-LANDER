/**
 * core/middleware/request-id.middleware.ts
 *
 * Middleware de correlação de requests.
 * Lê X-Request-ID do header de entrada ou gera um novo UUID.
 * Propaga o requestId no header de resposta e no objeto request
 * para que interceptors e filters possam incluí-lo nos logs.
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extensão do Request do Express para transportar o requestId
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers['x-request-id'];
    const requestId =
      typeof incoming === 'string' && incoming.trim()
        ? incoming.trim()
        : uuidv4();

    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
