// ── dotenv carregado ANTES de qualquer módulo (garante process.env para QueueModule.register) ──
// Carrega apps/api/.env explicitamente (path relativo ao CWD = apps/api/ via `npm run dev`).
// Replit Secrets já estão em process.env — dotenv não sobrepõe valores existentes.
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ── Sentry DEVE ser o segundo import ───────────────────────────────────────────
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

// Silencia erros de conexão Redis inacessível em ambiente de desenvolvimento
// (ex: redis.railway.internal não está disponível fora da Railway private network)
process.on('uncaughtException', (err: NodeJS.ErrnoException) => {
  if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET') {
    // erros de rede não fatais — log limpo sem stack trace
    console.warn(`[Redis] Conexão indisponível (${err.code}): ${err.message?.split('\n')[0]}`);
    return;
  }
  // outros erros não capturados → relança
  throw err;
});

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // ── DEV AUTH BYPASS — startup safeguard ──────────────────────────────────────
  // Recusa absolutamente iniciar em produção com bypass activo.
  // Esta verificação é independente dos guards — é a primeira linha de defesa.
  if (process.env['DEV_AUTH_BYPASS'] === 'true') {
    if (process.env['NODE_ENV'] === 'production') {
      logger.error(
        '════════════════════════════════════════════════════════════════\n' +
        '  ERRO FATAL: DEV_AUTH_BYPASS=true detectado em NODE_ENV=production.\n' +
        '  Esta configuração desactiva autenticação/RBAC e NUNCA pode estar\n' +
        '  activa em produção. Remova DEV_AUTH_BYPASS do ambiente de produção.\n' +
        '════════════════════════════════════════════════════════════════',
      );
      process.exit(1);
    }
    logger.warn(
      '════════════════════════════════════════════════════════════════\n' +
      '  ⚠  DEV AUTH BYPASS ACTIVO — JWT, TenantGuard e RolesGuard\n' +
      '     desactivados. req.auth e req.tenant injectados com mock.\n' +
      '     NUNCA usar em produção. Apenas para desenvolvimento local.\n' +
      '════════════════════════════════════════════════════════════════',
    );
  }
  // ─────────────────────────────────────────────────────────────────────────────

  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    logger: ['error', 'warn', 'log', 'debug'],
    rawBody:    true,
  });

  // ── Segurança ────────────────────────────────────────────────────────────────
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  app.use(compression());

  // ── CORS ─────────────────────────────────────────────────────────────────────
  const allowedOrigins = (
    process.env['CORS_ORIGINS'] ?? 'http://localhost:5000'
  ).split(',');

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: ${origin} não permitido`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Tenant-ID',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Request-ID'],
  });

  // ── Prefixo global ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1');

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

  // ── Swagger (dev / staging apenas) ───────────────────────────────────────────
  if (process.env['NODE_ENV'] !== 'production') {
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

  if (process.env['NODE_ENV'] !== 'production') {
    logger.log(`📚 Swagger em http://localhost:${port}/docs`);
  }
}

bootstrap().catch((err: unknown) => {
  console.error('Falha crítica no bootstrap:', err);
  process.exit(1);
});
