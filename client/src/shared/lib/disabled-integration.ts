/**
 * Helper compartilhado pelas integrações externas (Spotify, YouTube,
 * Apple Music, Deezer, SoundCloud, ABRAMUS, Autentique, Resend, IA
 * Criativa, Meta Ads). Todas essas integrações devolvem o mesmo
 * erro padronizado enquanto o backend substituto não estiver configurado.
 * A UI renderiza "Integração desativada — backend não configurado".
 */

export const INTEGRATION_DISABLED_CODE = "integration_disabled";

export class DisabledIntegrationError extends Error {
  status: number;
  code: string;
  constructor(name: string) {
    super(
      `Integração ${name} desativada — backend não configurado. ` +
        `Conecte um backend ao app para reativá-la.`,
    );
    this.name = "DisabledIntegrationError";
    this.code = INTEGRATION_DISABLED_CODE;
    this.status = 503;
  }
}

export function disabledIntegration(name: string): never {
  throw new DisabledIntegrationError(name);
}
