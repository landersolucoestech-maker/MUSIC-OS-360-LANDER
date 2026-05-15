/**
 * integrations/adapters/rights.adapter.ts
 *
 * Adapter de direitos autorais — ECAD, UBC, Abramus.
 * Selecciona MockRightsProvider (standalone) ou provider real (produção via backend).
 *
 * REGRA: o frontend NUNCA usa credenciais das entidades directamente.
 * Em produção, todas as chamadas passam por /api/rights/:entity/*.
 *
 * Uso:
 *   import { getRightsAdapter } from "@/modules/integrations/adapters/rights.adapter";
 *   const ecad = getRightsAdapter("ecad");
 *   const arrecadacao = await ecad.getArrecadacao("2025-01");
 */

import type { IRightsProvider, RightsEntityId } from "@/modules/integrations/dto";
import { MOCK_MODE } from "@/shared/lib/env";
import {
  mockEcadProvider,
  mockUbcProvider,
  mockAbramusProvider,
} from "@/modules/integrations/providers";

const MOCK_PROVIDERS: Record<RightsEntityId, IRightsProvider> = {
  ecad:    mockEcadProvider,
  ubc:     mockUbcProvider,
  abramus: mockAbramusProvider,
};

export function getRightsAdapter(entity: RightsEntityId): IRightsProvider {
  if (MOCK_MODE) return MOCK_PROVIDERS[entity];

  // PRODUÇÃO: BackendRightsProvider
  //   GET  /api/rights/:entity/search?q=...&kind=...
  //   POST /api/rights/:entity/import
  //   GET  /api/rights/:entity/arrecadacao/:periodo
  //   POST /api/rights/:entity/conciliar/:periodo
  // import { BackendRightsProvider } from "@/modules/integrations/providers/backend/backend-rights.provider";
  // return new BackendRightsProvider(entity);
  return MOCK_PROVIDERS[entity]; // fallback
}
