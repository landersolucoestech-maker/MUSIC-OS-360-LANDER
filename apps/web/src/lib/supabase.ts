/**
 * lib/supabase.ts
 *
 * Supabase client singleton.
 * Auth persistente + refresh automático + sessão salva no localStorage.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();

  if (!trimmed) return "";

  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://")
  ) {
    return trimmed;
  }

  return `https://${trimmed}.supabase.co`;
}

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const rawUrl =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";

  const anonKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

  const url = normalizeSupabaseUrl(rawUrl);

  if (!url || !anonKey) {
    throw new Error(
      "[MUSIC OS 360] Missing Supabase configuration",
    );
  }

  console.info(
    "[MUSIC OS 360] Supabase initialized:",
    url,
  );

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: "musicos360_auth",
    },
  });

  return _client;
}
