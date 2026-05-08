/**
 * Admin routes — Painel Super Admin Master Enterprise.
 */
import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const Landing             = lazy(() => import("@/shared/pages/Landing"));
const AdminDashboard      = lazy(() => import("@/modules/admin/pages/AdminDashboard"));
const AdminClients        = lazy(() => import("@/modules/admin/pages/AdminClients"));
const AdminSubscriptions  = lazy(() => import("@/modules/admin/pages/AdminSubscriptions"));
const AdminRevenue        = lazy(() => import("@/modules/admin/pages/AdminRevenue"));
const AdminPlans          = lazy(() => import("@/modules/admin/pages/AdminPlans"));
const AdminAnalytics      = lazy(() => import("@/modules/admin/pages/AdminAnalytics"));
const AdminAudit          = lazy(() => import("@/modules/admin/pages/AdminAudit"));
const AdminSupport        = lazy(() => import("@/modules/admin/pages/AdminSupport"));
const AdminSettings       = lazy(() => import("@/modules/admin/pages/AdminSettings"));

export function adminRoutes(S: SuspenseRouteComponent, P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/landing" element={<S><Landing /></S>} />

      {/* Redirect /admin → /admin/dashboard */}
      <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Core admin pages */}
      <Route path="/admin/dashboard"      element={<P><AdminDashboard /></P>} />
      <Route path="/admin/clients"        element={<P><AdminClients /></P>} />
      <Route path="/admin/subscriptions"  element={<P><AdminSubscriptions /></P>} />
      <Route path="/admin/revenue"        element={<P><AdminRevenue /></P>} />
      <Route path="/admin/plans"          element={<P><AdminPlans /></P>} />
      <Route path="/admin/analytics"      element={<P><AdminAnalytics /></P>} />
      <Route path="/admin/audit"          element={<P><AdminAudit /></P>} />
      <Route path="/admin/support"        element={<P><AdminSupport /></P>} />

      {/* Configurações centraliza: Geral, Email, Segurança, Notificações, Aparência, Webhooks, Chaves API, Integrações, Usuários */}
      <Route path="/admin/configuracoes"  element={<P><AdminSettings /></P>} />

      {/* Redirects — rotas isoladas consolidadas em /admin/configuracoes */}
      <Route path="/admin/settings"       element={<Navigate to="/admin/configuracoes" replace />} />
      <Route path="/admin/security"       element={<Navigate to="/admin/configuracoes" replace />} />
      <Route path="/admin/integrations"   element={<Navigate to="/admin/configuracoes" replace />} />
      <Route path="/admin/system"         element={<Navigate to="/admin/configuracoes" replace />} />
      <Route path="/admin/notifications"  element={<Navigate to="/admin/configuracoes" replace />} />
      <Route path="/admin/users"          element={<Navigate to="/admin/configuracoes" replace />} />
    </>
  );
}
