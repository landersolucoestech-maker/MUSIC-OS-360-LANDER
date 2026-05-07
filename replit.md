# MUSIC OS 360

MUSIC OS 360 is an enterprise music management SaaS that centralizes every aspect of a music business — artists, catalog, financeiro operacional, contracts, CRM, marketing, and operations — in a single 360° platform for labels, publishers, and distributors.

## Run & Operate
- **Frontend**: `npm run dev` (Vite on port 5000)
- **TypeCheck frontend**: `cd client && npx tsc --noEmit`

## Stack
- **Frontend**: React 18, TypeScript, Vite, TanStack Query v5, React Router v6, shadcn UI / Radix, Tailwind CSS
- **Data layer**: standalone mode — MOCK_DATA + localStorage (no backend required)

## Where things live
- `client/src/modules/` — domain modules: `artist`, `catalog`, `contracts`, `crm`, `events`, `financeiro`, `inventory`, `leads`, `licensing`, `marketing`, `monitoring`, `projects`, `releases`, `rh`, `settings`
- `client/src/shared/` — shared hooks, components, lib, data (MOCK_DATA)
- `client/src/app/routes/` — modular route factories (one file per domain group)
- `client/src/shared/data/mockData.ts` — standalone mock data (localStorage key: `musicos360_mock_data`)

## Architecture decisions
- Frontend operates in **standalone mode** (MOCK_DATA + localStorage) — no backend dependency
- **Mapper pattern**: each domain module has a single mapper file as the source of truth for all form ↔ DB transformations (no logic in components)
- **Financeiro module** lives at `client/src/modules/financeiro/` — Transações, P&L, Notas Fiscais, Contabilidade; routes in `financeiro.routes.tsx`
- **Releases module** lives at `client/src/modules/releases/` — Lançamentos musicais (álbum/single/EP, distribuidora, plataformas) + Gestão de Shares; routes in `releases.routes.tsx` (`/lancamentos`, `/gestao-shares`)
- **Monitoring module** includes `ECADViewModal` for ECAD conciliation details

## Product
- Music Catalog: obras, fonogramas, shares, licenses, ISRC/ISWC
- Financeiro Operacional: transactions, P&L, invoices, OFX — no payout/split engine
- Contracts: templates, digital signing, expiry alerts
- CRM: artists, clients, contacts, leads Kanban
- Marketing: campaigns, content calendar, briefing, tasks
- Operations: events, inventory, RH, MusicChat (messaging)
- Settings: users, roles, permissions, company, integrations (ABRAMUS fully functional; others stubbed)

## User preferences
- Brand name: **MUSIC OS 360** (never "LANDER 360", "lander360", or "LanderZap")
- Financial domain: **Financeiro Operacional** — no "royalties" as a product domain; "royalties" is only a valid transaction category label
- Messaging feature: **MusicChat** (route `/chat`)
- Design: enterprise blue `hsl(217 91% 60%)`, dark navy `hsl(222 47% 4%)`, Plus Jakarta Sans + IBM Plex Mono
- Semantic red: destructive/cancelled/rejected/expired/negative values ONLY

## Gotchas
- localStorage keys all use `musicos360_` prefix — old `lander_*` keys are dead (data migration needed for existing users)
- Auth cookie: `musicos360_rt` (was `lander360_rt`)
- CustomEvents on window use `musicos360:*` prefix
- ABRAMUS integration is fully functional in mock mode; all others throw `DisabledIntegrationError`

## Pointers
- Design system: `client/src/index.css` (CSS vars) + `tailwind.config.ts`
- Mapper sources of truth: `registroMusicasMappers.ts`, `artistaMappers.ts`, `shared/lib/normalize.ts`
