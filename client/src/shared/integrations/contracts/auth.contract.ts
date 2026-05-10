/**
 * shared/integrations/contracts/auth.contract.ts
 *
 * Contrato de autenticação — implementação alvo: Clerk.
 *
 * ESTADO ACTUAL: standalone/mock — AuthProvider em app/providers/AuthProvider.tsx
 * MIGRAÇÃO FUTURA: substituir AuthProvider por ClerkProvider mantendo este contrato.
 *
 * Qualquer componente que precise de dados de auth deve depender de IAuthProvider,
 * nunca de @clerk/react directamente.
 */

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  role: "owner" | "admin" | "manager" | "viewer";
  tenantId: string;
  createdAt: string;
}

export interface AuthSession {
  userId: string;
  tenantId: string;
  expiresAt: string;
  token: string;
}

export interface AuthSignInParams {
  email: string;
  password: string;
}

export interface AuthSignUpParams {
  email: string;
  password: string;
  name: string;
  tenantId?: string;
}

export interface AuthInviteParams {
  email: string;
  role: AuthUser["role"];
  tenantId: string;
}

// ─── Contrato ─────────────────────────────────────────────────────────────────

/**
 * IAuthProvider — contrato que todo provider de autenticação deve implementar.
 *
 * Implementações previstas:
 *   - MockAuthProvider  (standalone, já em uso)
 *   - ClerkAuthProvider (produção, migração futura)
 */
export interface IAuthProvider {
  /** Sessão activa, ou null se não autenticado */
  readonly session: AuthSession | null;
  /** Utilizador activo, ou null se não autenticado */
  readonly user: AuthUser | null;
  /** True enquanto a sessão está a ser verificada */
  readonly isLoading: boolean;

  signIn(params: AuthSignInParams): Promise<AuthSession>;
  signUp(params: AuthSignUpParams): Promise<AuthSession>;
  signOut(): Promise<void>;

  /** Convida um novo utilizador para o tenant */
  inviteUser(params: AuthInviteParams): Promise<void>;
  /** Revoga o acesso de um utilizador */
  revokeUser(userId: string): Promise<void>;

  /** Verifica se o token activo ainda é válido */
  verifySession(): Promise<boolean>;
  /** Renova o token de acesso */
  refreshSession(): Promise<AuthSession>;
}

// ─── Feature flags de auth ───────────────────────────────────────────────────

/**
 * Capacidades que o provider de auth pode ou não suportar.
 * Usado para condicionar a UI sem acoplamento ao provider concreto.
 */
export interface AuthProviderCapabilities {
  supportsSSO: boolean;
  supportsMFA: boolean;
  supportsPasswordReset: boolean;
  supportsInvites: boolean;
  supportsAuditLog: boolean;
}

export const CLERK_CAPABILITIES: AuthProviderCapabilities = {
  supportsSSO: true,
  supportsMFA: true,
  supportsPasswordReset: true,
  supportsInvites: true,
  supportsAuditLog: true,
};

export const MOCK_AUTH_CAPABILITIES: AuthProviderCapabilities = {
  supportsSSO: false,
  supportsMFA: false,
  supportsPasswordReset: false,
  supportsInvites: false,
  supportsAuditLog: false,
};
