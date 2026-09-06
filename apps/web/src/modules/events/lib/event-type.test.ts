/**
 * event-type.test.ts
 *
 * Task S — guarda permanente: events.type só guarda o enum coarse do
 * backend (show/festival/recording/meeting/interview/tour/other). A
 * categoria granular configurada em Configurações → Operacional
 * (metadata.backend_type) precisa ser traduzida corretamente nos dois
 * sentidos usados pela Agenda: filtro (granular → coarse, para bater com o
 * dado real) e exibição (coarse real → rótulo pt-BR).
 */
import { describe, it, expect } from "vitest";
import {
  BACKEND_EVENT_TYPES,
  backendEventTypeLabels,
  buildGranularToBackendTypeMap,
  getBackendEventTypeLabel,
  normalizeToBackendType,
} from "./event-type";
import type { OperationalListItem } from "@/modules/settings/hooks/useOperationalSettings";

function item(slug: string, backendType: string): OperationalListItem {
  return {
    id: `id-${slug}`,
    kind: "event_type",
    name: slug,
    slug,
    description: "",
    active: true,
    order: 0,
    metadata: { backend_type: backendType },
  };
}

describe("buildGranularToBackendTypeMap", () => {
  it("lê metadata.backend_type de cada item operacional", () => {
    const map = buildGranularToBackendTypeMap([
      item("sessoes_estudio", "recording"),
      item("shows", "show"),
    ]);
    expect(map).toEqual({ sessoes_estudio: "recording", shows: "show" });
  });

  it("ignora itens sem metadata.backend_type válido (não injeta lixo no filtro)", () => {
    const semMetadata: OperationalListItem = { ...item("x", "recording"), metadata: undefined };
    const backendTypeInvalido: OperationalListItem = { ...item("y", "not-a-real-type") };
    const map = buildGranularToBackendTypeMap([semMetadata, backendTypeInvalido]);
    expect(map).toEqual({});
  });
});

describe("normalizeToBackendType", () => {
  const map = buildGranularToBackendTypeMap([
    item("sessoes_estudio", "recording"),
    item("reunioes", "meeting"),
  ]);

  it("traduz um slug granular configurado para o enum coarse real", () => {
    expect(normalizeToBackendType("sessoes_estudio", map)).toBe("recording");
    expect(normalizeToBackendType("reunioes", map)).toBe("meeting");
  });

  it("mantém um valor que já é um enum coarse válido", () => {
    for (const t of BACKEND_EVENT_TYPES) {
      expect(normalizeToBackendType(t, map)).toBe(t);
    }
  });

  it("cai em 'other' para valor desconhecido/ausente (nunca quebra o filtro)", () => {
    expect(normalizeToBackendType("categoria-inexistente", map)).toBe("other");
    expect(normalizeToBackendType(undefined, map)).toBe("other");
    expect(normalizeToBackendType(null, map)).toBe("other");
    expect(normalizeToBackendType("", map)).toBe("other");
  });

  it("é insensível a maiúsculas/minúsculas", () => {
    expect(normalizeToBackendType("SESSOES_ESTUDIO", map)).toBe("recording");
    expect(normalizeToBackendType("Show", map)).toBe("show");
  });
});

describe("getBackendEventTypeLabel", () => {
  it("resolve o rótulo pt-BR de cada valor coarse real", () => {
    for (const t of BACKEND_EVENT_TYPES) {
      expect(getBackendEventTypeLabel(t)).toBe(backendEventTypeLabels[t]);
    }
  });

  it("nunca lança e sempre retorna algo exibível para valor ausente/desconhecido", () => {
    expect(getBackendEventTypeLabel(undefined)).toBe("Evento");
    expect(getBackendEventTypeLabel(null)).toBe("Evento");
    expect(getBackendEventTypeLabel("valor-nunca-visto")).toBe("valor-nunca-visto");
  });
});
