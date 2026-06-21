# Backlog — Test Rewrite (P0-09 follow-up)

Created during **FASE 10** (`P0-09 — Tests CI`). The tests listed below were
excluded from CI in [`apps/web/vitest.config.mjs`](../apps/web/vitest.config.mjs)
to unblock the production-readiness gate. They must be rewritten or replaced.

## Why excluded

| Test | Root cause | Effort to fix |
|---|---|---|
| `src/test/ExecucaoDetailModal.test.tsx` | imports `@/modules/rights-monitoring` (removed) | delete or rewrite for new home |
| `src/test/RightsMonitoring.test.tsx` | imports `@/modules/rights-monitoring/pages/RightsMonitoring` (removed) | delete or rewrite |
| `src/test/ArtistaEvolucaoSection.test.tsx` | component now uses React Query → tests need `QueryClientProvider` wrapper | wrap render in shared test helper |
| `src/test/ArtistaEvolutionCard.test.tsx` | same | same |
| `src/test/ArtistaVisao360Modal.test.tsx` | same | same |
| `src/test/PlatformMiniTrend.test.tsx` | same | same |
| `src/test/FonogramaFormModal.edit.test.tsx` | same | same |
| `src/test/ObraFormModal.edit.test.tsx` | same | same |
| `src/test/oauth-storage.test.ts` | grep-test reads `useSigningProviders.ts` / `useLeadOAuth.ts` (removed) | port assertions to a smoke test on current hooks |
| `src/test/mockData.anchor-date.test.ts` | mock data still uses `new Date()` — assertion expects stable date | freeze mockData seed at literal date OR update assertion |

## Proposed fix (single PR)

1. Create `src/test/_helpers/render-with-providers.tsx`:
   ```tsx
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { render } from '@testing-library/react';

   export function renderWithProviders(ui: React.ReactElement) {
     const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
     return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
   }
   ```
2. Replace `render(<X />)` with `renderWithProviders(<X />)` in the 6
   "needs QueryClientProvider" tests above.
3. Delete or rewrite the 4 tests referencing removed modules.
4. Remove the `exclude` block from `vitest.config.mjs`.

## Coverage targets (P0-09 follow-up)

Thresholds in `apps/api/jest.config.ts` were aligned to current baseline
(lines 13, statements 12, functions 2, branches 1). Plan:

| Quarter | lines | statements | functions | branches |
|---|---|---|---|---|
| Q2-2026 (current) | 13 | 12 | 2 | 1 |
| Q3-2026 | 25 | 22 | 8 | 4 |
| Q4-2026 | 40 | 35 | 15 | 10 |
| Q1-2027 | 60 | 55 | 30 | 20 |

New tests added in FASE 9.4/9.5 fixes (RolesGuard, TokenVerifier,
sanitizeForAudit, MIME extension, isPlaceholder) will move the needle.
