/**
 * app/providers/AuthContext.tsx
 *
 * AuthContext — bridge multi-modo:
 *
 * MOCK_MODE=true  (standalone / desenvolvimento):
 *   Usuário mock sempre autenticado. Sem Clerk. Sem chamadas HTTP.
 *
 * MOCK_MODE=false + VITE_CLERK_PUBLISHABLE_KEY definida:
 *   Bridge Clerk — ClerkBridgeInner usa hooks @clerk/clerk-react.
 *   Só é renderizado quando ClerkProvider já está na árvore (main.tsx).
 *
 * MOCK_MODE=false sem VITE_CLERK_PUBLISHABLE_KEY:
 *   Autenticação real via NestJS JWT (legado / migração interna).
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import {
  useAuth as useClerkAuth,
  useUser,
} from "@clerk/clerk-react";
import type { AuthError, Session, User } from "@/shared/types/auth";
import { MOCK_USER, MOCK_SESSION } from "@/shared/data/mockData";
import { setAccessToken, getAccessToken } from "@/shared/lib/api-client";
import { MOCK_MODE } from "@/shared/lib/env";

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

// ─── Constantes ───────────────────────────────────────────────────────────────

const CLERK_KEY     = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const useClerkMode  = !MOCK_MODE && Boolean(CLERK_KEY);
const API_BASE_URL  = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

// ─── Helpers JWT ──────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1];
    return JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/")));
  } catch { return {}; }
}

function tokenToUser(token: string): User {
  const p = decodeJwtPayload(token);
  return {
    id:    String(p["sub"] ?? ""),
    email: String(p["email"] ?? ""),
    user_metadata: { role: p["role"], org_id: p["org_id"] },
    ...p,
  };
}

function tokenToSession(access: string): Session {
  const p = decodeJwtPayload(access);
  return {
    access_token: access,
    expires_at:   typeof p["exp"] === "number" ? (p["exp"] as number) * 1000 : undefined,
    user:         tokenToUser(access),
  };
}

async function httpPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method:      "POST",
    credentials: "include",
    headers:     { "Content-Type": "application/json" },
    ...(body !== null ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json() as T & { message?: string };
  if (!res.ok) throw new Error((data as { message?: string }).message ?? res.statusText);
  return data;
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

// ─── Provider — Clerk Bridge ──────────────────────────────────────────────────
// Só é renderizado quando ClerkProvider já está na árvore (ver main.tsx).
// Os hooks useClerkAuth / useUser / useOrganization são seguros aqui.

/**
 * Deriva o role do usuário a partir do localStorage.
 * O Register.tsx persiste `adminEmail` no objeto `musicos360_current_tenant`.
 * Se o email do usuário bater com `adminEmail`, ele é o fundador → owner.
 * Caso contrário, padrão seguro: viewer (até que role real seja carregado da API).
 */
function deriveRoleFromStorage(email: string): string {
  try {
    const raw = localStorage.getItem("musicos360_current_tenant");
    if (!raw) return "viewer";
    const stored = JSON.parse(raw) as { adminEmail?: string };
    if (stored.adminEmail && stored.adminEmail === email) return "owner";
  } catch { /* ignore */ }
  return "viewer";
}

function ClerkBridgeInner({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, signOut: clerkSignOut, getToken } = useClerkAuth();
  const { user: clerkUser }  = useUser();

  const clerkEmail = clerkUser?.primaryEmailAddress?.emailAddress ?? "";

  const user: User | null = clerkUser
    ? {
        id:    clerkUser.id,
        email: clerkEmail,
        user_metadata: {
          full_name:  clerkUser.fullName ?? "",
          role:       deriveRoleFromStorage(clerkEmail),
          org_id:     "",
          avatar_url: clerkUser.imageUrl,
        },
      }
    : null;

  const session: Session | null = isSignedIn ? { access_token: "", user: user! } : null;

  // Injectar token Clerk nos headers de API (NestJS backend) + refresh periódico
  useEffect(() => {
    if (!isSignedIn) {
      setAccessToken(null);
      return;
    }

    const refreshToken = async () => {
      try {
        const token = await getToken();
        if (token) setAccessToken(token);
      } catch (err) {
        console.error("Falha ao renovar token Clerk:", err);
      }
    };

    // Refresh imediato ao entrar
    void refreshToken();

    // Renovar a cada 55 minutos (token Clerk expira em 60min)
    const interval = setInterval(() => void refreshToken(), 55 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isSignedIn, getToken]);

  const value: AuthContextType = {
    user,
    session,
    loading:       !isLoaded,
    signIn:        async () => ({ error: null }), // Clerk usa UI própria (SignIn component)
    signUp:        async () => ({ error: null }), // Clerk usa UI própria
    signOut:       async () => { await clerkSignOut(); },
    resetPassword: async () => ({ error: null }),
    updatePassword:async () => ({ error: null }),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Provider — NestJS JWT (modo real sem Clerk) ──────────────────────────────

function NestAuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const initDone              = useRef(false);

  useEffect(() => {
    if (initDone.current) return;
    initDone.current = true;
    httpPost<{ access_token: string }>("/auth/refresh", null)
      .then(({ access_token }) => {
        setAccessToken(access_token);
        const s = tokenToSession(access_token);
        setSession(s);
        setUser(s.user);
      })
      .catch(() => { /* sem cookie válido — fica deslogado */ })
      .finally(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const { access_token } = await httpPost<{ access_token: string }>("/auth/login", { email, password });
      setAccessToken(access_token);
      const s = tokenToSession(access_token);
      setSession(s); setUser(s.user);
      return { error: null };
    } catch (err) { return { error: { message: err instanceof Error ? err.message : "Erro ao fazer login" } }; }
  };

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error: AuthError | null }> => {
    try {
      const orgNome = fullName?.trim() || email.split("@")[0].replace(/[^a-zA-Z0-9\s]/g, "").trim() || "Organization";
      const { access_token } = await httpPost<{ access_token: string }>("/auth/register", { email, password, full_name: fullName, org_nome: orgNome });
      setAccessToken(access_token);
      const s = tokenToSession(access_token);
      setSession(s); setUser(s.user);
      return { error: null };
    } catch (err) { return { error: { message: err instanceof Error ? err.message : "Erro ao criar conta" } }; }
  };

  const signOut = async (): Promise<void> => {
    try { await httpPost("/auth/logout", null); } catch { /* ignore */ }
    setAccessToken(null); setUser(null); setSession(null);
  };

  const resetPassword  = async (email: string):    Promise<{ error: AuthError | null }> => {
    try { await httpPost("/auth/forgot-password", { email }); return { error: null }; }
    catch (err) { return { error: { message: err instanceof Error ? err.message : "Erro ao solicitar redefinição" } }; }
  };

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    try { await httpPost("/auth/reset-password", { password }); return { error: null }; }
    catch (err) { return { error: { message: err instanceof Error ? err.message : "Erro ao atualizar senha" } }; }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── AuthProvider principal ───────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (MOCK_MODE)      return <MockAuthProvider>{children}</MockAuthProvider>;
  if (useClerkMode)   return <ClerkBridgeInner>{children}</ClerkBridgeInner>;
  return                     <NestAuthProvider>{children}</NestAuthProvider>;
}

// ─── Hook público ─────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

// getSessionOrgId está em @/shared/lib/get-session-org-id para compatibilidade
// com Vite Fast Refresh (ficheiros só podem exportar componentes OU utilitários).
