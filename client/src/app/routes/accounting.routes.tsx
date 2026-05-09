import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Accounting = lazy(() => import("@/modules/accounting/pages/Financeiro"));
const NotaFiscal = lazy(() => import("@/modules/accounting/pages/NotaFiscal"));
const Contratos     = lazy(() => import("@/modules/contracts/pages/Contratos"));
const TemplatesContratos = lazy(() => import("@/modules/contracts/pages/TemplatesContratos"));

export function accountingRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/accounting"            element={<P><Accounting /></P>} />
      <Route path="/accounting/nota-fiscal" element={<P><NotaFiscal /></P>} />
      <Route path="/contratos"                 element={<P><Contratos /></P>} />
      <Route path="/contratos/templates"       element={<P><TemplatesContratos /></P>} />
    </>
  );
}
