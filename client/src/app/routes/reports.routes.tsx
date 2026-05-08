import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Relatorios = lazy(() => import("@/modules/reports/pages/Relatorios"));

export function reportsRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/relatorios" element={<P><Relatorios /></P>} />
      <Route path="/analytics" element={<Navigate to="/relatorios" replace />} />
    </>
  );
}
