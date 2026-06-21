import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Accounting = lazy(() => import("@/modules/accounting/pages/Financeiro"));
const Contabilidade = lazy(() => import("@/modules/accounting/pages/Contabilidade"));
const NotaFiscal = lazy(() => import("@/modules/accounting/pages/NotaFiscal"));
const TransacaoRules = lazy(() => import("@/modules/accounting/pages/TransacaoRules"));
const CategoriasFinanceiras = lazy(() => import("@/modules/accounting/pages/CategoriasFinanceiras"));

export function accountingRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/accounting" element={<P><Accounting /></P>} />
      <Route path="/accounting/contabilidade" element={<P><Contabilidade /></P>} />
      <Route path="/accounting/nota-fiscal" element={<P><NotaFiscal /></P>} />
      <Route path="/accounting/rules" element={<P><TransacaoRules /></P>} />
      <Route path="/accounting/categorias" element={<P><CategoriasFinanceiras /></P>} />
      <Route path="/financeiro/regras" element={<P><TransacaoRules /></P>} />
      <Route path="/financeiro/regras-categorias" element={<Navigate to="/configuracoes?aba=operacional&modulo=financeiro" replace />} />
    </>
  );
}
