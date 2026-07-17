// ── .env carregado ANTES de qualquer módulo (garante process.env para QueueModule.register) ──
// Carrega apps/api/.env explicitamente (path relativo ao CWD = apps/api/ via `npm run dev`).
// Replit Secrets já estão em process.env — valores existentes não são sobrepostos.
import * as fs from 'fs';
import * as path from 'path';

function loadLocalEnv(envPath: string): void {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const raw = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key] != null) continue;

    process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}

loadLocalEnv(path.resolve(__dirname, '../.env'));
loadLocalEnv(path.resolve(process.cwd(), '.env'));

// ── Sentry DEVE ser o segundo import ───────────────────────────────────────────
import './instrument';

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, RequestMethod } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
// `import =` para interop CJS: compression não expõe `.default`, então o default
// import quebra em runtime sob ts-node (esModuleInterop off). Funciona sob tsx e ts-node.
import compression = require('compression');
import * as express from 'express';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';
import { collectSupabaseEnvErrors } from './core/config/env.schema';
import { isProdLike } from './core/config/runtime-environment';

// Silencia erros de conexão Redis inacessível em ambiente de desenvolvimento
// (ex: redis.railway.internal não está disponível fora da Railway private network)
const NETWORK_CODES = new Set(['ENOTFOUND', 'ECONNREFUSED', 'ECONNRESET', 'EPIPE', 'ETIMEDOUT']);
const NET_LOG_THROTTLE_MS = 30_000;
let __netLastCode = '';
let __netLastLogAt = 0;

function assertApiRuntimeEnv(logger: Logger): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const prodLike = isProdLike(nodeEnv);
  // Núcleo puro e testável do guard (matriz de ambientes, denylist cruzada,
  // coerência URL×JWT×connection strings) vive em env.schema.ts.
  const errors = collectSupabaseEnvErrors(process.env as Record<string, string | undefined>, nodeEnv);

  if (prodLike) {
    for (const flag of ['USE_MOCK', 'MOCK_MODE', 'AUTH_DISABLED'] as const) {
      if (process.env[flag] === 'true') {
        errors.push(`${flag}=true e proibido em NODE_ENV=${nodeEnv}`);
      }
    }
  }

  if (errors.length > 0) {
    logger.error(`FATAL: ambiente Supabase invalido:\n${errors.map((err) => `  - ${err}`).join('\n')}`);
    process.exit(1);
  }
}

function suppressNetworkNoise(err: NodeJS.ErrnoException): boolean {
  if (!err.code || !NETWORK_CODES.has(err.code)) return false;
  const now = Date.now();
  if (err.code === __netLastCode && now - __netLastLogAt < NET_LOG_THROTTLE_MS) return true;
  __netLastCode = err.code;
  __netLastLogAt = now;
  console.warn(`[net] Conexao indisponivel (${err.code}): ${err.message?.split('\n')[0]}`);
  return true;
}

process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (suppressNetworkNoise(err)) return;
  throw err;
});

