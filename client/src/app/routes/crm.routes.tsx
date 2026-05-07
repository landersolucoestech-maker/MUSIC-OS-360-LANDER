/**
 * STEP 10 — Routing Modularization: CRM Routes
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const CRM = lazy(() => import("@/modules/crm/pages/CRM"));
const Leads = lazy(() => import("@/modules/leads/pages/Leads"));

export function crmRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/crm" element={<P><CRM /></P>} />
      <Route path="/leads" element={<P><Leads /></P>} />
    </>
  );
}
