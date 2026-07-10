import { useAuth } from "@/app/providers/AuthContext";

export function useCurrentOrgId() {
  const { user, loading } = useAuth();
  return {
    orgId: user?.org_id ?? null,
    isLoading: loading,
    error: null as Error | null,
  };
}
