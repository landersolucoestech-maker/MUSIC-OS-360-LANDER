/**
 * lib/supabase.ts
 *
 * Supabase client — inicialização lazy para não lançar erro em MOCK_MODE.
 * Use `getSupabaseClient()` no lugar de importar `supabase` diretamente.
 *
 * Vars de ambiente requeridas (MOCK_MODE=false):
 *   VITE_SUPABASE_URL       → Settings > API > Project URL  (https://xxxx.supabase.co)
 *   VITE_SUPABASE_ANON_KEY  → Settings > API > anon public
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Normaliza a URL do Supabase.
 * Aceita tanto o Project URL completo quanto apenas o project reference ID.
 *   "https://xxxx.supabase.co"  → mantém como está
 *   "xxxx"                      → constrói "https://xxxx.supabase.co"
 */
function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  // Project reference ID sem protocolo → monta URL completa
  return `https://${trimmed}.supabase.co`;
}

/**
 * Retorna o Supabase client singleton.
 * Cria na primeira chamada — só é invocado no SupabaseAuthProvider,
 * portanto nunca roda em MOCK_MODE.
 */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? "";
  const key    = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";
  const url    = normalizeSupabaseUrl(rawUrl);

  if (import.meta.env.DEV) {
    console.info(
      `[MUSIC OS 360] Supabase URL: ${url || "(vazio)"} | anon key: ${key ? "✓ presente" : "✗ ausente"}`,
    );
  }

  if (!url || !key) {
    throw new Error(
      "[MUSIC OS 360] Supabase não configurado. " +
      "Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas Secrets do Replit. " +
      "VITE_SUPABASE_URL aceita tanto o Project URL completo quanto apenas o project reference ID.",
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
