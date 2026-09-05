---
paths:
  - "apps/web/**"
description: Frontend conventions (React/Vite app)
---

# Frontend (apps/web)

- Stack: React 18, Vite (`scripts/run-vite.mjs` wraps dev/build/preview — don't call `vite`
  directly), Tailwind, TanStack Query, Zustand, react-hook-form + zod, Radix primitives, Vitest +
  Testing Library.
- Real scripts: `dev`, `build`, `typecheck` (`tsc --noEmit -p tsconfig.app.json`),
  `lint` (`eslint src --ext ts,tsx`), `test`/`test:run` (`vitest run --config vitest.config.mjs`).
- Data fetching goes through TanStack Query; don't hand-roll fetch+useState+useEffect for server
  state. Mutations should invalidate/update the relevant query keys.
- Every async view needs an explicit loading, error, and empty state — don't ship a bare happy
  path.
- Auth/tenant context comes from `AuthContext`/`TenantContext` under `src/app/providers/` — reuse
  it, don't create a parallel source of truth for the current user/tenant.
- Respect existing contract with the API (`VITE_API_URL`, response shapes) — check the actual
  DTO/response type in `apps/api` before assuming a frontend-only fix.
- `frontend-reviewer` checks for render loops, request storms, unnecessary re-fetching, cache
  correctness, and accessibility/responsiveness on anything you touch here.
