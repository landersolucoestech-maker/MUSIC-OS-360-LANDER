import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const DocumentEngine  = lazy(() => import("@/modules/contracts-v2/pages/DocumentEngine"));
const TemplateBuilder = lazy(() => import("@/modules/contracts-v2/pages/TemplateBuilder"));

export function contractsV2Routes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/contratos-v2"           element={<P><DocumentEngine /></P>} />
      <Route path="/contratos-v2/templates" element={<P><TemplateBuilder /></P>} />
    </>
  );
}
