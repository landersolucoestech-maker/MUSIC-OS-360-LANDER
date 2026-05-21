/**
 * lib/supabase.ts
 *
 * Supabase client singleton.
 * Auth persistente + refresh automático + sessão salva no localStorage.
 *
 * O cliente é armazenado em window.__musicos360_sb para sobreviver
 * ao HMR do Vite (que re-avalia módulos e resetaria uma variável local).
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

declare global {
  interface Window {
    __musicos360_sb?: SupabaseClient;
  }
}

function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}.supabase.co`;
}

export function getSupabaseClient(): SupabaseClient {
  if (window.__musicos360_sb) return window.__musicos360_sb;

  const rawUrl  = (import.meta.env.VITE_SUPABASE_URL      as string | undefined) ?? "";
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  const url     = normalizeSupabaseUrl(rawUrl);

  if (!url || !anonKey) {
    throw new Error("[MUSIC OS 360] Missing Supabase configuration");
  }

  console.info("[MUSIC OS 360] Supabase initialized:", url);

  window.__musicos360_sb = createClient(url, anonKey, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storage:            window.localStorage,
      storageKey:         "musicos360_auth",
      flowType:           "implicit",
    },
  });

  return window.__musicos360_sb;
}

export const supabase = getSupabaseClient();
