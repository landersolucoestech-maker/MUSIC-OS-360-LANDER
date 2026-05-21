# MUSIC OS 360 — Module Ownership Matrix

Ownership is functional until named owners are assigned.

| Domain | Current Modules | Owner Group | Critical Gates |
|---|---|---|---|
| Core SaaS | auth, users, tenant, RBAC, billing, notifications | Platform | Auth, tenant, RBAC, audit, plan limits |
| Music CRM | clients, leads, lead-interactions, future contacts | Product Platform | Canonical model, timeline, dedupe, migration |
| Catalog and Rights | artists, works, phonograms, shares, ECAD, detections, takedowns | Music Domain | Rights lineage, tenant isolation, audit |
| Contracts | contracts, contract-templates | Legal Ops | Versioning, idempotency, audit, attachments |
| Financial Ops | transactions, invoices, billing | FinOps | Idempotency, webhook verification, audit |
| Campaign Ops | campaigns, briefings, marketing | Growth Ops | Campaign lifecycle, metrics, approvals |
| Operations | events, projects, releases, inventory, HR | Operations | SLA, task linkage, ownership |
| Integrations | integrations, uploads, storage, provider adapters | Platform Integrations | Retry, DLQ, secrets, provider isolation |
| AI | ai, AI jobs, AI analytics | AI Systems | Cost tracking, prompt governance, tenant scope |
| Realtime | websocket, realtime layer | Platform | Token validation, tenant subscriptions |
| Observability | logger, audit, health, Sentry/PostHog | SRE | Correlation, alerting, dashboards |

## Ownership Rules

- No module ships without an owner group.
- Every owner group owns tests, docs, runtime alerts, and migration rollback for its module.
- Cross-domain changes require RFC.
- Critical mutations require audit/activity log ownership.

