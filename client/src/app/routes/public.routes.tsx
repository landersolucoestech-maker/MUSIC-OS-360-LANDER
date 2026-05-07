/**
 * STEP 10 — Routing Modularization: Public Routes
 *
 * Exporta função (não componente) para uso inline dentro de <Routes>.
 * React Router v6 exige que filhos de <Routes> sejam <Route> ou <React.Fragment>.
 * Chamar como função — {publicRoutes(...)} — retorna um fragmento válido.
 */
import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Auth = lazy(() => import("@/modules/auth/pages/Auth"));
const ArtistaSignupPublic = lazy(() => import("@/modules/auth/pages/ArtistaSignupPublic"));
const LeadCapture = lazy(() => import("@/modules/leads/pages/LeadCapture"));
const NotFound = lazy(() => import("@/shared/pages/NotFound"));

export function publicRoutes(S: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/auth" element={<S><Auth /></S>} />
      <Route path="/captar" element={<S><LeadCapture /></S>} />
      <Route path="/signup/artista" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="/signup/artista/:orgSlug" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="/cadastro/:orgSlug" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="/cadastro" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="*" element={<S><NotFound /></S>} />
    </>
  );
}
