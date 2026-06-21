import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/shared/hooks/useIsAdmin";
import { useAuth } from "@/app/providers/AuthContext";
import { MainLayout } from "@/shared/components/MainLayout";
import { Card, CardContent } from "@/shared/ui/card";
import { Loader2, ShieldOff } from "lucide-react";
import { AUTH_DISABLED } from "@/shared/lib/env";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useIsAdmin();

  if (AUTH_DISABLED) return <>{children}</>;

  if (authLoading || roleLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return (
      <MainLayout title="Acesso restrito">
        <Card>
          <CardContent className="py-12 text-center space-y-3" data-testid="admin-access-denied">
            <ShieldOff className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="font-medium">Esta área é restrita a administradores.</p>
            <p className="text-sm text-muted-foreground">
              Peça acesso ao responsável pela sua organização.
            </p>
          </CardContent>
        </Card>
      </MainLayout>
    );
  }

  return <>{children}</>;
}
