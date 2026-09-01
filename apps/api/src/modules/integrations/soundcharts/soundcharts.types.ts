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
  /** Caminho exato do endpoint Soundcharts que produziu `value` (provenance). */
  endpoint: string;
  /** Campo exato do corpo de resposta de onde `value` foi lido (provenance). */
  field: string;
  /**
   * Fase 2 — série completa de pontos datados que o mesmo endpoint já
   * devolveu (a Soundcharts responde ~15 pontos históricos por chamada de
   * audience/streaming/playlist; antes descartados por pickLatest). Aditivo
   * e opcional: nenhum consumidor existente lê este campo, então preenchê-lo
   * não muda `.value`/`.observedAt`/`.source`/`.endpoint`/`.field` para
   * nenhum provider — usado só pelo snapshot store para backfill real sem
   * chamada extra à API.
   */
  series?: Array<{ value: number; observedAt: Date }>;
}
