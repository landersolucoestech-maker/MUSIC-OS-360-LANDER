/**
 * platform-profiles/soundcharts-provenance.util.ts
 *
 * Rastreabilidade obrigatória por métrica (auditoria 2026-08-31): para
 * qualquer número exibido, deve ser possível determinar de onde ele veio —
 * provider, plataforma, endpoint exato, campo exato do corpo de resposta,
 * quando foi buscado, valor bruto e valor normalizado. Um único builder
 * evita duplicar essas seis chaves em cada um dos 7 providers.
 */
import type { SoundchartsMetric } from '../../integrations/soundcharts/soundcharts.types';
import type { SocialPlatform } from './social-platform-sync.types';
import type { CrossPlatformEvidence, CrossPlatformStatus } from './soundcharts-canonical-candidates.util';

export interface SoundchartsProvenance {
  source_provider: 'soundcharts';
  source_platform: SocialPlatform;
  source_endpoint: string;
  source_field: string;
  fetched_at: string;
  normalized_at: string;
  raw_value: number;
  normalized_value: number;
  /**
   * Fase 2 — série datada completa (ISO) do mesmo endpoint, quando a
   * Soundcharts a devolveu (ver SoundchartsMetric.series). Consumida pelo
   * snapshot store para backfill de histórico real sem chamada extra à API;
   * nenhum consumidor de current-state lê este campo.
   */
  metric_series: Array<{ value: number; observed_at: string }>;
}

/** Provenance para uma métrica efetivamente obtida da Soundcharts. */
export function soundchartsProvenance(platform: SocialPlatform, metric: SoundchartsMetric): SoundchartsProvenance {
  const normalizedAt = new Date().toISOString();
  return {
    source_provider: 'soundcharts',
    source_platform: platform,
    source_endpoint: metric.endpoint,
    source_field: metric.field,
    fetched_at: metric.observedAt.toISOString(),
    normalized_at: normalizedAt,
    raw_value: metric.value,
    normalized_value: metric.value,
    metric_series: (metric.series ?? []).map((p) => ({ value: p.value, observed_at: p.observedAt.toISOString() })),
  };
}

/**
 * Provenance para o caso "conta não indexada na Soundcharts" — sem métrica,
 * mas ainda com origem rastreável (qual endpoint respondeu "não encontrado",
 * quando). Evita raw_payload vazio quando followers/subscribers ficam null.
 */
export function soundchartsNotIndexedProvenance(
  platform: SocialPlatform,
  attemptedEndpoints: string[],
): Omit<SoundchartsProvenance, 'raw_value' | 'normalized_value'> & { raw_value: null; normalized_value: null } {
  const now = new Date().toISOString();
  return {
    source_provider: 'soundcharts',
    source_platform: platform,
    source_endpoint: attemptedEndpoints.join(' ; '),
    source_field: 'items[] (empty — SoundchartsNotFoundError)',
    fetched_at: now,
    normalized_at: now,
    raw_value: null,
    normalized_value: null,
    metric_series: [],
  };
}

/**
 * Evidência de identidade primária + cross-platform para uma métrica de uma
 * das 4 âncoras (spotify/youtube/deezer/soundcloud) — Fase 1.3: o link
 * cadastrado é a autoridade; a resolução exata por-plataforma do identifier
 * cadastrado já É a prova de identidade primária (`VERIFIED_EXACT`).
 * Divergência cross-platform é sempre diagnóstico, nunca bloqueia.
 */
export interface PrimaryIdentityProvenance {
  primary_identity_status: 'VERIFIED_EXACT';
  cross_platform_status: CrossPlatformStatus;
  cross_platform_uuid: string | null;
  cross_platform_registry_identifier: string | null;
}

export function primaryIdentityProvenance(evidence: CrossPlatformEvidence): PrimaryIdentityProvenance {
  return {
    primary_identity_status: 'VERIFIED_EXACT',
    cross_platform_status: evidence.status,
    cross_platform_uuid: evidence.independentUuid,
    cross_platform_registry_identifier: evidence.registryIdentifier,
  };
}
