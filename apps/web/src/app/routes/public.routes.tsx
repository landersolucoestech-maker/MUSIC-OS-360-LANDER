/**
 * STEP 10 — Routing Modularization: Public Routes
 *
 * Exporta função (não componente) para uso inline dentro de <Routes>.
 * React Router v6 exige que filhos de <Routes> sejam <Route> ou <React.Fragment>.
 * Chamar como função — {publicRoutes(...)} — retorna um fragmento válido.
 */
import { lazy } from "react";
import { Navigate, Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Auth = lazy(() => import("@/modules/auth/pages/Auth"));
const Register = lazy(() => import("@/modules/auth/pages/Register"));
const ResetPassword = lazy(() => import("@/modules/auth/pages/ResetPassword"));
const ChangeRequiredPassword = lazy(() => import("@/modules/auth/pages/ChangeRequiredPassword"));
const ArtistaSignupPublic = lazy(() => import("@/modules/auth/pages/ArtistaSignupPublic"));
const NotFound = lazy(() => import("@/shared/pages/NotFound"));
const OAuthPopupPage    = lazy(() => import("@/modules/integrations/pages/OAuthPopupPage"));
const OAuthCallbackPage = lazy(() => import("@/modules/integrations/pages/OAuthCallbackPage"));

export function publicRoutes(S: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/oauth/callback" element={<S><OAuthCallbackPage /></S>} />
      <Route path="/oauth/:platform" element={<S><OAuthPopupPage /></S>} />
      <Route path="/auth" element={<S><Auth /></S>} />
      <Route path="/login" element={<S><Auth /></S>} />
      <Route path="/forgot-password" element={<S><Auth /></S>} />
      <Route path="/register" element={<S><Register /></S>} />
      <Route path="/signup" element={<S><Register /></S>} />
      <Route path="/reset-password" element={<S><ResetPassword /></S>} />
      <Route path="/change-required-password" element={<S><ChangeRequiredPassword /></S>} />
      <Route path="/captar" element={<Navigate to="/leads" replace />} />
      <Route path="/cadastro/:orgSlug" element={<S><ArtistaSignupPublic /></S>} />
      <Route path="*" element={<S><NotFound /></S>} />
    </>
  );
}

