import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Contratos = lazy(() => import("@/modules/contracts/pages/Contratos"));
const TemplatesContratos = lazy(() => import("@/modules/contracts/pages/TemplatesContratos"));
const VariableRegistry = lazy(() => import("@/modules/contracts/pages/VariableRegistry"));

export function contractsRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/contratos" element={<P><Contratos /></P>} />
      <Route path="/contratos/templates" element={<P><TemplatesContratos /></P>} />
      <Route path="/contratos/variaveis" element={<P><VariableRegistry /></P>} />
    </>
  );
}
