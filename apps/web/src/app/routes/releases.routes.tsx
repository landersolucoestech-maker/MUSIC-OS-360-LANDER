import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Lancamentos = lazy(() => import("@/modules/releases/pages/Lancamentos"));
const GestaoShares = lazy(() => import("@/modules/releases/pages/GestaoShares"));

export function releasesRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/lancamentos" element={<P><Lancamentos /></P>} />
      <Route path="/gestao-shares" element={<P><GestaoShares /></P>} />
    </>
  );
}
