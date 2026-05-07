# MUSIC OS 360

MUSIC OS 360 is an enterprise music management SaaS that centralizes every aspect of a music business — artists, catalog, accounting, contracts, CRM, marketing, and operations — in a single 360° platform for labels, publishers, and distributors.

## Run & Operate
- **Frontend**: `npm run dev` (Vite on port 5000)
- **TypeCheck frontend**: `cd client && npx tsc --noEmit`

## Stack
- **Frontend**: React 18, TypeScript, Vite, TanStack Query v5, React Router v6, shadcn UI / Radix, Tailwind CSS
- **Data layer**: standalone mode — MOCK_DATA + localStorage (no backend required)

## Where things live
- `client/src/modules/` — domain modules: `artist`, `catalog`, `contracts`, `crm`, `events`, `accounting`, `inventory`, `leads`, `licensing`, `marketing`, `monitoring`, `projects`, `releases`, `rh`, `settings`
- `client/src/shared/` — shared layer (cross-domain only):
  - `shared/ui/` — shadcn/Radix UI primitives
  - `shared/components/` — genuinely cross-domain components (MainLayout, PageHeader, ContratoStatusBadge, AIGenerateButton, FinanceChart, DataTable, etc.)
  - `shared/infrastructure/` — app-level infra: ErrorBoundary, ErrorFallback, RouteErrorBoundary, RealtimeLayer, AdminRoute + `index.ts` barrel
  - `shared/layouts/` — barrel re-exporting MainLayout + PageHeader (`index.ts`)
  - `shared/providers/` — barrel re-exporting AuthProvider, TenantProvider, hooks (`index.ts`)
  - `shared/config/` — barrel re-exporting queryClient, CACHE_TIMES (`index.ts`)
  - `shared/hooks/` — cross-domain React hooks
  - `shared/lib/` — cross-domain utilities (utils.ts, normalize.ts, tenant-isolation.ts, etc.)
  - `shared/design-system/` — design tokens and patterns
  - `shared/types/` — shared TypeScript types
  - `shared/data/mockData.ts` — standalone mock data
- `client/src/app/routes/` — modular route factories (one file per domain group)
- `client/src/shared/data/mockData.ts` — standalone mock data (localStorage key: `musicos360_mock_data`)
- **Module-owned lib files** (domain-specific, NOT in shared):
  - `modules/accounting/lib/nota-fiscal-tipo.ts` — NF tipo operação helpers
  - `modules/accounting/lib/transacao-constants.ts` — transaction form constants/types
  - `modules/contracts/lib/template-contrato-types.ts` — TemplateContrato interface
  - `modules/crm/lib/contato-types.ts` — contact categories and subcategories
  - `modules/artist/components/PlatformMiniTrend.tsx` — sparkline badge (artist/monitoring only)
  - `modules/settings/components/IntegrationStatusBadges.tsx` — integration status UI

## Architecture decisions
- Frontend operates in **standalone mode** (MOCK_DATA + localStorage) — no backend dependency
- **Mapper pattern**: each domain module has a single mapper file as the source of truth for all form ↔ DB transformations (no logic in components)
- **Accounting module** lives at `client/src/modules/accounting/` — Transações, Fluxo de Caixa, Conciliação, Relatórios, Contabilidade (P&L + Recoupment), Nota Fiscal; routes in `accounting.routes.tsx` under `/accounting/*`
- **Accounting scope**: ONLY revenue - expenses = net profit; P&L by project/artist; recoupment tracking. NO royalties logic.
- **Releases module** lives at `client/src/modules/releases/` — Lançamentos musicais (álbum/single/EP, distribuidora, plataformas) + Gestão de Shares; routes in `releases.routes.tsx` (`/lancamentos`, `/gestao-shares`)
- **Monitoring module** includes `ECADViewModal` for ECAD conciliation details
- **Analytics module** — ONLY social/ads platforms: YouTube, TikTok, Instagram, Meta Ads, Google Ads. No individual artist analysis (covered by Visão 360 modal).
- **Multi-tenant architecture** — `TenantContext` at `client/src/app/providers/TenantContext.tsx`: Tenant type, TenantPermissions (RBAC), TenantConfig (branding), TenantBilling, TenantOnboarding, feature flags; isolation utilities at `client/src/shared/lib/tenant-isolation.ts`

## Product
- Music Catalog: obras, fonogramas, shares, licenses, ISRC/ISWC
- Accounting: transactions, P&L, cash flow, invoices, OFX, recoupment — no payout/split engine; no royalties calculations
- Contracts: templates, digital signing, expiry alerts
- CRM: artists, clients, contacts, leads Kanban
- Marketing: campaigns, content calendar, briefing, tasks, IA Criativa
- Operations: events, inventory, RH, MusicChat (messaging)
- Analytics: company social/ads profiles only (YouTube, TikTok, Instagram, Meta Ads, Google Ads)
- Settings: users, roles, permissions, company, integrations (ABRAMUS fully functional; others stubbed)

## User preferences
- Brand name: **MUSIC OS 360** (never "LANDER 360", "lander360", or "LanderZap")
- Financial module: **Accounting** (renamed from Financeiro) — route prefix `/accounting`; "royalties" is ONLY a valid transaction category label, never a product domain
- Messaging feature: **MusicChat** (route `/chat`)
- Design: enterprise blue `hsl(217 91% 60%)`, dark navy `hsl(222 47% 4%)`, Plus Jakarta Sans + IBM Plex Mono
- Semantic red: destructive/cancelled/rejected/expired/negative values ONLY
- Sidebar header shows: MUSIC OS 360 / ERP OPERACIONAL MUSICAL / badge "SISTEMA MULTI-TENANT" / label "Tenant Atual" + nome do tenant
- No IA Assistente module (AI functionality limited to form-level buttons in Marketing and artist forms)
- Mock data is intentional — serves as visual reference for how real data will appear
- Analytics must NOT duplicate individual artist analysis (already in Visão 360 modal)

## Gotchas
- localStorage keys all use `musicos360_` prefix — old `lander_*` keys are dead (data migration needed for existing users)
- Auth cookie: `musicos360_rt` (was `lander360_rt`)
- CustomEvents on window use `musicos360:*` prefix
- ABRAMUS integration is fully functional in mock mode; all others throw `DisabledIntegrationError`
- Permission module key: `accounting` (was `financeiro`) — update any new role/permission code accordingly

## Pointers
- Design system: `client/src/index.css` (CSS vars) + `tailwind.config.ts`
- Mapper sources of truth: `registroMusicasMappers.ts`, `artistaMappers.ts`, `shared/lib/normalize.ts`
