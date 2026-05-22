# MUSIC OS 360

MUSIC OS 360 is an enterprise music management SaaS that centralizes every aspect of a music business — artists, catalog, accounting, contracts, CRM, marketing, and operations — in a single 360° platform for labels, publishers, and distributors.

## Run & Operate
- **Frontend** (workflow `Start application`): `cd apps/web && npx vite --host 0.0.0.0 --port 5000`
- **API** (workflow `Start API`): `cd apps/api && npm run dev`
- **TypeCheck frontend**: `cd apps/web && npx tsc --noEmit`
- **TypeCheck all**: `npx turbo typecheck`

## Monorepo Structure

```
/
├── apps/
│   ├── web/           ← React 18 + Vite + TypeScript frontend
│   └── api/           ← NestJS backend
├── packages/
│   ├── auth/          ← JWT, RBAC, roles, permissions, tenant scope
│   ├── config/        ← env, constants, feature flags
│   ├── observability/ ← Sentry, OpenTelemetry, Pino logger
│   ├── schemas/       ← Zod schemas (pagination, tenant, common)
│   ├── types/         ← Shared TypeScript types and enums
│   ├── ui/            ← Design system primitives (DatePicker, DataTable, Badge, Modal, PageSkeleton)
│   └── utils/         ← Pure utilities (format, string, object, date, currency)
├── turbo.json
└── package.json       ← workspaces: apps/*, packages/*
```

## Stack
- **Frontend**: React 18, TypeScript, Vite, TanStack Query v5, React Router v6, shadcn UI / Radix, Tailwind CSS, Zustand
- **Backend**: NestJS, TypeORM, Zod validators, BullMQ queues
- **Data layer**: standalone mode — MOCK_DATA + localStorage (no backend required); flip `VITE_MOCK_MODE=false` for HTTP mode

## Where things live — Frontend (`apps/web/src/`)

### Module structure (all 15 modules follow this pattern)
```
modules/<name>/
├── components/   ← UI components owned by this module
├── pages/        ← Route-level page components
├── hooks/        ← React hooks (data fetching + state)
├── services/     ← Data access via storage abstraction (index.ts re-exports)
├── store/        ← Zustand store (<name>.store.ts)
├── schemas/      ← Zod validation schemas
├── types/        ← Module-local TypeScript types
├── utils/        ← Module-local pure utilities
├── constants/    ← Module-local constants
└── forms/        ← Form schemas and helpers
```

Modules: `accounting`, `artist`, `catalog`, `contracts`, `crm`, `events`, `inventory`, `leads`, `licensing`, `marketing`, `monitoring`, `projects`, `releases`, `rh`, `settings`

### Shared layer (`apps/web/src/shared/`)
- `shared/ui/` — shadcn/Radix UI primitives
- `shared/components/` — cross-domain components (MainLayout, PageHeader, DataTable, FinanceChart, etc.)
- `shared/infrastructure/` — ErrorBoundary, RouteErrorBoundary, RealtimeLayer, AdminRoute
- `shared/layouts/` — MainLayout + PageHeader barrels
- `shared/providers/` — AuthProvider, TenantProvider, hooks
- `shared/config/` — queryClient, CACHE_TIMES
- `shared/hooks/` — cross-domain React hooks
- `shared/lib/` — cross-domain utilities:
  - `storage.ts` — **canonical data access layer** (all services use this, never localStorage directly)
  - `api-client.ts` — HTTP client + TABLE_ENDPOINT + PENDING_TABLES map
  - `tenant.ts`, `errors.ts`, `normalize.ts`, `env.ts`, etc.
- `shared/data/mockData.ts` — standalone mock data (localStorage key: `musicos360_mock_data`)
- `app/routes/` — modular route factories (one file per domain group)

### Module-owned lib files (domain-specific, NOT in shared)
- `modules/accounting/lib/nota-fiscal-tipo.ts` — NF tipo operação helpers
- `modules/accounting/lib/transacao-constants.ts` — transaction form constants/types
- `modules/contracts/lib/template-contrato-types.ts` — TemplateContrato interface
- `modules/crm/lib/contato-types.ts` — contact categories and subcategories
- `modules/artist/components/PlatformMiniTrend.tsx` — sparkline badge (artist/monitoring only)
- `modules/settings/components/IntegrationStatusBadges.tsx` — integration status UI

## Where things live — Backend (`apps/api/src/`)

### Module structure (all modules follow this pattern)
```
modules/<name>/
├── dto/              ← NestJS DTOs (request/response shapes)
├── entities/         ← TypeORM entity classes
├── repositories/     ← Repository classes (InjectRepository pattern)
├── validators/       ← Zod schemas for request validation
├── <name>.controller.ts
├── <name>.service.ts
└── <name>.module.ts
```

