// ── Sentry DEVE ser o primeiro import ──────────────────────────────────────────
import './instrument';

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './core/filters/global-exception.filter';
import { TransformInterceptor } from './core/interceptors/transform.interceptor';
import { LoggingInterceptor } from './core/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

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
        'Clerk JWT',
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
