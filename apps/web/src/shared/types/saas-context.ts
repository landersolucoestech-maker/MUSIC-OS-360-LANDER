export interface SaasAuthContext {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
  };
  workspace: {
    id: string;
    orgId: string;
    name: string;
    slug: string;
    active: boolean;
    plan: string;
    features: Record<string, unknown>;
    settings: Record<string, unknown>;
  };
  membership: {
    id: string;
    authUserId: string;
    role: string;
    isActive: boolean;
    permissions: string[];
    hierarchyLevel: number;
  };
  claims: {
    orgId: string | null;
    role: string | null;
    appMetadata: Record<string, unknown>;
  };
}
