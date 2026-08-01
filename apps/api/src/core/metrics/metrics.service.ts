/**
 * core/metrics/metrics.service.ts
 *
 * Prometheus metrics service. Exposes:
 *  - process_* (uptime, memory, cpu) via collectDefaultMetrics
 *  - musicos_http_requests_total{method,route,status}
 *  - musicos_http_request_duration_ms{method,route} (histogram)
 *  - musicos_queue_jobs{queue,state}                (gauge)
 *  - musicos_db_up                                   (gauge 0/1)
 *  - musicos_redis_up                                (gauge 0/1)
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Histogram,
  Gauge,
} from 'prom-client';
import type { RbacEvent } from '../../modules/rbac/contracts/rbac-event.contract';

@Injectable()
export class MetricsService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'musicos_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'musicos_http_request_duration_ms',
    help: 'HTTP request duration in ms',
    labelNames: ['method', 'route'] as const,
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000],
    registers: [this.registry],
  });

  readonly queueJobs = new Gauge({
    name: 'musicos_queue_jobs',
    help: 'Number of BullMQ jobs by queue and state',
    labelNames: ['queue', 'state'] as const,
    registers: [this.registry],
  });

  readonly dbUp = new Gauge({
    name: 'musicos_db_up',
    help: 'PostgreSQL reachable (1) or not (0)',
    registers: [this.registry],
  });

  readonly redisUp = new Gauge({
    name: 'musicos_redis_up',
    help: 'Redis reachable (1) or not (0)',
    registers: [this.registry],
  });

  // METRICS-01: tenant_id is a UUID with effectively unbounded cardinality —
  // one new Prometheus time series per tenant, per metric below, forever.
  // Per-tenant RBAC drill-down belongs in logs/traces (which already carry
  // tenantId — see rbac-telemetry.service.ts's audit insert and Sentry tag),
  // not in Prometheus label values. Deliberately excluded from labelNames.
  private readonly rbacLabels = [
    'role',
    'resource',
    'action',
    'authority',
  ] as const;

  readonly rbacRequestsTotal = new Counter({
    name: 'rbac_requests_total',
    help: 'Total RBAC permission decisions',
    labelNames: this.rbacLabels,
    registers: [this.registry],
  });

  readonly rbacAllowTotal = new Counter({
    name: 'rbac_allow_total',
    help: 'Total active RBAC allow decisions',
    labelNames: this.rbacLabels,
    registers: [this.registry],
  });

  readonly rbacDenyTotal = new Counter({
    name: 'rbac_deny_total',
    help: 'Total active RBAC deny decisions',
    labelNames: this.rbacLabels,
    registers: [this.registry],
  });

  readonly rbacWouldAllowTotal = new Counter({
    name: 'rbac_would_allow_total',
    help: 'Total requests denied by active authority that shadow would allow',
    labelNames: this.rbacLabels,
    registers: [this.registry],
  });

  readonly rbacWouldDenyTotal = new Counter({
    name: 'rbac_would_deny_total',
    help: 'Total requests allowed by active authority that shadow would deny',
    labelNames: this.rbacLabels,
    registers: [this.registry],
  });

  readonly rbacCacheHitTotal = new Counter({
    name: 'rbac_cache_hit_total',
    help: 'Total RBAC resolver cache hits',
    labelNames: this.rbacLabels,
    registers: [this.registry],
  });

  readonly rbacCacheMissTotal = new Counter({
    name: 'rbac_cache_miss_total',
    help: 'Total RBAC resolver cache misses',
    labelNames: this.rbacLabels,
    registers: [this.registry],
  });

  readonly rbacLatencyMs = new Histogram({
    name: 'rbac_latency_ms',
    help: 'RBAC dual-read decision latency in milliseconds',
    labelNames: this.rbacLabels,
    buckets: [0.5, 1, 2, 5, 10, 25, 50, 100, 250, 500],
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({ register: this.registry, prefix: 'musicos_node_' });
  }

  recordRbacDecision(event: RbacEvent): void {
    const labels = {
      role: event.roleSlug ?? 'unknown',
      resource: event.resource,
      action: event.action,
      authority: event.authorityMode,
    };
    this.rbacRequestsTotal.inc(labels);
    (event.activeDecision === 'ALLOW'
      ? this.rbacAllowTotal
      : this.rbacDenyTotal
    ).inc(labels);
    if (event.wouldAllow) this.rbacWouldAllowTotal.inc(labels);
    if (event.wouldDeny) this.rbacWouldDenyTotal.inc(labels);
    (event.cacheHit ? this.rbacCacheHitTotal : this.rbacCacheMissTotal).inc(
      labels,
    );
    this.rbacLatencyMs.observe(labels, event.latencyMs);
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }
}
