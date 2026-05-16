/**
 * health/health.controller.ts
 *
 * Endpoint público de health check — usado por load balancers, k8s probes
 * e alertas de monitoramento.
 *
 * GET /api/v1/health          → liveness + readiness + DB + memória
 * GET /api/v1/health/live     → liveness only (processo up)
 * GET /api/v1/health/ready    → readiness (DB conectado)
 */

import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  DiskHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';
import { DatabaseHealthIndicator } from './indicators/database.indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  /** Full health check — liveness + readiness + resources */
  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Full health check (liveness + readiness + resources)' })
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),   // 512 MB
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),    // 1 GB
    ]);
  }

  /** Liveness probe — apenas verifica se o processo está UP (sem DB) */
  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe (processo up)' })
  liveness() {
    return {
      status:          'up',
      ts:              new Date().toISOString(),
      uptime_seconds:  Math.round(process.uptime()),
      version:         process.env['npm_package_version'] ?? '1.0.0',
      environment:     process.env['NODE_ENV'] ?? 'development',
    };
  }

  /** Readiness probe — verifica se a DB está acessível */
  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe (DB conectado)' })
  readiness() {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }
}
