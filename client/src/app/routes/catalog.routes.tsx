/**
 * Catalog + Monitoring + Rights + Licensing Routes
 */
import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const RegistroMusicas  = lazy(() => import("@/modules/catalog/pages/RegistroMusicas"));
const Takedowns        = lazy(() => import("@/modules/monitoring/pages/Takedowns"));
const Licenciamento    = lazy(() => import("@/modules/licensing/pages/Licenciamento"));
const RightsMonitoring = lazy(() => import("@/modules/rights-monitoring/pages/RightsMonitoring"));

export function catalogRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/registro-musicas" element={<P><RegistroMusicas /></P>} />
      {/* Redirect legacy route */}
      <Route path="/monitoramento" element={<Navigate to="/rights-monitoring" replace />} />
      <Route path="/rights-monitoring" element={<P><RightsMonitoring /></P>} />
      <Route path="/takedowns" element={<P><Takedowns /></P>} />
      <Route path="/licenciamento" element={<P><Licenciamento /></P>} />
    </>
  );
}
