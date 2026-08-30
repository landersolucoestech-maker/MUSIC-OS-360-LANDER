# RUNBOOK — Incident Response

**Audience**: anyone responding to a production incident in MUSIC OS 360.
**Companion doc**: [`RUNBOOK_ROLLBACK.md`](RUNBOOK_ROLLBACK.md) for executing rollbacks.

---

## 1. Severity levels

| Sev | Definition | Examples | Target response | Target mitigation |
|---|---|---|---|---|
| **SEV-1** | platform-wide outage; data loss; security incident | API 5xx >50%; login broken; data leak suspected; ransomware indicators | ≤5min ack | ≤30min mitigated |
| **SEV-2** | core feature broken for all users | uploads broken; billing webhooks failing; cross-tenant leak | ≤15min ack | ≤2h mitigated |
| **SEV-3** | core feature degraded OR single-tenant broken | latency p99 >5s; one integration down; one tenant cannot login | ≤1h ack | ≤8h mitigated |
| **SEV-4** | minor / cosmetic / single-user | toast not showing; chart label wrong; rate-limit too aggressive | next business day | ≤1 week |

If unsure → start at higher severity, downgrade later.

---

## 2. Roles during an incident

| Role | Responsibility | Default |
|---|---|---|
| **Incident Commander (IC)** | drives the response, makes the calls; not necessarily the most technical | on-call engineer |
| **Tech Lead (TL)** | hands-on debugging, runs commands; reads `RUNBOOK_ROLLBACK.md` | backup on-call |
| **Communicator** | updates status page + Slack + customer comms | product owner / support |
| **Scribe** | timeline log in Slack thread (cmd + outcome) | anyone available |

**One human cannot be both IC and TL on SEV-1.** Page a second person.

---

## 3. Communication channels

| Channel | When | Cadence |
|---|---|---|
| Slack `#ops-incident` | always — every action goes here | live |
| Slack `#ops-status` | SEV-1/2 only — read-only customer-facing summary | every 30min until mitigated |
| Status page (status.musicos360.com) | SEV-1/2 — public | initial within 15min; updates every 30min |
| Customer email | SEV-1 if downtime >1h, OR data incident | once mitigated + post-mortem link |
| Phone bridge | SEV-1 only | persistent until mitigated |

**Status page template** (initial):
> **[Investigating] API instability** — We are investigating elevated errors
> on api.musicos360.com. Some users may experience delays. Posted: HH:MM UTC.

**Status page template** (mitigated):
> **[Resolved] API instability** — Mitigated at HH:MM UTC. Root cause: <one line>.
> Full post-mortem within 5 business days.

---

## 4. On-call rotation

Configure in PagerDuty / Opsgenie / GitHub on-call schedule:

- **Primary**: rotates weekly. Notified for SEV-1/2.
- **Secondary**: same rotation, +1 week offset. Auto-paged if primary doesn't ack in 5min.
- **Tech Lead backup**: senior engineer always reachable for SEV-1.

Escalation chain:
1. Primary on-call (PD → mobile)
2. Secondary on-call (PD → mobile, 5min)
3. Tech Lead backup (Slack DM → phone, 15min)
4. CEO/CTO (phone only — SEV-1 with no mitigation in 1h)

---

## 5. Mitigation checklist (use during incident)

Print this section. Or pin in `#ops-incident`.

### SEV-1 first 5 minutes