process.on('unhandledRejection', (reason: unknown) => {
  if (reason instanceof Error && suppressNetworkNoise(reason as NodeJS.ErrnoException)) return;
  throw reason;
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  assertApiRuntimeEnv(logger);

  // ── Production security gates (fail-closed) ────────────────────────────────
  // Abort startup if someone tries to run production with auth/RBAC/tenant
  // bypassed or with mock mode enabled. These are not silent — the process exits.
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  if (isProdLike(nodeEnv)) {
    if (process.env.AUTH_DISABLED === 'true') {
      logger.error(`FATAL: AUTH_DISABLED=true is forbidden in ${nodeEnv}. Aborting.`);
      process.exit(1);
    }
    if (process.env.MOCK_MODE === 'true' || process.env.VITE_MOCK_MODE === 'true') {
      logger.error(`FATAL: MOCK_MODE=true is forbidden in ${nodeEnv}. Aborting.`);
      process.exit(1);
    }
  }

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody:    true,
  });

  // ── WebSocket adapter (Socket.IO) — required for @WebSocketGateway to handle /socket.io/ ──
  app.useWebSocketAdapter(new IoAdapter(app));

  // ── Segurança ──────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: isProdLike(process.env['NODE_ENV']) ? [] : null,
        },
      },
      // HSTS: 1 year, include subdomains — only in production (HTTPS required)
      hsts: isProdLike(process.env['NODE_ENV'])
        ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
        : false,
      crossOriginEmbedderPolicy: false,
      // Prevent MIME-type sniffing
      noSniff: true,
      // Block clickjacking
      frameguard: { action: 'deny' },
      // Disable XSS filter (modern browsers don't support it; CSP is better)
      xssFilter: false,
    }),
  );

  app.use(
    compression({
      // Skip socket.io polling responses — long-poll body must stream unmodified
      filter: (req, res) => {
        if (req.path?.startsWith('/socket.io/')) return false;
        return compression.filter(req, res);
      },
    }),
  );

  // ── Body limits (1MB) — PayloadTooLargeError → 413 via GlobalExceptionFilter ──
  // This parser runs BEFORE Nest's internal rawBody-aware parser and consumes the
  // stream, so it must populate req.rawBody itself or Stripe webhook signature
  // verification (billing.controller → req.rawBody) receives undefined → 400.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as typeof req & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: '1mb', extended: true }));

  // ── CORS ─────────────────────────────────────────────────────────────────────
  const prodLikeCors = isProdLike(process.env['NODE_ENV']);
  const allowedOrigins = (
    process.env['CORS_ORIGINS'] ?? (prodLikeCors ? '' : 'http://localhost:5000')
  ).split(',').map((origin) => origin.trim()).filter(Boolean);

  const isDevEnv = !prodLikeCors;

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // In dev, accept Replit preview domains and any localhost port
      if (isDevEnv) {
        if (origin.endsWith('.replit.dev') || origin.endsWith('.replit.app')) {
          return callback(null, true);
        }
        if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
          return callback(null, true);
        }
      }
      // Silent reject: no Access-Control-Allow-Origin header is set, browser blocks.
      // Avoids leaking 500 + server headers to attackers.
      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-Trace-ID',
      'traceparent',
      'X-Idempotency-Key',
    ],
    exposedHeaders: [
      'X-Request-ID',
      'X-Correlation-ID',
      'X-Trace-ID',
      'X-Idempotency-Replayed',
    ],
  });

  // ── Prefixo global ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'metrics', method: RequestMethod.GET },
      { path: 'admin/queues', method: RequestMethod.ALL },
      { path: 'admin/queues/(.*)', method: RequestMethod.ALL },
    ],
  });

  // ── Pipes, Filters, Interceptors ─────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // ── Swagger (dev/test apenas) ────────────────────────────────────────────────
  if (!isProdLike(process.env['NODE_ENV'])) {
    try {
      const config = new DocumentBuilder()
        .setTitle('MUSIC OS 360° API')
        .setDescription('Enterprise Music Management SaaS — API REST')
        .setVersion('1.0')
        .addBearerAuth(
          { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          'JWT',
        )
        .addServer(`http://localhost:${process.env['PORT'] ?? 3001}`, 'Development')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('docs', app, document, {
        swaggerOptions: { persistAuthorization: true },
      });
    } catch (err) {
      logger.warn(`Swagger desativado neste boot: ${String(err)}`);
    }
  }

  // ── Graceful Shutdown ────────────────────────────────────────────────────────
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM recebido — iniciando graceful shutdown...');
    await app.close();
    process.exit(0);
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  logger.log(`🎵 MUSIC OS 360° API rodando em http://localhost:${port}/api/v1`);

  if (!isProdLike(process.env['NODE_ENV'])) {
    logger.log(`📚 Swagger em http://localhost:${port}/docs`);
  }
}

bootstrap().catch((err: unknown) => {
  console.error('Falha crítica no bootstrap:', err);
  process.exit(1);
});
// touch Sun May 24 03:01:20     2026
// fase10b trigger Sun May 24 11:24:00     2026
