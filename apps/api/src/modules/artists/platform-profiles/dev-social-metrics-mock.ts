/**
 * platform-profiles/dev-social-metrics-mock.ts
 *
 * Fallback de DESENVOLVIMENTO para Instagram/TikTok quando a Soundcharts
 * responde "nenhuma conta social vinculada" (404 real, validado contra a API
 * — ver InstagramArtistProfileProvider/TikTokArtistProfileProvider). Isso não
 * é um bug de pipeline: artistas sintéticos de dev/seed nunca estarão
 * indexados na Soundcharts. Sem este fallback, o card fica permanentemente
 * "Indisponível" em qualquer ambiente local, mesmo com credenciais válidas.
 *
 * Gate igual ao de AUTH_DISABLED/USE_MOCK (env.schema.ts): só ativa com
 * AMBOS
 *   1. opt-in explícito USE_MOCK=true (flag já existente e já bloqueada em
 *      staging/production por env.schema.ts + create-app.ts +
 *      security-startup.service.ts — reaproveitada aqui, não inventamos
 *      DEV_MOCK_SOCIAL_ANALYTICS nem nenhuma flag nova);
 *   2. NODE_ENV não é production/staging (isProdLike).
 * Dado real da Soundcharts SEMPRE tem prioridade — este fallback só roda
 * depois que a resolução real (canônica + próprio handle) já retornou 404.
 * O snapshot resultante é marcado em raw_payload.source = 'dev_mock' para
 * nunca ser confundido com uma métrica real (nunca aparece em produção).
 */
import { createHash } from 'crypto';
import { isProdLike } from '../../../core/config/runtime-environment';

export function isDevMockSocialMetricsEnabled(): boolean {
  return process.env['USE_MOCK'] === 'true' && !isProdLike(process.env['NODE_ENV']);
}

/**
 * Número determinístico de seguidores por (artistId, platform) — estável
 * entre re-syncs (não pisca a cada refresh), sem depender de nenhuma
 * biblioteca de random. Faixa plausível para um artista independente
 * (1.000–150.000), nunca 0 (0 real tem significado próprio: "sem seguidores
 * ainda", diferente de "sem dado disponível" — não é o que este mock simula).
 */
export function mockFollowersFor(artistId: string, platform: 'instagram' | 'tiktok'): number {
  const hash = createHash('sha256').update(`${artistId}:${platform}`).digest();
  const seed = hash.readUInt32BE(0);
  return 1_000 + (seed % 149_000);
}
