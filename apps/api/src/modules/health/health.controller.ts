/**
 * health/health.controller.ts
 *
 * Public surface:
 *   GET /api/v1/health/live     -> liveness only
 *
 * Protected surface:
 *   GET /api/v1/health          -> full health details
 *   GET /api/v1/health/ready    -> readiness details
 *   GET /api/v1/health/integrations -> integration circuit breaker states
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
import { CircuitBreakerRegistry } from '../../core/resilience/circuit-breaker.registry';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly disk: DiskHealthIndicator,
    private readonly db: DatabaseHealthIndicator,
    private readonly cbRegistry: CircuitBreakerRegistry,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Protected full health check' })
  check() {
    return this.health.check([
      () => this.db.isHealthy('database'),
      () => this.memory.checkHeap('memory_heap', 512 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 1024 * 1024 * 1024),
    ]);
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Public liveness probe' })
  liveness() {
    return {
      status: 'up',
      ts: new Date().toISOString(),
    };
  }

  @Get('integrations')
  @ApiOperation({ summary: 'Protected circuit breaker states for external integrations' })
  integrations() {
    return {
      ts: new Date().toISOString(),
      breakers: this.cbRegistry.getStates(),
    };
  }

  @Get('ready')
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: 'Public readiness probe (200 healthy / 503 degraded)' })
  readiness() {
    return this.health.check([
      () => this.db.isHealthy('database'),
    ]);
  }
}
