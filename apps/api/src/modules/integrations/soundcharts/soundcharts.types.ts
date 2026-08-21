/**
 * modules/integrations/soundcharts/soundcharts.types.ts
 *
 * Contrato normalizado de saída — não é o schema de ArtistPlatformProfile
 * (essa integração acontece numa etapa posterior). Isolado aqui para os
 * métodos de métrica do SoundchartsService devolverem sempre a mesma forma,
 * independentemente do formato bruto de cada endpoint da Soundcharts.
 */
export interface SoundchartsMetric {
  value: number;
  observedAt: Date;
  source: 'soundcharts';
}
