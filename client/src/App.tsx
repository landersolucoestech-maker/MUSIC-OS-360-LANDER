import { Suspense, lazy } from "react";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { TenantProvider } from "@/app/providers/TenantContext";
import { ErrorBoundary } from "@/shared/components/ErrorBoundary";
import { RouteErrorBoundary } from "@/shared/components/RouteErrorBoundary";
import { PageSkeleton } from "@/shared/components/PageSkeletons";
import { createQueryClient } from "@/shared/lib/query-config";
import type { SuspenseRouteComponent } from "@/app/routes/types";
import "@/shared/domain-events/consistency";
import { RealtimeLayer } from "@/shared/components/RealtimeLayer";

import { publicRoutes } from "@/app/routes/public.routes";
import { artistRoutes } from "@/app/routes/artist.routes";
import { catalogRoutes } from "@/app/routes/catalog.routes";
import { financeiroRoutes } from "@/app/routes/financeiro.routes";
import { releasesRoutes } from "@/app/routes/releases.routes";
import { crmRoutes } from "@/app/routes/crm.routes";
import { marketingRoutes } from "@/app/routes/marketing.routes";
import { settingsRoutes } from "@/app/routes/settings.routes";
import { operationsRoutes } from "@/app/routes/operations.routes";
import { adminRoutes } from "@/app/routes/admin.routes";

const Dashboard = lazy(() => import("@/shared/pages/Dashboard"));

const queryClient = createQueryClient();

const SuspenseRoute: SuspenseRouteComponent = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
);

const ProtectedRoute: SuspenseRouteComponent = ({ children }) => (
  <SuspenseRoute>{children}</SuspenseRoute>
);

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageSkeleton />;
  const role = user?.user_metadata?.["role"] as string | undefined;
  if (!user || role !== "super_admin") return <Navigate to="/" replace />;
  return <>{children}</>;
}

const SuperAdminRoute: SuspenseRouteComponent = ({ children }) => (
  <SuspenseRoute>
    <SuperAdminGuard>{children}</SuperAdminGuard>
  </SuspenseRoute>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <RealtimeLayer />
          <TooltipProvider>
            <Sonner />
            <BrowserRouter>
              <Routes>
                {publicRoutes(SuspenseRoute)}

                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                {artistRoutes(ProtectedRoute)}
                {catalogRoutes(ProtectedRoute)}
                {financeiroRoutes(ProtectedRoute)}
                {releasesRoutes(ProtectedRoute)}
                {crmRoutes(ProtectedRoute)}
                {marketingRoutes(ProtectedRoute)}
                {settingsRoutes(ProtectedRoute)}
                {operationsRoutes(ProtectedRoute)}
                {adminRoutes(SuspenseRoute, SuperAdminRoute)}
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
