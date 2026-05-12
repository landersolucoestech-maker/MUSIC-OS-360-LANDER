import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import type { AuthError, Session, User } from "@/shared/types/auth";
import { MOCK_USER, MOCK_SESSION } from "@/shared/data/mockData";
import {
  setAccessToken,
  getAccessToken,
} from "@/shared/lib/api-client";
import { MOCK_MODE, API_BASE_URL } from "@/shared/lib/env";

/**
 * AuthContext — suporta dois modos:
 *
 * VITE_MOCK_MODE=true  (desenvolvimento):
 *   Modo standalone — usuário mock sempre autenticado, sem chamadas HTTP.
 *
 * VITE_MOCK_MODE=false (produção / backend):
 *   Autenticação real via NestJS:
 *   - signIn  → POST /auth/login  → access_token em memória + refresh_token no localStorage
 *   - signOut → POST /auth/logout → limpa tokens
 *   - signUp  → POST /auth/register + login automático
 *   - On mount: tenta renovar sessão com refresh_token salvo
 */


interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (
    email: string,
    password: string,
    fullName?: string
  ) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── JWT decode helper ────────────────────────────────────────────────────────

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return {};
  }
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

// ─── Real HTTP auth helpers ───────────────────────────────────────────────────

async function httpPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    credentials: "include",   // sends httpOnly refresh cookie automatically
    headers: { "Content-Type": "application/json" },
    ...(body !== null ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json() as T & { message?: string };
  if (!res.ok) throw new Error((data as { message?: string }).message ?? res.statusText);
  return data;
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,    setUser]    = useState<User | null>(MOCK_MODE ? (MOCK_USER as User) : null);
  const [session, setSession] = useState<Session | null>(MOCK_MODE ? (MOCK_SESSION as Session) : null);
  const [loading, setLoading] = useState(!MOCK_MODE);

  const initDone = useRef(false);

  // On mount (real mode): try to restore session via httpOnly cookie.
  // The browser sends the cookie automatically; no stored token needed.
  useEffect(() => {
    if (MOCK_MODE || initDone.current) return;
    initDone.current = true;

    httpPost<{ access_token: string }>("/auth/refresh", null)
      .then(({ access_token }) => {
        setAccessToken(access_token);
        const s = tokenToSession(access_token);
        setSession(s);
        setUser(s.user);
      })
      .catch(() => { /* no valid cookie — stay logged out */ })
      .finally(() => setLoading(false));
  }, []);

  // ─── Mock mode methods ────────────────────────────────────────────────────

  if (MOCK_MODE) {
    const signIn    = async (_e: string, _p: string) => { setUser(MOCK_USER as User); setSession(MOCK_SESSION as Session); return { error: null }; };
    const signUp    = async (_e: string, _p: string, _n?: string) => { setUser(MOCK_USER as User); setSession(MOCK_SESSION as Session); return { error: null }; };
    const signOut   = async () => { /* standalone — mantém usuário mock */ };
    const resetPassword  = async (_e: string)  => ({ error: null });
    const updatePassword = async (_p: string)  => ({ error: null });

    return (
      <AuthContext.Provider value={{ user, session, loading: false, signIn, signUp, signOut, resetPassword, updatePassword }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // ─── Real mode methods ────────────────────────────────────────────────────

  const signIn = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    try {
      const { access_token } = await httpPost<{ access_token: string }>(
        "/auth/login",
        { email, password },
      );
      setAccessToken(access_token);
      // backend sets httpOnly refresh cookie in Set-Cookie header automatically
      const s = tokenToSession(access_token);
      setSession(s);
      setUser(s.user);
      return { error: null };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : "Erro ao fazer login" } };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string): Promise<{ error: AuthError | null }> => {
    try {
      const orgNome = (fullName?.trim()) || email.split("@")[0].replace(/[^a-zA-Z0-9\s]/g, "").trim() || "Organization";
      const { access_token } = await httpPost<{ access_token: string }>(
        "/auth/register",
        { email, password, full_name: fullName, org_nome: orgNome },
      );
      setAccessToken(access_token);
      const s = tokenToSession(access_token);
      setSession(s);
      setUser(s.user);
      return { error: null };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : "Erro ao criar conta" } };
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // POST /auth/logout reads the cookie server-side and revokes it
      await httpPost("/auth/logout", null);
    } catch { /* ignore */ }
    setAccessToken(null);
    setUser(null);
    setSession(null);
  };

  const resetPassword = async (email: string): Promise<{ error: AuthError | null }> => {
    try {
      await httpPost("/auth/forgot-password", { email });
      return { error: null };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : "Erro ao solicitar redefinição de senha" } };
    }
  };

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    try {
      await httpPost("/auth/reset-password", { password });
      return { error: null };
    } catch (err) {
      return { error: { message: err instanceof Error ? err.message : "Erro ao atualizar senha" } };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut, resetPassword, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

/** Reads the current org_id from the JWT stored in memory (real mode) or from MOCK_DATA. */
export function getSessionOrgId(): string | null {
  if (MOCK_MODE) return null; // tenant.ts uses MOCK_ORG_ID
  const token = getAccessToken();
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    const p = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/"))) as Record<string, unknown>;
    return typeof p["org_id"] === "string" ? p["org_id"] : null;
  } catch { return null; }
}
