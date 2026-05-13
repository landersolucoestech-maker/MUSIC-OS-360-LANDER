import { Suspense, lazy, useState } from "react";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/app/providers/AuthContext";
import { TenantProvider } from "@/app/providers/TenantContext";
import { ThemeProvider } from "@/app/providers/ThemeContext";
import { ErrorBoundary } from "@/shared/infrastructure/ErrorBoundary";
import { RouteErrorBoundary } from "@/shared/infrastructure/RouteErrorBoundary";
import { PageSkeleton } from "@/shared/components/PageSkeletons";
import { createQueryClient } from "@/shared/lib/query-config";
import type { SuspenseRouteComponent } from "@/app/routes/types";
import "@/shared/domain-events/consistency";
import { RealtimeLayer } from "@/shared/infrastructure/RealtimeLayer";
import { MOCK_MODE } from "@/shared/lib/env";

import { publicRoutes } from "@/app/routes/public.routes";
import { artistRoutes } from "@/app/routes/artist.routes";
import { catalogRoutes } from "@/app/routes/catalog.routes";
import { accountingRoutes } from "@/app/routes/accounting.routes";
import { releasesRoutes } from "@/app/routes/releases.routes";
import { crmRoutes } from "@/app/routes/crm.routes";
import { marketingRoutes } from "@/app/routes/marketing.routes";
import { settingsRoutes } from "@/app/routes/settings.routes";
import { operationsRoutes } from "@/app/routes/operations.routes";
import { adminRoutes } from "@/app/routes/admin.routes";
import { contractsRoutes } from "@/app/routes/contracts.routes";
import { reportsRoutes } from "@/app/routes/reports.routes";
import { supportRoutes } from "@/app/routes/support.routes";

const Dashboard = lazy(() => import("@/modules/dashboard/pages/Dashboard"));

const SuspenseRoute: SuspenseRouteComponent = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      {children}
    </Suspense>
  </RouteErrorBoundary>
);

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (MOCK_MODE) return <>{children}</>;
  if (loading) return <PageSkeleton />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const ProtectedRoute: SuspenseRouteComponent = ({ children }) => (
  <RouteErrorBoundary>
    <Suspense fallback={<PageSkeleton />}>
      <AuthGuard>{children}</AuthGuard>
    </Suspense>
  </RouteErrorBoundary>
);

function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (MOCK_MODE) return <>{children}</>;
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

const App = () => {
  const [queryClient] = useState(() => createQueryClient());
  return (
  <ThemeProvider>
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TenantProvider>
          <RealtimeLayer />
          <TooltipProvider>
            <Sonner />
            <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <Routes>
                {publicRoutes(SuspenseRoute)}

                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

                {artistRoutes(ProtectedRoute)}
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
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </TenantProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
  </ThemeProvider>
  );
};

export default App;
