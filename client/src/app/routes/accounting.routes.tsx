import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Accounting = lazy(() => import("@/modules/accounting/pages/Financeiro"));
const NotaFiscal = lazy(() => import("@/modules/accounting/pages/NotaFiscal"));

export function accountingRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/accounting" element={<P><Accounting /></P>} />
      <Route path="/accounting/nota-fiscal" element={<P><NotaFiscal /></P>} />
    </>
  );
}
