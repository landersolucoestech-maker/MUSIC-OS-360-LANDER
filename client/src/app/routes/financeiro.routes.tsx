import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Financeiro = lazy(() => import("@/modules/financeiro/pages/Financeiro"));
const FinanceiroRegras = lazy(() => import("@/modules/financeiro/pages/FinanceiroRegras"));
const Contabilidade = lazy(() => import("@/modules/financeiro/pages/Contabilidade"));
const NotaFiscal = lazy(() => import("@/modules/financeiro/pages/NotaFiscal"));
const FluxoCaixa = lazy(() => import("@/modules/financeiro/pages/FluxoCaixa"));
const Conciliacao = lazy(() => import("@/modules/financeiro/pages/Conciliacao"));
const RelatoriosFinanceiros = lazy(() => import("@/modules/financeiro/pages/RelatoriosFinanceiros"));
const Contratos = lazy(() => import("@/modules/contracts/pages/Contratos"));
const TemplatesContratos = lazy(() => import("@/modules/contracts/pages/TemplatesContratos"));

export function financeiroRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/financeiro" element={<P><Financeiro /></P>} />
      <Route path="/financeiro/regras" element={<P><FinanceiroRegras /></P>} />
      <Route path="/financeiro/fluxo" element={<P><FluxoCaixa /></P>} />
      <Route path="/financeiro/conciliacao" element={<P><Conciliacao /></P>} />
      <Route path="/financeiro/relatorios" element={<P><RelatoriosFinanceiros /></P>} />
      <Route path="/contabilidade" element={<P><Contabilidade /></P>} />
      <Route path="/nota-fiscal" element={<P><NotaFiscal /></P>} />
      <Route path="/contratos" element={<P><Contratos /></P>} />
      <Route path="/contratos/templates" element={<P><TemplatesContratos /></P>} />
    </>
  );
}
