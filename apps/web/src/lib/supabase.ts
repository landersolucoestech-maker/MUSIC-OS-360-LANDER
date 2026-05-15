/**
 * lib/supabase.ts
 *
 * Supabase client — inicialização lazy para não lançar erro em MOCK_MODE.
 * Use `getSupabaseClient()` no lugar de importar `supabase` diretamente.
 *
 * Vars de ambiente requeridas (MOCK_MODE=false):
 *   VITE_SUPABASE_URL       → Settings > API > Project URL
 *   VITE_SUPABASE_ANON_KEY  → Settings > API > anon public
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Retorna o Supabase client singleton.
 * Cria na primeira chamada — só é invocado no SupabaseAuthProvider,
 * portanto nunca roda em MOCK_MODE.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = (import.meta.env.VITE_SUPABASE_URL  as string | undefined) ?? "";
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

  if (!url || !key) {
    throw new Error(
      "[MUSIC OS 360] Supabase não configurado. " +
      "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas Secrets do Replit.",
    );
  }

  _client = createClient(url, key, {
    auth: {
      persistSession:     true,
      autoRefreshToken:   true,
      detectSessionInUrl: true,
      storageKey:         "musicos360_sb",
    },
  });

  return _client;
}
