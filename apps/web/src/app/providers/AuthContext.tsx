/**
 * app/providers/AuthContext.tsx
 *
 * AuthContext — bridge multi-modo:
 *
 * MOCK_MODE=true  (standalone / desenvolvimento):
 *   Usuário mock sempre autenticado. Sem chamadas de rede.
 *
 * MOCK_MODE=false:
 *   Autenticação real via Supabase Auth.
 *   O SDK gerencia tokens, refresh automático e persistência de sessão.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Session as SupabaseSession, User as SupabaseUser } from "@supabase/supabase-js";
import type { AuthError, Session, User } from "@/shared/types/auth";
import { MOCK_USER, MOCK_SESSION } from "@/shared/data/mockData";
import {
  api,
  clearAuthBackoff,
  setAccessToken,
  setTenantId,
} from "@/shared/lib/api-client";
import { AUTH_DISABLED, MOCK_MODE, IS_DEV } from "@/shared/lib/env";
import { getSupabaseClient } from "@/lib/supabase";

function devLog(label: string, data?: unknown): void {
  if (!IS_DEV) return;
  if (data !== undefined) {
    console.log(`[MUSIC OS 360 Auth] ${label}`, data);
  } else {
    console.log(`[MUSIC OS 360 Auth] ${label}`);
  }
}

function decodeJwtClaims(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1];
    return JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
  } catch { return {}; }
}

function logJwtClaims(token: string, event: string): void {
  if (!IS_DEV) return;
  const claims = decodeJwtClaims(token);
  const appMeta = claims["app_metadata"] as Record<string, unknown> | undefined;
  devLog(`${event} — JWT claims:`, {
    sub: claims["sub"],
    email: claims["email"],
    org_id: appMeta?.["org_id"] ?? claims["org_id"] ?? "(não encontrado — hook ativo?)",
    role: appMeta?.["role"] ?? claims["role"] ?? "(não encontrado)",
    exp: claims["exp"] ? new Date((claims["exp"] as number) * 1000).toISOString() : undefined,
  });
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
    metadata?: Record<string, unknown>,
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(u: SupabaseUser, jwtAppMeta?: Record<string, unknown>): User {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const app = u.app_metadata as Record<string, unknown> | undefined;
  const effectiveApp = { ...app, ...jwtAppMeta };
  return {
    id: u.id,
    email: u.email,
    role: (effectiveApp?.["role"] ?? meta?.["role"]) as string | undefined,
    org_id: (effectiveApp?.["org_id"] ?? meta?.["org_id"]) as string | undefined,
    user_metadata: { ...meta, ...effectiveApp },
  };
}

function mapSupabaseSession(s: SupabaseSession): Session {
  const jwtClaims = decodeJwtClaims(s.access_token);
  const jwtAppMeta = jwtClaims["app_metadata"] as Record<string, unknown> | undefined;
  return {
    access_token: s.access_token,
    refresh_token: s.refresh_token,
    expires_at: s.expires_at ? s.expires_at * 1000 : undefined,
    user: mapSupabaseUser(s.user, jwtAppMeta),
  };
}

function applyApiSessionState(session: SupabaseSession): Session {
  const mapped = mapSupabaseSession(session);
  setAccessToken(session.access_token);
  setTenantId(mapped.user.org_id ?? null);
  return mapped;
}

function clearApiSessionState(): void {
  setAccessToken(null);
  setTenantId(null);
}

function needsWorkspaceProvisioning(session: SupabaseSession): boolean {
  const metadata = session.user.user_metadata as Record<string, unknown> | undefined;
  return !mapSupabaseSession(session).user.org_id
    && typeof metadata?.["workspace_slug"] === "string";
}

async function provisionWorkspaceForSession(
  session: SupabaseSession,
): Promise<SupabaseSession> {
  if (!needsWorkspaceProvisioning(session)) return session;
  const metadata = session.user.user_metadata as Record<string, unknown>;
  setAccessToken(session.access_token);
  setTenantId(null);
  clearAuthBackoff();
  await api.patch("/auth/provision-workspace", {
    organizationName: metadata["org_name"],
    workspaceName: metadata["workspace_name"],
    workspaceSlug: metadata["workspace_slug"],
    segment: metadata["segment"],
    tradeName: metadata["trade_name"],
    corporateEmail: metadata["corporate_email"],
    phone: metadata["phone"],
    address: metadata["address"],
    city: metadata["city"],
    state: metadata["state"],
    requestedPlan: metadata["requested_plan"],
    acceptedTerms: metadata["accepted_terms"],
    acceptedLgpd: metadata["accepted_lgpd"],
  });
  const { data, error } = await getSupabaseClient().auth.refreshSession();
  if (error || !data.session) {
    throw new Error(error?.message ?? "Não foi possível atualizar a sessão.");
  }
  return data.session;
}

let activeProvisioning: Promise<SupabaseSession> | null = null;

function ensureWorkspaceProvisioned(
  session: SupabaseSession,
): Promise<SupabaseSession> {
  if (!needsWorkspaceProvisioning(session)) return Promise.resolve(session);
  if (!activeProvisioning) {
    activeProvisioning = provisionWorkspaceForSession(session)
      .finally(() => { activeProvisioning = null; });
  }
  return activeProvisioning;
}

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    setAccessToken(null);
    setTenantId((MOCK_USER as User).org_id ?? null);
  }, []);

  const value: AuthContextType = {
    user: MOCK_USER as User,
    session: MOCK_SESSION as Session,
    loading: false,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => { /* standalone — mantém mock */ },
    resetPassword: async () => ({ error: null }),
    updatePassword: async () => ({ error: null }),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const sb = getSupabaseClient();

    sb.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const readySession = await ensureWorkspaceProvisioned(data.session);
        const s = applyApiSessionState(readySession);
        setSession(s);
        setUser(s.user);
      } else {
        clearApiSessionState();
      }
      setLoading(false);
    }).catch((error: unknown) => {
      clearApiSessionState();
      devLog("Falha no bootstrap da sessão", error);
      setLoading(false);
    });

    const { data: { subscription } } = sb.auth.onAuthStateChange((event, sbSession) => {
      if (sbSession) {
        if (needsWorkspaceProvisioning(sbSession)) {
          setLoading(true);
          window.setTimeout(() => {
            void ensureWorkspaceProvisioned(sbSession)
              .then((readySession) => {
                const ready = applyApiSessionState(readySession);
                setSession(ready);
                setUser(ready.user);
                setLoading(false);
              })
              .catch((error: unknown) => {
                devLog("Falha ao provisionar workspace", error);
                setLoading(false);
              });
          }, 0);
          return;
        }
        const s = applyApiSessionState(sbSession);
        setSession(s);
        setUser(s.user);

        logJwtClaims(sbSession.access_token, event);
        devLog(`Tenant resolvido: ${s.user.org_id ?? "(sem org — hook ativo?)"}`);
        devLog(`Role resolvida: ${s.user.role ?? "(sem role)"}`);

        if (event === "TOKEN_REFRESHED") {
          window.dispatchEvent(new CustomEvent("musicos360:auth:tokenRefreshed", {
            detail: { access_token: sbSession.access_token },
          }));
          devLog("TOKEN_REFRESHED — evento musicos360:auth:tokenRefreshed despachado");
        }
      } else {
        setSession(null);
        setUser(null);
        clearApiSessionState();
        devLog(`Sessão encerrada (${event})`);
      }
      setLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) {
      return { error: { message: error.message, status: error.status } };
    }
    if (data.session) {
      const readySession = await ensureWorkspaceProvisioned(data.session);
      const mapped = applyApiSessionState(readySession);
      setSession(mapped);
      setUser(mapped.user);
    }
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ error: AuthError | null }> => {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName ?? "",
          org_name: fullName?.trim() || email.split("@")[0],
          ...metadata,
        },
      },
    });
    if (error) return { error: { message: error.message, status: error.status } };
    if (data.session) {
      const readySession = await ensureWorkspaceProvisioned(data.session);
      const mapped = applyApiSessionState(readySession);
      setSession(mapped);
      setUser(mapped.user);
    }
    return { error: null };
  };

  const signOut = async (): Promise<void> => {
    await getSupabaseClient().auth.signOut();
    clearApiSessionState();
    setUser(null);
    setSession(null);
    queryClient.clear();
  };

  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) return { error: { message: error.message, status: error.status } };
    return { error: null };
  };

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    const { error } = await getSupabaseClient().auth.updateUser({ password });
    if (error) return { error: { message: error.message, status: error.status } };
    return { error: null };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (AUTH_DISABLED || MOCK_MODE) return <MockAuthProvider>{children}</MockAuthProvider>;
  return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
