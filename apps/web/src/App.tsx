import { Suspense, lazy, useState } from "react";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { TenantProvider } from "@/app/providers/TenantContext";
import { useTenant } from "@/app/providers/TenantContext";
import { BillingProvider, useBilling } from "@/app/providers/BillingContext";
import { BillingNotice } from "@/shared/infrastructure/BillingNotice";
import { ErrorBoundary } from "@/shared/infrastructure/ErrorBoundary";
import { RouteErrorBoundary } from "@/shared/infrastructure/RouteErrorBoundary";
import { PageSkeleton } from "@/shared/components/PageSkeletons";
import { createQueryClient } from "@/shared/lib/query-config";
import type { SuspenseRouteComponent } from "@/app/routes/types";
import "@/shared/domain-events/consistency";
import { RealtimeLayer } from "@/shared/infrastructure/RealtimeLayer";
import { AUTH_DISABLED } from "@/shared/lib/env";
import { runClientMigrations } from "@/shared/lib/migrations";
import { publicRoutes } from "@/app/routes/public.routes";
import { artistRoutes } from "@/app/routes/artist.routes";
import { catalogRoutes } from "@/app/routes/catalog.routes";
import { accountingRoutes } from "@/app/routes/accounting.routes";
import { releasesRoutes } from "@/app/routes/releases.routes";
import { crmRoutes } from "@/app/routes/crm.routes";
import { marketingRoutes } from "@/app/routes/marketing.routes";
import { workspaceRoutes } from "@/app/routes/workspace.routes";
import { settingsRoutes } from "@/app/routes/settings.routes";
import { operationsRoutes } from "@/app/routes/operations.routes";
import { adminRoutes } from "@/app/routes/admin.routes";
import { contractsRoutes } from "@/app/routes/contracts.routes";
import { reportsRoutes } from "@/app/routes/reports.routes";
import { supportRoutes } from "@/app/routes/support.routes";
import { audiovisualRoutes } from "@/app/routes/audiovisual.routes";

runClientMigrations();

const Dashboard = lazy(() => import("@/modules/dashboard/pages/Dashboard"));
const Landing = lazy(() => import("@/shared/pages/Landing"));
const BillingBlockedPage = lazy(() => import("@/modules/settings/pages/BillingBlockedPage"));

const SuspenseRoute: SuspenseRouteComponent = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (AUTH_DISABLED) return <>{children}</>;
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function BillingGuard({ children }: { children: React.ReactNode }) {
  const billing = useBilling();
  const location = window.location.pathname;
  const allowed =
    location.startsWith("/billing") ||
    location.startsWith("/configuracoes/billing") ||
    location.startsWith("/support");
  if (billing.isSuspended && !allowed) return <Navigate to="/billing/blocked" replace />;
  return <>{children}</>;
}

function Home() {
  const { user, loading } = useAuth();
  const { tenant } = useTenant();
  if (loading) return <PageSkeleton />;
  if (!user) return <Landing />;
  if (!tenant.onboarding.completed) return <Navigate to="/onboarding" replace />;
  return <Dashboard />;
}

const ProtectedRoute: SuspenseRouteComponent = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      <AuthGuard><BillingGuard>{children}</BillingGuard></AuthGuard>
    </Suspense>
  </RouteErrorBoundary>
);

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (AUTH_DISABLED) return <>{children}</>;
  if (loading) return <PageSkeleton />;
  const role = user?.role;
  if (!user || role !== "super_admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const SuperAdminRoute: SuspenseRouteComponent = ({ children }) => (
  <SuspenseRoute>
    <SuperAdminGuard>{children}</SuperAdminGuard>
  </SuspenseRoute>
);

const App = () => {
  const [queryClient] = useState(() => createQueryClient());
  return (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <BillingProvider>
            <RealtimeLayer />
            <TooltipProvider>
              <Sonner />
              <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                <BillingNotice />
                <Routes>
                  {publicRoutes(SuspenseRoute)}

                  <Route path="/" element={<SuspenseRoute><Home /></SuspenseRoute>} />
                  <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                  <Route path="/billing/blocked" element={<ProtectedRoute><BillingBlockedPage /></ProtectedRoute>} />

                  {artistRoutes(ProtectedRoute)}
                  {workspaceRoutes(ProtectedRoute)}
                  {catalogRoutes(ProtectedRoute)}
                  {accountingRoutes(ProtectedRoute)}
                  {releasesRoutes(ProtectedRoute)}
                  {crmRoutes(ProtectedRoute)}
                  {marketingRoutes(ProtectedRoute)}
                  {settingsRoutes(ProtectedRoute)}
                  {operationsRoutes(ProtectedRoute)}
                  {contractsRoutes(ProtectedRoute)}
                  <Route path="/contratos-v2" element={<Navigate to="/contratos" replace />} />
                  <Route path="/contratos-v2/*" element={<Navigate to="/contratos" replace />} />
                  {adminRoutes(SuspenseRoute, SuperAdminRoute)}
                  {reportsRoutes(ProtectedRoute)}
                  {supportRoutes(ProtectedRoute)}
                  {audiovisualRoutes(ProtectedRoute)}
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </BillingProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  );
};

export default App;

