import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Accounting    = lazy(() => import("@/modules/accounting/pages/Financeiro"));
const AccountingRegras = lazy(() => import("@/modules/accounting/pages/FinanceiroRegras"));
const Contabilidade = lazy(() => import("@/modules/accounting/pages/Contabilidade"));
const NotaFiscal    = lazy(() => import("@/modules/accounting/pages/NotaFiscal"));
const FluxoCaixa    = lazy(() => import("@/modules/accounting/pages/FluxoCaixa"));
const Conciliacao   = lazy(() => import("@/modules/accounting/pages/Conciliacao"));
const Relatorios    = lazy(() => import("@/modules/accounting/pages/RelatoriosFinanceiros"));
const Contratos     = lazy(() => import("@/modules/contracts/pages/Contratos"));
const TemplatesContratos = lazy(() => import("@/modules/contracts/pages/TemplatesContratos"));

export function accountingRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/accounting"               element={<P><Accounting /></P>} />
      <Route path="/accounting/regras"         element={<P><AccountingRegras /></P>} />
      <Route path="/accounting/fluxo"          element={<P><FluxoCaixa /></P>} />
      <Route path="/accounting/conciliacao"    element={<P><Conciliacao /></P>} />
      <Route path="/accounting/relatorios"     element={<P><Relatorios /></P>} />
      <Route path="/accounting/contabilidade"  element={<P><Contabilidade /></P>} />
      <Route path="/accounting/nota-fiscal"    element={<P><NotaFiscal /></P>} />
      <Route path="/contratos"                 element={<P><Contratos /></P>} />
      <Route path="/contratos/templates"       element={<P><TemplatesContratos /></P>} />
    </>
  );
}
