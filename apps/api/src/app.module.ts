import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './core/config/env.schema';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    // Configuração global com validação Zod no boot
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting global (ThrottlerModule — Upstash substituirá em Fase 3)
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60_000,
        limit: 100,
      },
      {
        name: 'long',
        ttl: 3_600_000,
        limit: 1000,
      },
    ]),

    // Módulos de negócio
    HealthModule,
  ],
})
export class AppModule {}
