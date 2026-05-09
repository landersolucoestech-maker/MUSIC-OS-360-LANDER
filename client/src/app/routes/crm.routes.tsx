/**
 * STEP 10 — Routing Modularization: CRM Routes
 */
import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const CRM = lazy(() => import("@/modules/crm/pages/CRM"));

export function crmRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/crm" element={<P><CRM /></P>} />
      <Route path="/leads" element={<Navigate to="/crm" replace />} />
    </>
  );
}
