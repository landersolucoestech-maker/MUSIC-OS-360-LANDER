import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Analytics = lazy(() => import("@/modules/analytics/pages/Analytics"));

export function analyticsRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/analytics" element={<P><Analytics /></P>} />
    </>
  );
}
