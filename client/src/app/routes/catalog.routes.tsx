/**
 * STEP 10 — Routing Modularization: Catalog + Monitoring + Licensing Routes
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const RegistroMusicas = lazy(() => import("@/modules/catalog/pages/RegistroMusicas"));
const Monitoramento = lazy(() => import("@/modules/monitoring/pages/Monitoramento"));
const Takedowns = lazy(() => import("@/modules/monitoring/pages/Takedowns"));
const Licenciamento = lazy(() => import("@/modules/licensing/pages/Licenciamento"));

export function catalogRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/registro-musicas" element={<P><RegistroMusicas /></P>} />
      <Route path="/monitoramento" element={<P><Monitoramento /></P>} />
      <Route path="/takedowns" element={<P><Takedowns /></P>} />
      <Route path="/licenciamento" element={<P><Licenciamento /></P>} />
    </>
  );
}
