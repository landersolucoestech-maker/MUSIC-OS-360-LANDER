/**
 * Admin routes — painel super-admin e landing page pública.
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Landing    = lazy(() => import("@/shared/pages/Landing"));
const AdminPanel = lazy(() => import("@/shared/pages/admin/AdminPanel"));

export function adminRoutes(S: SuspenseRouteComponent, P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/landing" element={<S><Landing /></S>} />
      <Route path="/admin"   element={<P><AdminPanel /></P>} />
      <Route path="/admin/*" element={<P><AdminPanel /></P>} />
    </>
  );
}
