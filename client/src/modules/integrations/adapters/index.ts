/**
 * integrations/adapters/index.ts
 *
 * Barrel de todos os adapters.
 * Ponto de entrada único para módulos que precisam de chamar integrações.
 *
 * REGRA: módulos importam SEMPRE daqui, nunca dos providers directamente.
 *
 * Uso:
 *   import { authAdapter }      from "@/modules/integrations/adapters";
 *   import { emailAdapter }     from "@/modules/integrations/adapters";
 *   import { signingAdapter }   from "@/modules/integrations/adapters";
 *   import { getStreamingAdapter, getAdsAdapter } from "@/modules/integrations/adapters";
 *   import { getRightsAdapter } from "@/modules/integrations/adapters";
 */

export { authAdapter }         from "./auth.adapter";
export { emailAdapter }        from "./email.adapter";
export { storageAdapter }      from "./storage.adapter";
export { paymentsAdapter }     from "./payments.adapter";
export { signingAdapter }      from "./signing.adapter";
export { analyticsAdapter }    from "./analytics.adapter";
export { errorMonitorAdapter } from "./error-monitor.adapter";
export { getStreamingAdapter, getAdsAdapter } from "./streaming.adapter";
export { getRightsAdapter }    from "./rights.adapter";
export { chatAdapter }         from "./chat.adapter";
