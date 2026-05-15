/**
 * app/providers/AuthContext.tsx
 *
 * AuthContext — bridge multi-modo:
 *
 * MOCK_MODE=true  (standalone / desenvolvimento):
 *   Usuário mock sempre autenticado. Sem chamadas HTTP.
 *
 * MOCK_MODE=false:
 *   Autenticação real via NestJS JWT.
 *   POST /auth/login  → access_token (JWT)
 *   POST /auth/refresh → access_token
 *   POST /auth/logout  → 204
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
} from "react";
import type { AuthError, Session, User } from "@/shared/types/auth";
import { MOCK_USER, MOCK_SESSION } from "@/shared/data/mockData";
import { setAccessToken } from "@/shared/lib/api-client";
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

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? "";

// ─── Helpers JWT ──────────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const b64 = token.split(".")[1];
    return JSON.parse(atob(b64!.replace(/-/g, "+").replace(/_/g, "/")));
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

// ─── Provider — NestJS JWT ────────────────────────────────────────────────────

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
  if (MOCK_MODE) return <MockAuthProvider>{children}</MockAuthProvider>;
  return           <NestAuthProvider>{children}</NestAuthProvider>;
}

// ─── Hook público ─────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}

// getSessionOrgId está em @/shared/lib/get-session-org-id para compatibilidade
// com Vite Fast Refresh (ficheiros só podem exportar componentes OU utilitários).
