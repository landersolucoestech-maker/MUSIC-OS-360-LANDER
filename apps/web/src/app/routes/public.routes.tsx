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
const Register = lazy(() => import("@/modules/auth/pages/Register"));
const ArtistaSignupPublic = lazy(() => import("@/modules/auth/pages/ArtistaSignupPublic"));
const LeadCapture = lazy(() => import("@/modules/crm/pages/LeadCapture"));
const NotFound = lazy(() => import("@/shared/pages/NotFound"));
const OAuthPopupPage = lazy(() => import("@/modules/integrations/pages/OAuthPopupPage"));

export function publicRoutes(S: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/oauth/:platform" element={<S><OAuthPopupPage /></S>} />
      <Route path="/auth" element={<S><Auth /></S>} />
      <Route path="/register" element={<S><Register /></S>} />
      <Route path="/captar" element={<S><LeadCapture /></S>} />
      <Route path="/signup/artista" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="/signup/artista/:orgSlug" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="/cadastro/:orgSlug" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="/cadastro" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="*" element={<S><NotFound /></S>} />
    </>
  );
}
