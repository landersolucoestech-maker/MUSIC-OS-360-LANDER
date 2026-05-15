/**
 * Tipos mínimos de autenticação usados pelo app.
 *
 * Mantemos apenas o contrato esperado pelo código existente:
 * id/email no usuário, access_token na sessão e `message` no erro.
 * A autenticação é gerida exclusivamente pelo backend NestJS via JWT.
 */

/** All 12 granular roles — mirrors server/src/common/types/roles.ts */
export type AppRole =
  | "super_admin"
  | "tenant_owner"
  | "admin"
  | "accounting"
  | "juridico"
  | "artista"
  | "produtor"
  | "marketing_manager"
  | "comercial"
  | "colaborador"
  | "rh_manager"
  | "viewer";

export interface User {
  id: string;
  email?: string;
  role?: AppRole | string;
  org_id?: string;
  user_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Session {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: User;
  [key: string]: unknown;
}

export interface AuthError {
  message: string;
  status?: number;
}
