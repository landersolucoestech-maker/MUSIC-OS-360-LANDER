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
import type { Session as SupabaseSession, User as SupabaseUser } from "@supabase/supabase-js";
import type { AuthError, Session, User } from "@/shared/types/auth";
import { MOCK_USER, MOCK_SESSION } from "@/shared/data/mockData";
import { setAccessToken } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";
import { getSupabaseClient } from "@/lib/supabase";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface AuthContextType {
  user:            User | null;
  session:         Session | null;
  loading:         boolean;
  signIn:          (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp:          (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
  signOut:         () => Promise<void>;
  resetPassword:   (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword:  (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Mappers Supabase → tipos internos ────────────────────────────────────────

function mapSupabaseUser(u: SupabaseUser): User {
  const meta = u.user_metadata as Record<string, unknown> | undefined;
  const app  = u.app_metadata  as Record<string, unknown> | undefined;
  return {
    id:            u.id,
    email:         u.email,
    role:          (app?.["role"] ?? meta?.["role"]) as string | undefined,
    org_id:        (app?.["org_id"] ?? meta?.["org_id"]) as string | undefined,
    user_metadata: { ...meta, ...app },
  };
}

function mapSupabaseSession(s: SupabaseSession): Session {
  return {
    access_token:  s.access_token,
    refresh_token: s.refresh_token,
    expires_at:    s.expires_at ? s.expires_at * 1000 : undefined,
    user:          mapSupabaseUser(s.user),
  };
}

// ─── Provider — Mock Mode ─────────────────────────────────────────────────────

function MockAuthProvider({ children }: { children: React.ReactNode }) {
  const value: AuthContextType = {
    user:            MOCK_USER as User,
    session:         MOCK_SESSION as Session,
    loading:         false,
    signIn:          async () => ({ error: null }),
    signUp:          async () => ({ error: null }),
    signOut:         async () => { /* standalone — mantém mock */ },
    resetPassword:   async () => ({ error: null }),
    updatePassword:  async () => ({ error: null }),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Provider — Supabase Auth ─────────────────────────────────────────────────

function SupabaseAuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone              = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;

    const sb = getSupabaseClient();

    // Hidrata sessão existente (localStorage via Supabase SDK)
    sb.auth.getSession().then(({ data }) => {
      if (data.session) {
        const s = mapSupabaseSession(data.session);
        setSession(s);
        setUser(s.user);
        setAccessToken(data.session.access_token);
      }
      setLoading(false);
    });

    // Reactivo: escuta mudanças de sessão (login, logout, refresh automático)
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, sbSession) => {
      if (sbSession) {
        const s = mapSupabaseSession(sbSession);
        setSession(s);
        setUser(s.user);
        setAccessToken(sbSession.access_token);
      } else {
        setSession(null);
        setUser(null);
        setAccessToken(null);
      }
      setLoading(false);
    });

    return () => { subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) return { error: { message: error.message, status: error.status } };
    return { error: null };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
  ): Promise<{ error: AuthError | null }> => {
    const { error } = await getSupabaseClient().auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName ?? "",
          org_name:  fullName?.trim() || email.split("@")[0],
        },
      },
    });
    if (error) return { error: { message: error.message, status: error.status } };
    return { error: null };
  };

  const signOut = async (): Promise<void> => {
    await getSupabaseClient().auth.signOut();
    setAccessToken(null);
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    const redirectTo = `${window.location.origin}/auth?mode=reset`;
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

// ─── AuthProvider principal ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (MOCK_MODE) return <MockAuthProvider>{children}</MockAuthProvider>;
  return           <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
}

// ─── Hook público ─────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

// getSessionOrgId está em @/shared/lib/get-session-org-id para compatibilidade
// com Vite Fast Refresh (ficheiros só podem exportar componentes OU utilitários).
