import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { v4 as uuidv4 }     from 'uuid';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx       = host.switchToHttp();
    const response  = ctx.getResponse<Response>();
    const request   = ctx.getRequest<Request>();
    const requestId = (request.headers['x-request-id'] as string) || uuidv4();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Erro interno do servidor';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp['message'] as string | string[]) ?? exception.message;
        error   = (resp['error']   as string)            ?? exception.name;
      }

      error = exception.name;

      // Não reportar 4xx ao Sentry (erros de cliente, não de sistema)
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);

      // Reportar ao Sentry apenas erros não-HTTP (bugs reais do sistema)
      this.reportToSentry(exception, request, requestId);
    }

    const errorBody = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path:      request.url,
      requestId,
    };

    this.logger.error(`${request.method} ${request.url} → ${statusCode} [${requestId}]`);

    response.status(statusCode).header('X-Request-ID', requestId).json(errorBody);
  }

  private reportToSentry(exception: Error, request: Request, requestId: string): void {
    try {
      // Sentry é inicializado em instrument.ts antes do bootstrap.
      // Aqui usamos import dinâmico para evitar crash se @sentry/node não estiver instalado.
      import('@sentry/node').then(Sentry => {
        Sentry.withScope(scope => {
          scope.setTag('requestId', requestId);
          scope.setTag('method',    request.method);
          scope.setTag('path',      request.url);

          const tenantId = (request as any).tenantId as string | undefined;
          const userId   = (request as any).userId   as string | undefined;
          if (tenantId) scope.setTag('tenantId', tenantId);
          if (userId)   scope.setUser({ id: userId });

          Sentry.captureException(exception);
        });
      }).catch(() => {
        // @sentry/node não instalado — silenciar
      });
    } catch {
      // Garantir que falha do Sentry nunca quebra a resposta HTTP
    }
  }
}
