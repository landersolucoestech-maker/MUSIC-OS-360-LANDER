/**
 * integrations/providers/mock/mock-auth.provider.ts
 *
 * Implementação mock de IAuthProvider.
 * Usada em modo standalone (MOCK_MODE=true).
 *
 * MIGRAÇÃO FUTURA: substituir por ClerkAuthProvider sem alterar contratos.
 */

import type {
  IAuthProvider,
  AuthUser,
  AuthSession,
  AuthSignInParams,
  AuthSignUpParams,
  AuthInviteParams,
} from "@/modules/integrations/dto";

const MOCK_USER: AuthUser = {
  id:        "mock-user-001",
  email:     "demo@musicos360.com.br",
  name:      "Demo User",
  avatarUrl: null,
  role:      "owner",
  tenantId:  "mock-tenant-001",
  createdAt: "2024-01-01T00:00:00.000Z",
};

const MOCK_SESSION: AuthSession = {
  userId:    MOCK_USER.id,
  tenantId:  MOCK_USER.tenantId,
  expiresAt: new Date(Date.now() + 30 * 24 * 3600_000).toISOString(),
  token:     "mock-access-token",
};

export class MockAuthProvider implements IAuthProvider {
  readonly session: AuthSession | null = MOCK_SESSION;
  readonly user:    AuthUser | null    = MOCK_USER;
  readonly isLoading: boolean          = false;

  async signIn(_params: AuthSignInParams): Promise<AuthSession> {
    return MOCK_SESSION;
  }

  async signUp(_params: AuthSignUpParams): Promise<AuthSession> {
    return MOCK_SESSION;
  }

  async signOut(): Promise<void> {
    // standalone — mantém sessão mock
  }

  async inviteUser(_params: AuthInviteParams): Promise<void> {
    console.info("[MockAuthProvider] inviteUser — no-op em modo standalone.");
  }

  async revokeUser(_userId: string): Promise<void> {
    console.info("[MockAuthProvider] revokeUser — no-op em modo standalone.");
  }

  async verifySession(): Promise<boolean> {
    return true;
  }

  async refreshSession(): Promise<AuthSession> {
    return MOCK_SESSION;
  }
}

export const mockAuthProvider = new MockAuthProvider();