### Core (`apps/api/src/core/`)
- `analytics/` — PostHog service
- `audit/` — Audit log service
- `cache/` — In-memory cache with TTL (Redis-ready)
- `config/` — Env schema (Zod)
- `decorators/` — @CurrentUser, @CurrentTenant, @Public, @Roles
- `events/` — Domain event emitter (EventEmitter2, CQRS-lite)
- `filters/` — Global exception filter
- `guards/` — Supabase Auth auth, rate-limit, roles, tenant guards
- `interceptors/` — Audit, logging, transform interceptors
- `logger/` — Structured JSON logger (NestJS LoggerService impl)
- `mail/` — Mail service
- `queue/` — BullMQ queue service (notifications, mail, reports)
- `rbac/` — Role-based access control service + permission matrix
- `security/` — Encryption, rate-limiting
- `storage/` — File upload abstraction (S3/GCS/local)
- `tenant/` — Tenant resolution and feature flag service
- `websocket/` — WebSocket gateway

## Architecture decisions
- **Storage abstraction**: `apps/web/src/shared/lib/storage.ts` is the single port for all data access. Services call `storage.*` — never localStorage directly. Supports both mock (MOCK_DATA) and HTTP (real API) modes transparently.
- **Mapper pattern**: each domain module has a single mapper file as the source of truth for all form ↔ DB transformations (no logic in components)
- **Accounting scope**: ONLY revenue - expenses = net profit; P&L by project/artist; recoupment tracking. NO recebimentos externos de direitos logic.
- **Releases module**: Lançamentos musicais (álbum/single/EP, distribuidora, plataformas) + Gestão de Shares; routes `/lancamentos`, `/gestao-shares`
- **Monitoring module**: includes `ECADViewModal` for ECAD conciliation details
- **Analytics module**: ONLY social/ads platforms: YouTube, TikTok, Instagram, Meta Ads, Google Ads. No individual artist analysis (covered by Visão 360 modal).
- **Multi-tenant**: `TenantContext` at `apps/web/src/app/providers/TenantContext.tsx`; isolation utilities at `apps/web/src/shared/lib/tenant-isolation.ts`

## Product
- Music Catalog: obras, fonogramas, shares, licenses, ISRC/ISWC
- Accounting: transactions, P&L, cash flow, invoices, OFX, recoupment — no payout/split engine; no recebimentos externos de direitos calculations
- Contracts: templates, digital signing, expiry alerts
- CRM: artists, clients, contacts, leads Kanban
- Marketing: campaigns, content calendar, briefing, tasks, IA Criativa
- Operations: events, inventory, RH, MusicChat (messaging)
- Analytics: company social/ads profiles only (YouTube, TikTok, Instagram, Meta Ads, Google Ads)
- Settings: users, roles, permissions, company, integrations (ABRAMUS fully functional; others stubbed)

## User preferences
- Brand name: **MUSIC OS 360** (never "LANDER 360", "lander360", or "LanderZap")
- Financial module: **Accounting** (renamed from Financeiro) — route prefix `/accounting`; "recebimentos externos de direitos" is ONLY a valid transaction category label, never a product domain
- Messaging feature: **MusicChat** (route `/chat`)
- Design: enterprise blue `hsl(217 91% 60%)`, dark navy `hsl(222 47% 4%)`, Plus Jakarta Sans + IBM Plex Mono
- Semantic red: destructive/cancelled/rejected/expired/negative values ONLY
- Sidebar header shows: MUSIC OS 360 / ERP OPERACIONAL MUSICAL / badge "SISTEMA MULTI-TENANT" / label "Tenant Atual" + nome do tenant
- No IA Assistente module (AI functionality limited to form-level buttons in Marketing and artist forms)
- Mock data is intentional — serves as visual reference for how real data will appear
- Analytics must NOT duplicate individual artist analysis (already in Visão 360 modal)

## Gotchas
- `storage.ts` is the ONLY way to read/write data in frontend services — never import from mockData or localStorage directly
- localStorage keys all use `musicos360_` prefix — old `lander_*` keys are dead
- Auth cookie: `musicos360_rt`
- CustomEvents on window use `musicos360:*` prefix
- ABRAMUS integration is fully functional in mock mode; all others throw `DisabledIntegrationError`
- Permission module key: `accounting` (was `financeiro`) — update any new role/permission code accordingly
- `artist/services/index.ts` re-exports `artista.service.ts` (canonical) — do not create a separate `artist.service.ts`

## Pointers
- Design system: `apps/web/src/index.css` (CSS vars) + `apps/web/tailwind.config.ts`
- Mapper sources of truth: `registroMusicasMappers.ts`, `artistaMappers.ts`, `shared/lib/normalize.ts`
- Vite config: `apps/web/vite.config.ts` — `@` alias → `./src`; build outDir `../../dist`
- Mock data tables: `artistas`, `contratos`, `obras`, `fonogramas`, `transacoes`, `notas_fiscais`, `projetos`, `eventos`, `inventario`, `campanhas`, `conteudos`, `briefings`, `tarefas_marketing`, `leads`, `lancamentos`, `shares`, `licencas`, `monitoramentos`, `funcionarios`, `folha_pagamento`
