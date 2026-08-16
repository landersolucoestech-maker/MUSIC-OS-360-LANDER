import type { OperationalListItem } from "@/modules/settings/hooks/useOperationalSettings";

/** Enum realmente persistido em events.tipo (CreateEventDto.type no backend). */
export const BACKEND_EVENT_TYPES = ["show", "festival", "recording", "meeting", "interview", "tour", "other"] as const;
export type BackendEventType = (typeof BACKEND_EVENT_TYPES)[number];

/** Rótulos pt-BR para o enum coarse realmente persistido (não a categoria granular do formulário). */
export const backendEventTypeLabels: Record<BackendEventType, string> = {
  show: "Show",
  festival: "Festival",
  recording: "Gravação/Estúdio",
  meeting: "Reunião",
  interview: "Entrevista/Imprensa",
  tour: "Turnê",
  other: "Outro",
};

function isBackendEventType(value: string): value is BackendEventType {
  return (BACKEND_EVENT_TYPES as readonly string[]).includes(value);
}

/**
 * A categoria de evento configurável em Configurações → Operacional é
 * granular (ex.: slug "sessoes_estudio", "ensaios") mas a coluna real
 * `events.tipo` só guarda o enum coarse do backend — não existe coluna para
 * a distinção granular. Cada item operacional carrega essa correspondência
 * em `metadata.backend_type` (ver useOperationalSettings.ts,
 * DEFAULT_EVENT_TYPES) — este helper lê exatamente essa fonte de verdade em
 * vez de manter uma tabela duplicada e divergente.
 */
export function buildGranularToBackendTypeMap(items: OperationalListItem[]): Record<string, BackendEventType> {
  const map: Record<string, BackendEventType> = {};
  for (const item of items) {
    const backendType = item.metadata?.["backend_type"];
    if (typeof backendType === "string" && isBackendEventType(backendType)) {
      map[item.slug] = backendType;
    }
  }
  return map;
}

/** Normaliza um valor livre (slug granular OU já um enum coarde) para o enum coarse real. */
export function normalizeToBackendType(
  value: string | null | undefined,
  granularMap: Record<string, BackendEventType>,
): BackendEventType {
  if (!value) return "other";
  const v = value.trim().toLowerCase();
  if (isBackendEventType(v)) return v;
  return granularMap[v] ?? "other";
}

/** Label pt-BR para o valor coarse real de um evento já persistido. */
export function getBackendEventTypeLabel(tipo: string | null | undefined): string {
  if (!tipo) return "Evento";
  return backendEventTypeLabels[tipo as BackendEventType] ?? tipo;
}
