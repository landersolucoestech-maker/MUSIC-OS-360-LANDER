/**
 * STEP 10 — Routing Modularization: Marketing Routes
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const MarketingVisaoGeral = lazy(() => import("@/modules/marketing/pages/VisaoGeral"));
const MarketingCampanhas = lazy(() => import("@/modules/marketing/pages/Campanhas"));
const MarketingCalendario = lazy(() => import("@/modules/marketing/pages/Calendario"));
const MarketingMetricas = lazy(() => import("@/modules/marketing/pages/Metricas"));
const MarketingBriefing = lazy(() => import("@/modules/marketing/pages/Briefing"));
const MarketingIACriativa = lazy(() => import("@/modules/marketing/pages/IACriativa"));
const MarketingTarefas = lazy(() => import("@/modules/marketing/pages/Tarefas"));

export function marketingRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/marketing/visao-geral" element={<P><MarketingVisaoGeral /></P>} />
      <Route path="/marketing/campanhas" element={<P><MarketingCampanhas /></P>} />
      <Route path="/marketing/calendario" element={<P><MarketingCalendario /></P>} />
      <Route path="/marketing/metricas" element={<P><MarketingMetricas /></P>} />
      <Route path="/marketing/briefing" element={<P><MarketingBriefing /></P>} />
      <Route path="/marketing/ia-criativa" element={<P><MarketingIACriativa /></P>} />
      <Route path="/marketing/tarefas" element={<P><MarketingTarefas /></P>} />
    </>
  );
}
