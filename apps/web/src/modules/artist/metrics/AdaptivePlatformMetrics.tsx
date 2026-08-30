/**
 * metrics/AdaptivePlatformMetrics.tsx
 *
 * Renderer adaptativo: recebe a plataforma e os valores disponíveis, consulta o
 * capability registry e desenha SOMENTE o que aquela fonte realmente suporta.
 *
 * Não decide por `if (platform === ...)`: a diferença entre plataformas vive no
 * registry. Plataformas com schemas diferentes renderizam conjuntos diferentes
 * sem código específico.
 */

import {
  resolvePlatformMetrics,
  metricCapabilitiesOf,
  formatMetricValue,
  type PlatformMetricKey,
} from "./platform-metric-capabilities";

interface Props {
  platform: string;
  values: Partial<Record<PlatformMetricKey, number | null | undefined>>;
  /** Texto quando a fonte suporta métrica mas o valor ainda não chegou. */
  unavailableLabel?: string;
  testIdPrefix?: string;
}

export function AdaptivePlatformMetrics({
  platform,
  values,
  unavailableLabel = "Indisponível",
  testIdPrefix = "metric",
}: Props) {
  const supported = metricCapabilitiesOf(platform);
  const resolved = resolvePlatformMetrics(platform, values);

  // A fonte não fornece métrica para esta plataforma (ex.: Apple Music).
  // Não inventamos card nem "0"/"N/A" — dizemos o que é verdade.
  if (supported.length === 0) {
    return (
      <p className="text-[10px] text-muted-foreground" data-testid={`${testIdPrefix}-${platform}-unsupported`}>
        Sem métrica de audiência nesta fonte
      </p>
    );
  }

  return (
    <div className="space-y-1" data-testid={`${testIdPrefix}-${platform}`}>
      {supported.map((d) => {
        const hit = resolved.find((r) => r.key === d.key);
        return (
          <div key={d.key} className="flex items-baseline gap-2">
            <span
              className="text-sm font-semibold text-foreground"
              data-testid={`${testIdPrefix}-${platform}-${d.key}`}
            >
              {/* `0` real é dado e é renderizado; ausente nunca vira 0. */}
              {hit ? formatMetricValue(hit.value) : unavailableLabel}
            </span>
            <span className="text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}
