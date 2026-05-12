/**
 * integrations/providers/mock/mock-rights.provider.ts
 *
 * Implementação mock de IRightsProvider (v2).
 * Cobre ECAD, UBC e Abramus com dados gerados.
 * Implementa o contrato expandido: searchArtists, registerObra,
 * registerFonograma, generateISWC, generateISRC, getRegistrationHistory, etc.
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
  ArtistSearchQuery,
  ArtistSearchResult,
  RegisterObraInput,
  RegisterFonogramaInput,
  RegistrationResult,
  RegistrationHistoryEntry,
  GenerateISWCInput,
  GenerateISWCResult,
  GenerateISRCInput,
  GenerateISRCResult,
} from "@/integrations/dto";
import { generateMockISWC, generateMockISRC } from "@/shared/integrations/contracts/rights.contract";

function ri(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export class MockRightsProvider implements IRightsProvider {
  constructor(readonly entity: RightsEntityId) {}

  // ── Pesquisa ────────────────────────────────────────────────────────────────

  async search(query: RightsSearchQuery): Promise<RightsSearchResult[]> {
    const limit = query.limit ?? 10;
    const results: RightsSearchResult[] = [];
    for (let i = 0; i < Math.min(limit, 5); i++) {
      results.push({
        external_id:  `${this.entity}_ext_${i + 1}`,
        kind:         query.kind,
        titulo:       `${query.query} — Resultado ${i + 1}`,
        iswc:         query.kind === "obra"       ? generateMockISWC(`${this.entity}_${i}`) : null,
        isrc:         query.kind === "fonograma"  ? generateMockISRC("BR", "MSC", 2024, i + 1) : null,
        compositores: ["Compositor Mock"],
        interpretes:  ["Artista Mock"],
        gravadora:    "Gravadora Mock LTDA",
        genero:       "MPB",
        data_registro: "2024-01-01",
      });
    }
    return results;
  }

  async searchArtists(query: ArtistSearchQuery): Promise<ArtistSearchResult[]> {
    const limit = query.limit ?? 10;
    const tipos: ArtistSearchResult["tipo"][] = ["compositor", "interprete", "produtor", "editora", "gravadora"];
    const results: ArtistSearchResult[] = [];
    for (let i = 0; i < Math.min(limit, 5); i++) {
      results.push({
        external_id:    `${this.entity}_artist_${i + 1}`,
        nome:           `${query.query} — Artista ${i + 1}`,
        tipo:           tipos[i % tipos.length],
        numero_filiado: `${this.entity.toUpperCase()}-${ri(100000, 999999)}`,
        obras_count:    ri(1, 50),
        fonogramas_count: ri(1, 80),
        generos:        ["MPB", "Pop", "Sertanejo"].slice(0, ri(1, 3)),
        data_filiacao:  "2020-01-01",
      });
    }
    return results;
  }

  // ── Importação ──────────────────────────────────────────────────────────────

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
      iswc:           kind === "obra"       ? generateMockISWC(localId) : null,
      isrc:           kind === "fonograma"  ? generateMockISRC("BR", "MSC", 2024, ri(1, 99999)) : null,
    };
  }

  async getRegistrationHistory(
    kind: RightsKind,
    localId: string
  ): Promise<RegistrationHistoryEntry[]> {
    const actions: RegistrationHistoryEntry["action"][] = ["registered", "updated", "synced"];
    return actions.map((action, i) => ({
      id:           uid(),
      entity:       this.entity,
      kind,
      local_id:     localId,
      external_id:  `${this.entity}_ext_${localId}`,
      titulo:       `Obra/Fonograma ${localId}`,
      action,
      iswc:         kind === "obra"       ? generateMockISWC(localId) : null,
      isrc:         kind === "fonograma"  ? generateMockISRC("BR", "MSC", 2024, ri(1, 99999)) : null,
      performed_at: new Date(Date.now() - (actions.length - i) * 86400000).toISOString(),
      performed_by: "Sistema",
      notes:        action === "registered" ? "Registro inicial" : null,
    }));
  }

  // ── Registro de novas obras/fonogramas ──────────────────────────────────────

  async registerObra(input: RegisterObraInput): Promise<RegistrationResult> {
    const externalId = `${this.entity}_obra_${uid()}`;
    const code = `${this.entity.toUpperCase()}-O-${ri(100000, 999999)}`;
    const iswc = input.iswc ?? generateMockISWC(`${input.titulo}_${input.compositores[0] ?? ""}`);
    console.info(`[MockRightsProvider:${this.entity}] registerObra → ${input.titulo} → ${externalId} ISWC:${iswc}`);
    return {
      entity:       this.entity,
      kind:         "obra",
      local_id:     input.local_id,
      external_id:  externalId,
      code,
      iswc,
      isrc:         null,
      registered_at: new Date().toISOString(),
      status:       "registered",
    };
  }

  async updateObraRegistration(
    externalId: string,
    _input: Partial<RegisterObraInput>
  ): Promise<RegistrationResult> {
    console.info(`[MockRightsProvider:${this.entity}] updateObraRegistration → ${externalId}`);
    return {
      entity:       this.entity,
      kind:         "obra",
      local_id:     `local_${externalId}`,
      external_id:  externalId,
      code:         `${this.entity.toUpperCase()}-O-${ri(100000, 999999)}`,
      iswc:         generateMockISWC(externalId),
      isrc:         null,
      registered_at: new Date().toISOString(),
      status:       "registered",
    };
  }

  async registerFonograma(input: RegisterFonogramaInput): Promise<RegistrationResult> {
    const externalId = `${this.entity}_fono_${uid()}`;
    const code = `${this.entity.toUpperCase()}-F-${ri(100000, 999999)}`;
    const isrc = input.isrc ?? generateMockISRC("BR", "MSC", new Date().getFullYear(), ri(1, 99999));
    console.info(`[MockRightsProvider:${this.entity}] registerFonograma → ${input.titulo} → ${externalId} ISRC:${isrc}`);
    return {
      entity:       this.entity,
      kind:         "fonograma",
      local_id:     input.local_id,
      external_id:  externalId,
      code,
      iswc:         null,
      isrc,
      registered_at: new Date().toISOString(),
      status:       "registered",
    };
  }

  async updateFonogramaRegistration(
    externalId: string,
    _input: Partial<RegisterFonogramaInput>
  ): Promise<RegistrationResult> {
    console.info(`[MockRightsProvider:${this.entity}] updateFonogramaRegistration → ${externalId}`);
    return {
      entity:       this.entity,
      kind:         "fonograma",
      local_id:     `local_${externalId}`,
      external_id:  externalId,
      code:         `${this.entity.toUpperCase()}-F-${ri(100000, 999999)}`,
      iswc:         null,
      isrc:         generateMockISRC("BR", "MSC", new Date().getFullYear(), ri(1, 99999)),
      registered_at: new Date().toISOString(),
      status:       "registered",
    };
  }

  // ── Geração de códigos ──────────────────────────────────────────────────────

  async generateISWC(input: GenerateISWCInput): Promise<GenerateISWCResult> {
    if (input.existing_iswc) {
      return {
        iswc:         input.existing_iswc,
        local_obra_id: input.local_obra_id,
        source:       "existing",
        generated_at: new Date().toISOString(),
      };
    }
    const iswc = generateMockISWC(`${input.titulo}_${input.compositores.join("_")}`);
    console.info(`[MockRightsProvider:${this.entity}] generateISWC → ${iswc} para "${input.titulo}"`);
    return {
      iswc,
      local_obra_id: input.local_obra_id,
      source:       "generated",
      generated_at: new Date().toISOString(),
    };
  }

  async generateISRC(input: GenerateISRCInput): Promise<GenerateISRCResult> {
    if (input.existing_isrc) {
      return {
        isrc:              input.existing_isrc,
        local_fonograma_id: input.local_fonograma_id,
        source:            "existing",
        generated_at:      new Date().toISOString(),
      };
    }
    const isrc = generateMockISRC(
      input.country_code ?? "BR",
      input.registrant_code ?? "MSC",
      input.ano ?? new Date().getFullYear(),
      ri(1, 99999),
    );
    console.info(`[MockRightsProvider:${this.entity}] generateISRC → ${isrc} para "${input.titulo}"`);
    return {
      isrc,
      local_fonograma_id: input.local_fonograma_id,
      source:            "generated",
      generated_at:      new Date().toISOString(),
    };
  }

  // ── Sincronização ───────────────────────────────────────────────────────────

  async syncAll(): Promise<{ synced: number; errors: number }> {
    console.info(`[MockRightsProvider:${this.entity}] syncAll`);
    return { synced: ri(5, 50), errors: 0 };
  }

  // ── Arrecadação ─────────────────────────────────────────────────────────────

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

  // ── Saúde ───────────────────────────────────────────────────────────────────

  async verifyConnection(): Promise<boolean> {
    return true;
  }
}

export const mockEcadProvider    = new MockRightsProvider("ecad");
export const mockUbcProvider     = new MockRightsProvider("ubc");
export const mockAbramusProvider = new MockRightsProvider("abramus");
