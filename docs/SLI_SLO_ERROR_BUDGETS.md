# MUSIC OS 360 — SLI / SLO / Error Budget Policy

> **Status**: Active  
> **Review cycle**: Quarterly  
> **Owner**: Platform Engineering

---

## Service Level Indicators (SLIs)

SLIs are measured metrics that quantify service reliability.

| SLI | Definition | Source | Window |
|---|---|---|---|
| **API Success Rate** | % requests returning non-5xx | Sentry / logs | 30 days rolling |
| **API P95 Latency** | 95th percentile response time | Log `latency_ms` | 7 days rolling |
| **Auth Success Rate** | % JWT validations that succeed | Sentry / logs | 30 days rolling |
| **Webhook Processing Rate** | % Stripe webhooks processed < 30s | Stripe dashboard | 30 days rolling |
| **Queue Processing Rate** | % BullMQ jobs completed without DLQ | BullMQ metrics | 7 days rolling |
| **Dunning Cycle Success** | % scheduled dunning runs completing without error | Logs | 30 days |

---

## Service Level Objectives (SLOs)

| SLO | Target | Error Budget (30 days) |
|---|---|---|
| API Success Rate | ≥ 99.5% | 21.9 min outage |
| API P95 Latency | ≤ 800 ms | 4 hrs above threshold |
| Auth Success Rate | ≥ 99.9% | 4.3 min failure |
| Stripe Webhook Processing | ≥ 99.0% | 7.2 hrs |
| Queue Processing | ≥ 98.0% | 14.4 hrs |
| Dunning Cycle | ≥ 99.0% | 7.2 hrs |

---

## Error Budget Policy

### Budget Consumption Triggers

| Budget Consumed | Action |
|---|---|
| > 25% | Engineering team notified; review dashboard |
| > 50% | Freeze non-critical deployments; incident review |
| > 75% | Deploy freeze (critical fixes only); post-mortem required |
| 100% | Full incident response; SLA breach notification to stakeholders |

### Budget Consumption Calculation

```
Budget consumed (%) = 
  (Actual downtime / Total allowed downtime) × 100

Example:
  SLO: 99.5% availability → 0.5% budget → 21.9 min/month
  Actual outage: 10 min
  Budget consumed: (10 / 21.9) × 100 = 45.7%
```

---

## Measurement Implementation

### API Success Rate
```sql
-- Measured from structured log ingestion
SELECT
  COUNT(*) FILTER (WHERE status_code >= 500)::float / COUNT(*) AS error_rate
FROM request_logs
WHERE ts > NOW() - INTERVAL '30 days';
```

### P95 Latency
```sql
SELECT PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms)
FROM request_logs
WHERE ts > NOW() - INTERVAL '7 days';
```

### Auth Success Rate
Measured via Sentry performance monitoring:
- Track `JwtAuthGuard.canActivate()` → success vs. exception ratio
- Exclude `UnauthorizedException` for expired/invalid tokens (expected)
- Only track internal failures (JWKS fetch errors, validation exceptions)

---

## SLO Review Process

1. **Weekly**: Review Sentry dashboard and log alerts
2. **Monthly**: Calculate actual SLIs vs. SLOs; update error budget tracker
3. **Quarterly**: Review and adjust SLO targets based on actual performance
4. **Post-incident**: Update relevant SLIs/SLOs based on incident learnings

---

## Alerting Thresholds

| Metric | Warning | Critical |
|---|---|---|
| 5xx rate (5 min window) | > 1% | > 5% |
| P95 latency | > 600 ms | > 1200 ms |
| DB connection failures | Any | > 3 consecutive |
| Redis queue backlog | > 1000 jobs | > 10000 jobs |
| Auth failure rate | > 1% | > 5% |
| Dunning missed | — | Any scheduled miss |

---

## Infrastructure SLOs (Future)

When moving to Kubernetes/multi-region:

| SLO | Target |
|---|---|
| Pod restart rate | < 1 restart/pod/day |
| Deployment success rate | ≥ 99% |
| DB failover time | < 30 seconds |
| Multi-region sync lag | < 100 ms |
