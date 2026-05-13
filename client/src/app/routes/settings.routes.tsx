/**
 * STEP 10 — Routing Modularization: Settings + Admin Routes
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";
import { AdminRoute } from "@/shared/infrastructure/AdminRoute";

const Configuracoes = lazy(() => import("@/modules/settings/pages/Configuracoes"));
const Aparencia = lazy(() => import("@/modules/settings/pages/Aparencia"));
const Perfil = lazy(() => import("@/modules/settings/pages/Perfil"));
const Usuarios = lazy(() => import("@/modules/settings/pages/Usuarios"));
const Auditoria = lazy(() => import("@/shared/pages/Auditoria"));
const Billing = lazy(() => import("@/modules/settings/pages/Billing"));

export function settingsRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/configuracoes" element={<P><Configuracoes /></P>} />
      <Route path="/aparencia" element={<P><Aparencia /></P>} />
      <Route path="/perfil" element={<P><Perfil /></P>} />
      <Route path="/usuarios" element={<P><Usuarios /></P>} />
      <Route path="/configuracoes/billing" element={<P><Billing /></P>} />
      <Route
        path="/auditoria"
        element={<P><AdminRoute><Auditoria /></AdminRoute></P>}
      />
    </>
  );
}
