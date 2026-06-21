/**
 * Admin routes — Painel Super Admin Master Enterprise.
 */
import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import { MOCK_MODE } from "@/shared/lib/env";
import type { SuspenseRouteComponent } from "./types";

const Landing             = lazy(() => import("@/shared/pages/Landing"));
const AdminDashboard      = lazy(() => import("@/modules/admin/pages/AdminDashboard"));
const AdminClients        = lazy(() => import("@/modules/admin/pages/AdminClients"));
const AdminPlans          = lazy(() => import("@/modules/admin/pages/AdminPlans"));
const AdminSubscriptions  = lazy(() => import("@/modules/admin/pages/AdminSubscriptions"));
const AdminAudit          = lazy(() => import("@/modules/admin/pages/AdminAudit"));
const AdminSupport        = lazy(() => import("@/modules/admin/pages/AdminSupport"));
const AdminKnowledge      = lazy(() => import("@/modules/admin/pages/AdminKnowledge"));
const AdminSettings       = lazy(() => import("@/modules/admin/pages/AdminSettings"));
const MusicChatAutomationSettings = lazy(() => import("@/modules/musicchat/pages/MusicChatAutomationSettings"));
// Tela interna de teste das Skills de IA (read-only). Gate de ambiente: só existe em MOCK_MODE.
const SkillsPlayground = lazy(() => import("@/modules/ai/pages/SkillsPlayground"));

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
      <Route path="/admin/revenue"        element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/plans"          element={<P><AdminPlans /></P>} />
      <Route path="/admin/analytics"      element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/admin/audit"          element={<P><AdminAudit /></P>} />
      <Route path="/admin/support"        element={<P><AdminSupport /></P>} />
      <Route path="/admin/knowledge"      element={<P><AdminKnowledge /></P>} />

      {/* Configurações centraliza: Geral, Email, Segurança, Notificações, Webhooks, Chaves API, Integrações, Usuários */}
      <Route path="/admin/configuracoes"  element={<P><AdminSettings /></P>} />
      <Route path="/admin/musicchat/automacoes" element={<P><MusicChatAutomationSettings /></P>} />

      {/* Tela interna de teste das Skills de IA — RBAC super_admin (P) + gate de ambiente (MOCK_MODE).
          Fora do mock a rota nem é registrada (oculta em produção). Read-only. */}
      {MOCK_MODE && (
        <Route path="/admin/ai/skills-playground" element={<P><SkillsPlayground /></P>} />
      )}

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
