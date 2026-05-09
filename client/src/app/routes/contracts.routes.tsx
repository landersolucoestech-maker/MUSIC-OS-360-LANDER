import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Contratos = lazy(() => import("@/modules/contracts/pages/Contratos"));
const TemplatesContratos = lazy(() => import("@/modules/contracts/pages/TemplatesContratos"));

export function contractsRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/contratos" element={<P><Contratos /></P>} />
      <Route path="/contratos/templates" element={<P><TemplatesContratos /></P>} />
    </>
  );
}
