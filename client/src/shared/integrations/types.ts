/**
 * shared/integrations/types.ts
 *
 * Tipos centrais do sistema de integrações do MUSIC OS 360.
 * Este ficheiro é a fonte de verdade para todos os identificadores,
 * categorias e contratos de metadados de integrações.
 *
 * REGRA: código de domínio NUNCA importa daqui directamente —
 * usa o adapter do seu próprio módulo.
 */

// ─── Identificadores ──────────────────────────────────────────────────────────

/**
 * Identificador canónico de cada integração.
 * Usado como chave no registry, em queryKeys, e em localStorage.
 */
export type IntegrationId =
  // Auth
  | "clerk"
  // Storage
  | "r2"
  // Email
  | "resend"
  // Pagamentos
  | "stripe"
  // Assinatura digital
  | "autentique"
  // Monitoramento de produto / erros
  | "posthog"
  | "sentry"
  // Streaming / métricas
  | "spotify"
  | "youtube"
  | "tiktok"
  | "instagram"
  | "google-ads"
  | "deezer"
  | "apple-music"
  | "soundcloud"
  // Arrecadação / direitos autorais
  | "ecad"
  | "ubc"
  | "abramus"
  // Monitoramento musical (fingerprint)
  | "acrcloud"
  // Comunicação interna
  | "chat";

// ─── Categorias ───────────────────────────────────────────────────────────────

export type IntegrationCategory =
  | "auth"
  | "storage"
  | "email"
  | "payments"
  | "signing"
  | "monitoring"
  | "streaming"
  | "rights"
  | "music-monitoring"
  | "chat";

// ─── Status ──────────────────────────────────────────────────────────────────

export type IntegrationStatus =
  | "connected"
  | "disconnected"
  | "error"
  | "pending"
  | "disabled";

// ─── Metadados ───────────────────────────────────────────────────────────────

/**
 * Metadados descritivos de uma integração.
 * Consumido pelo registry e pelas UIs de configuração.
 */
export interface IntegrationMeta {
  /** Identificador canónico */
  id: IntegrationId;
  /** Nome de exibição */
  name: string;
  /** Categoria funcional */
  category: IntegrationCategory;
  /** Descrição curta para UI */
  description: string;
  /** URL da documentação oficial */
  docsUrl?: string;
  /**
   * Chave de localStorage onde as credenciais são guardadas.
   * Convenção: `musicos360_<id>_credentials`
   */
  credentialsKey?: string;
  /**
   * Indica se a integração é obrigatória para o funcionamento
   * básico da plataforma (ex.: auth).
   */
  required?: boolean;
}

// ─── Credenciais genéricas ───────────────────────────────────────────────────

/**
 * Wrapper de credenciais genérico.
 * Cada integração define o tipo concreto de `T`.
 */
export interface IntegrationCredentials<T extends Record<string, string>> {
  integration_id: IntegrationId;
  credentials: T;
  saved_at: string;
}

// ─── Health check ─────────────────────────────────────────────────────────────

export interface IntegrationHealthCheck {
  healthy: boolean;
  latency_ms?: number;
  error?: string;
  checked_at: string;
}

// ─── Estado runtime ──────────────────────────────────────────────────────────

/**
 * Estado runtime de uma integração (retornado pelos hooks `use<X>Status`).
 */
export interface IntegrationRuntimeStatus {
  integration_id: IntegrationId;
  status: IntegrationStatus;
  connected: boolean;
  last_error?: string | null;
  last_checked_at?: string | null;
  /** Campos específicos de cada integração são acrescentados via extensão */
  [key: string]: unknown;
}
