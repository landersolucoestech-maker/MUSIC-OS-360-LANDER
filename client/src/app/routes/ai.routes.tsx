import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const AIHub = lazy(() => import("@/modules/ai/pages/AIHub"));

export function aiRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/ai" element={<P><AIHub /></P>} />
    </>
  );
}
