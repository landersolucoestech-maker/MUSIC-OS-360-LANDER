import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  module?: string;
  tenantId?: string;
  userId?: string;
  requestId?: string;
  [key: string]: unknown;
}

@Injectable({ scope: Scope.DEFAULT })
export class LoggerService implements NestLoggerService {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  setContext(context: string) { this.context = context; }

  private format(level: LogLevel, msg: string, ctx?: LogContext): string {
    const ts = new Date().toISOString();
    const mod = ctx?.module ?? this.context ?? 'app';
    const base = { ts, level, module: mod, msg };
    if (ctx) return JSON.stringify({ ...base, ...ctx });
    return JSON.stringify(base);
  }

  log(message: string, context?: string) { console.log(this.format('info', message, context ? { module: context } : undefined)); }
  error(message: string, trace?: string, context?: string) { console.error(this.format('error', message, { module: context ?? this.context, trace })); }
  warn(message: string, context?: string) { console.warn(this.format('warn', message, context ? { module: context } : undefined)); }
  debug(message: string, context?: string) { console.debug(this.format('debug', message, context ? { module: context } : undefined)); }
  verbose(message: string, context?: string) { console.log(this.format('trace', message, context ? { module: context } : undefined)); }

  info(msg: string, ctx?: LogContext) { console.log(this.format('info', msg, ctx)); }
  fatal(msg: string, ctx?: LogContext) { console.error(this.format('fatal', msg, ctx)); }

  child(ctx: LogContext): LoggerService {
    const child = new LoggerService(ctx.module ?? this.context);
    return child;
  }
}
