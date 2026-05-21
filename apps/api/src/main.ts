// â”€â”€ .env carregado ANTES de qualquer mÃ³dulo (garante process.env para QueueModule.register) â”€â”€
// Carrega apps/api/.env explicitamente (path relativo ao CWD = apps/api/ via `npm run dev`).
// Replit Secrets jÃ¡ estÃ£o em process.env â€” valores existentes nÃ£o sÃ£o sobrepostos.
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

loadLocalEnv(path.resolve(process.cwd(), '.env'));

// â”€â”€ Sentry DEVE ser o segundo import â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import './instrument';

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';

// Silencia erros de conexÃ£o Redis inacessÃ­vel em ambiente de desenvolvimento
// (ex: redis.railway.internal nÃ£o estÃ¡ disponÃ­vel fora da Railway private network)
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
    // erros de rede nÃ£o fatais â€” log limpo sem stack trace
    console.warn(`[Redis] ConexÃ£o indisponÃ­vel (${err.code}): ${err.message?.split('\n')[0]}`);
    return;
  }
  // outros erros nÃ£o capturados â†’ relanÃ§a
  throw err;
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody:    true,
  });

  // â”€â”€ SeguranÃ§a â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: process.env['NODE_ENV'] === 'production' ? [] : null,
        },
      },
      // HSTS: 1 year, include subdomains â€” only in production (HTTPS required)
      hsts: process.env['NODE_ENV'] === 'production'
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

  app.use(compression());

  // â”€â”€ CORS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const allowedOrigins = (
    process.env['CORS_ORIGINS'] ?? 'http://localhost:5000'
  ).split(',');

  const isDevEnv = process.env['NODE_ENV'] !== 'production';

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
      callback(new Error(`CORS: ${origin} nÃ£o permitido`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Request-ID',
      'X-Correlation-ID',
      'X-Idempotency-Key',
    ],
    exposedHeaders: ['X-Request-ID', 'X-Correlation-ID', 'X-Idempotency-Replayed'],
  });

  // â”€â”€ Prefixo global â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.setGlobalPrefix('api/v1');

  // â”€â”€ Pipes, Filters, Interceptors â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Swagger (dev / staging apenas) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (process.env['NODE_ENV'] !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MUSIC OS 360Â° API')
      .setDescription('Enterprise Music Management SaaS â€” API REST')
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
  }

  // â”€â”€ Graceful Shutdown â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  app.enableShutdownHooks();

  process.on('SIGTERM', async () => {
    logger.log('SIGTERM recebido â€” iniciando graceful shutdown...');
    await app.close();
    process.exit(0);
  });

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  logger.log(`ðŸŽµ MUSIC OS 360Â° API rodando em http://localhost:${port}/api/v1`);

  if (process.env['NODE_ENV'] !== 'production') {
    logger.log(`ðŸ“š Swagger em http://localhost:${port}/docs`);
  }
}

bootstrap().catch((err: unknown) => {
  console.error('Falha crÃ­tica no bootstrap:', err);
  process.exit(1);
});
