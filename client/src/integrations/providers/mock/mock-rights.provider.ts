/**
 * integrations/providers/mock/mock-rights.provider.ts
 *
 * Implementação mock de IRightsProvider.
 * Cobre ECAD, UBC e Abramus com dados gerados.
 *
 * MIGRAÇÃO FUTURA: uma classe concreta por entidade (EcadRightsProvider, etc.)
 */

import type {
  IRightsProvider,
  RightsEntityId,
  RightsKind,
  RightsRegistrationStatus,
  RightsSearchQuery,
  RightsSearchResult,
  ArrecadacaoEntry,
  ArrecadacaoSummary,
  ConciliacaoResult,
} from "@/integrations/dto";

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class MockRightsProvider implements IRightsProvider {
  constructor(readonly entity: RightsEntityId) {}

  async search(query: RightsSearchQuery): Promise<RightsSearchResult[]> {
    const limit = query.limit ?? 10;
    const results: RightsSearchResult[] = [];
    for (let i = 0; i < Math.min(limit, 5); i++) {
      results.push({
        external_id:  `${this.entity}_ext_${i + 1}`,
        kind:         query.kind,
        titulo:       `${query.query} — Resultado ${i + 1}`,
        iswc:         query.kind === "obra"       ? `T-345.678.${i}90-1` : null,
        isrc:         query.kind === "fonograma"  ? `BR-MOS-24-${String(i + 1).padStart(5, "0")}` : null,
        compositores: ["Compositor Mock"],
        interpretes:  ["Artista Mock"],
        gravadora:    "Gravadora Mock LTDA",
        genero:       "MPB",
        data_registro: "2024-01-01",
      });
    }
    return results;
  }

  async import(
    _kind: RightsKind,
    externalId: string
  ): Promise<{ local_id: string }> {
    const local_id = `local_${this.entity}_${externalId}`;
    console.info(`[MockRightsProvider:${this.entity}] import → ${externalId} → ${local_id}`);
    return { local_id };
  }

  async getRegistrationStatus(
    kind: RightsKind,
    localId: string
  ): Promise<RightsRegistrationStatus> {
    return {
      entity:         this.entity,
      kind,
      local_id:       localId,
      external_id:    `${this.entity}_ext_${localId}`,
      code:           `${this.entity.toUpperCase()}-${ri(100000, 999999)}`,
      registered:     true,
      registered_at:  "2024-06-01T00:00:00.000Z",
      last_synced_at: new Date().toISOString(),
    };
  }

  async syncAll(): Promise<{ synced: number; errors: number }> {
    console.info(`[MockRightsProvider:${this.entity}] syncAll`);
    return { synced: ri(5, 50), errors: 0 };
  }

  async getArrecadacao(periodo: string): Promise<ArrecadacaoEntry[]> {
    const entries: ArrecadacaoEntry[] = [];
    const tipos = [
      "execucao_publica",
      "streaming",
      "sincronizacao",
    ] as const;

    for (let i = 0; i < 6; i++) {
      const bruto = ri(10_000, 500_000);
      entries.push({
        id:                 `arrecad_${this.entity}_${i}`,
        entity:             this.entity,
        tipo:               tipos[i % tipos.length],
        obra_id:            `obra_${i + 1}`,
        fonograma_id:       `fono_${i + 1}`,
        periodo,
        valor_bruto_cents:  bruto,
        valor_liquido_cents: Math.floor(bruto * 0.75),
        execucoes:          ri(100, 50_000),
        fonte:              ["Spotify Brasil", "Globo", "SBT", "Rádio CBN"][i % 4],
        referencia:         `REF-${this.entity.toUpperCase()}-${periodo}-${i}`,
        created_at:         new Date().toISOString(),
      });
    }
    return entries;
  }

  async getArrecadacaoSummary(periodo: string): Promise<ArrecadacaoSummary> {
    const entries = await this.getArrecadacao(periodo);
    const total_bruto  = entries.reduce((s, e) => s + e.valor_bruto_cents, 0);
    const total_liquido = entries.reduce((s, e) => s + e.valor_liquido_cents, 0);

    return {
      entity:               this.entity,
      periodo,
      total_bruto_cents:    total_bruto,
      total_liquido_cents:  total_liquido,
      total_execucoes:      entries.reduce((s, e) => s + (e.execucoes ?? 0), 0),
      por_tipo: {
        execucao_publica: entries.filter(e => e.tipo === "execucao_publica").reduce((s,e) => s+e.valor_bruto_cents, 0),
        streaming:        entries.filter(e => e.tipo === "streaming").reduce((s,e) => s+e.valor_bruto_cents, 0),
        sincronizacao:    entries.filter(e => e.tipo === "sincronizacao").reduce((s,e) => s+e.valor_bruto_cents, 0),
        mecanica:         0,
        sonorizacao:      0,
      },
    };
  }

  async conciliar(periodo: string): Promise<ConciliacaoResult> {
    const entries = await this.getArrecadacao(periodo);
    return {
      matched: entries.map((e) => ({
        local_id:      e.obra_id ?? "",
        external_id:   `${this.entity}_ext_${e.obra_id}`,
        titulo:        `Obra ${e.obra_id}`,
        diferenca_cents: 0,
      })),
      unmatched_local:    [],
      unmatched_external: [],
      total_matched:      entries.length,
      total_unmatched_local:    0,
      total_unmatched_external: 0,
    };
  }

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}

export const mockEcadProvider    = new MockRightsProvider("ecad");
export const mockUbcProvider     = new MockRightsProvider("ubc");
export const mockAbramusProvider = new MockRightsProvider("abramus");
