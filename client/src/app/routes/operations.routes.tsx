/**
 * STEP 10 — Routing Modularization: Operations Routes
 * Covers: Projects, Events, Inventory, RH, MusicChat
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Projetos = lazy(() => import("@/modules/projects/pages/Projetos"));
const Agenda = lazy(() => import("@/modules/events/pages/Agenda"));
const Inventario = lazy(() => import("@/modules/inventory/pages/Inventario"));
const RH = lazy(() => import("@/modules/rh/pages/RH"));
const MusicChat = lazy(() => import("@/shared/pages/MusicChat"));

export function operationsRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/projetos" element={<P><Projetos /></P>} />
      <Route path="/agenda" element={<P><Agenda /></P>} />
      <Route path="/inventario" element={<P><Inventario /></P>} />
      <Route path="/rh" element={<P><RH /></P>} />
      <Route path="/chat" element={<P><MusicChat /></P>} />
    </>
  );
}