- [ ] Declare incident in `#ops-incident` with the line: "INCIDENT SEV-1 OPEN — IC: @yourname"
- [ ] Open Slack thread for the incident timeline
- [ ] Update status page within 15min ([§3](#3-communication-channels))
- [ ] Open the Sentry/PostHog/Grafana dashboards. Note metrics at incident-start
- [ ] Identify symptom domain:
  - API 5xx → see "API down" below
  - DB unreachable → see "Database down" below
  - Auth broken → see "Auth/Supabase down" below
  - Queue stuck → see "Queue stuck" below
  - WebSocket only → low priority unless real-time feature critical

### API down (5xx >5%)

- [ ] `/health/live` from outside? if 503 → API container crashed → rollback (§2 of `RUNBOOK_ROLLBACK.md`)
- [ ] `/health/ready` 503 + live 200? → DB or Redis dependency down → see "Database down" or "Redis down"
- [ ] Recent deploy <30min ago? → rollback API image (§2)
- [ ] Sentry shows specific exception spike? → grep stack, find owning module, decide rollback vs hotfix

### Database down

- [ ] Confirm via Supabase status page / DB host dashboard
- [ ] `/metrics` shows `musicos_db_up 0` for >2min
- [ ] If Supabase/Neon outage → enable maintenance mode (§5), wait for upstream recovery, no rollback needed
- [ ] If DB host healthy but API can't connect → check pool stats, DNS, security groups
- [ ] If data corruption suspected → DO NOT WRITE; engage TL backup; prepare restore (§4 of rollback runbook)

### Redis down

- [ ] `/metrics` shows `musicos_redis_up 0`
- [ ] Confirm Upstash/Railway status
- [ ] App degrades gracefully (FASE 1E validated) — BullMQ goes into no-op, throttler suppresses spam
- [ ] No rollback needed; wait for upstream
- [ ] After recovery, verify queue counts in `/admin/queues`

### Auth/Supabase down

- [ ] Logins failing site-wide? confirm via test-login from incognito
- [ ] Supabase status page check
- [ ] No code change needed unless service-role-key rotated or env changed
- [ ] If env wrong → confirm `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` match project

### Queue stuck (BullMQ)

- [ ] Open `/admin/queues` (basic-auth)
- [ ] `wait` or `active` >100 for >5min on any queue → poison job or processor crash
- [ ] Check Sentry for processor exceptions
- [ ] Manual: delete poisoned jobs from BullBoard UI, or move to "failed"
- [ ] If processor itself crashed → rollback API image (§2 rollback)

### Cross-tenant data exposure (CRITICAL)

- [ ] **Immediately**: maintenance mode (§5) to stop further exposure
- [ ] Page CTO + CEO + security
- [ ] Identify scope: which user saw which tenant's data? grep `audit_logs` by `request_id` / `correlation_id`
- [ ] Preserve evidence: snapshot Sentry events, lock the audit_logs table changes
- [ ] Rotate `ENCRYPTION_KEY` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] LGPD/GDPR: 72-hour clock starts for breach notification
- [ ] Public disclosure via status page within 24h if confirmed

### Webhook/billing failures (Stripe)

- [ ] Check Stripe dashboard → Webhooks → recent attempts
- [ ] If signature errors → rotate `STRIPE_WEBHOOK_SECRET` and update both Stripe + env
- [ ] If processor errors → API logs by `request_id`
- [ ] No data risk; Stripe retries up to 3 days

---

## 6. Post-incident actions

| When | Action |
|---|---|
| Immediately after mitigation | Update status page → resolved. Post final Slack message. |
| Within 24h | Customer comm if SEV-1 with downtime >1h |
| Within 5 business days | Blameless post-mortem in `docs/post-mortems/YYYY-MM-DD-<slug>.md` with: timeline, root cause, what worked, what didn't, action items with owners + deadlines |
| Within 2 weeks | Implement P0/P1 action items from post-mortem |

**Post-mortem template skeleton**:
```markdown
# Post-mortem — <title> — <date>
- Severity: SEV-1
- Duration: <start> → <end> UTC (Xh Ymin)
- Customer impact: <one line>
- Detection: <how was it detected, time-to-detection>

## Timeline (UTC)
- HH:MM — event
- HH:MM — event

## Root cause
<technical narrative, no blame>

## What worked
## What didn't
## Action items
| # | item | owner | due | tracked at |
|---|---|---|---|---|
```

---

## 7. Severity declaration authority

- **SEV-1**: any engineer can declare, IC confirms within 5min
- **SEV-2**: any engineer
- **SEV-3**: IC during business hours
- **SEV-4**: triage during weekly sync

Downgrading a severity requires IC sign-off.

---

## 8. Drill cadence

- **Tabletop**: monthly — read this runbook + walk through 1 scenario in 30min team sync
- **Live drill**: quarterly — staging environment, full IC/TL/Comms split
- **Backup restore drill**: weekly automated ([`.github/workflows/backup.yml`](../.github/workflows/backup.yml) → `restore-drill` job)
- **Rollback drill**: quarterly — pick a non-critical change, rollback in staging, time it

---

## 9. Pre-incident readiness checklist

Before going to production, confirm:

- [ ] On-call rotation configured (PagerDuty/Opsgenie)
- [ ] `#ops-incident` Slack channel exists with everyone added
- [ ] Status page provisioned (statuspage.io / Atlassian / hosted)
- [ ] Sentry alert rules set (error rate >1%, p99 >5s)
- [ ] PostHog cohorts defined for canary monitoring
- [ ] Backup workflow ran successfully ≥3 times
- [ ] Restore drill ran successfully ≥1 time
- [ ] Rollback drill executed in staging
- [ ] All P0s from FASE 9.8 closed

This runbook is itself a checklist item — present at `docs/RUNBOOK_INCIDENT.md`.
