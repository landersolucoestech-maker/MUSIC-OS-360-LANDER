/**
 * STEP 10 — Routing Modularization: Artist Routes
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Artistas = lazy(() => import("@/modules/artist/pages/Artistas"));

export function artistRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/artistas" element={<P><Artistas /></P>} />
    </>
  );
}

