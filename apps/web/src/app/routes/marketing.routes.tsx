/**
 * Marketing Routes — modular route group for the Marketing module.
 * Paths are stable; Marketing owns campaigns, content, tasks, metrics and AI.
 */
import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const MarketingVisaoGeral = lazy(() => import("@/modules/marketing/pages/VisaoGeral"));
const MarketingCampanhas = lazy(() => import("@/modules/marketing/pages/Campanhas"));
const MarketingCalendario = lazy(() => import("@/modules/marketing/pages/Calendario"));
const MarketingTarefas = lazy(() => import("@/modules/marketing/pages/Tarefas"));
const MarketingMetricas = lazy(() => import("@/modules/marketing/pages/Metricas"));
const MarketingBriefing = lazy(() => import("@/modules/marketing/pages/Briefing"));
const MarketingIACriativa = lazy(() => import("@/modules/marketing/pages/IACriativa"));

export function marketingRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/marketing" element={<Navigate to="/marketing/visao-geral" replace />} />
      <Route path="/marketing/visao-geral" element={<P><MarketingVisaoGeral /></P>} />
      <Route path="/marketing/campanhas" element={<P><MarketingCampanhas /></P>} />
      <Route path="/marketing/calendario" element={<P><MarketingCalendario /></P>} />
      <Route path="/marketing/tarefas" element={<P><MarketingTarefas /></P>} />
      <Route path="/marketing/metricas" element={<P><MarketingMetricas /></P>} />
      <Route path="/marketing/briefing" element={<P><MarketingBriefing /></P>} />
      <Route path="/marketing/ia-criativa" element={<P><MarketingIACriativa /></P>} />
      <Route path="/marketing/configuracoes" element={<Navigate to="/configuracoes?aba=operacional&modulo=marketing" replace />} />
      <Route path="/marketing/projetos" element={<Navigate to="/projetos" replace />} />
      <Route path="/marketing/briefings" element={<Navigate to="/marketing/briefing" replace />} />
      <Route path="/marketing/automacoes" element={<Navigate to="/marketing/visao-geral" replace />} />
      <Route path="/marketing/central-criativa" element={<Navigate to="/marketing/tarefas" replace />} />
      <Route path="/marketing/biblioteca-da-marca" element={<Navigate to="/marketing/tarefas" replace />} />
      <Route path="/marketing/asset-library" element={<Navigate to="/marketing/tarefas" replace />} />
      <Route path="/marketing/aprovacoes-criativas" element={<Navigate to="/marketing/tarefas" replace />} />
    </>
  );
}
