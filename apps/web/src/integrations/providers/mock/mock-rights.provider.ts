/**
 * integrations/providers/mock/mock-rights.provider.ts
 *
 * MockRightsProvider — implementação de IRightsProvider para modo standalone.
 *
 * Cobre ECAD, UBC e ABRAMUS com dados mock realistas.
 * Persiste registros e arrecadação em localStorage (prefix: musicos360_).
 */

import type {
  IRightsProvider,
  RightsEntityId,
  RightsKind,
  RightsSearchQuery,
  RightsSearchResult,
  ArtistSearchQuery,
  ArtistSearchResult,
  RightsRegistrationStatus,
  RegistrationHistoryEntry,
  RegisterObraInput,
  RegisterFonogramaInput,
  RegistrationResult,
  GenerateISWCInput,
  GenerateISWCResult,
  GenerateISRCInput,
  GenerateISRCResult,
  ArrecadacaoEntry,
  ArrecadacaoSummary,
  ArrecadacaoTipo,
  ConciliacaoResult,
} from "@/shared/integrations/contracts/rights.contract";

import {
  generateMockISWC,
  generateMockISRC,
  arrecadacaoStorageKey,
} from "@/shared/integrations/contracts/rights.contract";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function delay(ms = 600): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

function nowISO(): string {
  return new Date().toISOString();
}

function uuid(): string {
  return crypto.randomUUID();
}

function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString();
}

// ─── Dados mock de obras e fonogramas ─────────────────────────────────────────

const MOCK_OBRAS: RightsSearchResult[] = [
  { external_id: "OBR-001", kind: "obra", titulo: "Noite Estrelada", iswc: "T-034.521.489-2", compositores: ["Carlos Drummond", "Maria Souza"], genero: "MPB", duracao: "3:42", data_registro: monthsAgo(8) },
  { external_id: "OBR-002", kind: "obra", titulo: "Sertão Profundo", iswc: "T-091.234.567-1", compositores: ["João Barreto"], letristas: ["Fernanda Lima"], genero: "Sertanejo", duracao: "4:10", data_registro: monthsAgo(6) },
  { external_id: "OBR-003", kind: "obra", titulo: "Ressaca do Amor", iswc: "T-055.678.123-4", compositores: ["Ana Paula Rodrigues", "Roberto Melo"], genero: "Forró", duracao: "3:28", data_registro: monthsAgo(12) },
  { external_id: "OBR-004", kind: "obra", titulo: "Canto Livre", iswc: null, compositores: ["Marcelo Siqueira"], genero: "Rock Brasileiro", duracao: "4:55", data_registro: monthsAgo(2) },
  { external_id: "OBR-005", kind: "obra", titulo: "Baião de Dois Tempos", iswc: "T-012.345.678-9", compositores: ["Luiz Gonzaga Jr.", "Patrícia Ferreira"], genero: "Baião", duracao: "3:15", data_registro: monthsAgo(18) },
];

const MOCK_FONOGRAMAS: RightsSearchResult[] = [
  { external_id: "FON-001", kind: "fonograma", titulo: "Noite Estrelada (Ao Vivo)", isrc: "BR-MSC-24-00001", interpretes: ["Banda Lusofonia"], compositores: ["Carlos Drummond", "Maria Souza"], gravadora: "MUSIC OS Records", genero: "MPB", duracao: "5:12", artista_nome: "Banda Lusofonia", data_registro: monthsAgo(6) },
  { external_id: "FON-002", kind: "fonograma", titulo: "Sertão Profundo", isrc: "BR-MSC-24-00002", interpretes: ["João Barreto"], gravadora: "MUSIC OS Records", genero: "Sertanejo", duracao: "4:10", artista_nome: "João Barreto", data_registro: monthsAgo(5) },
  { external_id: "FON-003", kind: "fonograma", titulo: "Ressaca do Amor (Remix)", isrc: "BR-MSC-23-00089", interpretes: ["Ana Paula Rodrigues"], produtores: ["DJ Marcos"], gravadora: "MUSIC OS Records", genero: "Forró Eletrônico", duracao: "3:55", artista_nome: "Ana Paula Rodrigues", data_registro: monthsAgo(14) },
  { external_id: "FON-004", kind: "fonograma", titulo: "Canto Livre", isrc: null, interpretes: ["Marcelo Siqueira"], gravadora: "MUSIC OS Records", genero: "Rock Brasileiro", duracao: "4:55", artista_nome: "Marcelo Siqueira", data_registro: monthsAgo(1) },
  { external_id: "FON-005", kind: "fonograma", titulo: "Baião de Dois Tempos", isrc: "BR-MSC-22-00312", interpretes: ["Banda Lusofonia"], compositores: ["Luiz Gonzaga Jr."], gravadora: "MUSIC OS Records", genero: "Baião", duracao: "3:15", artista_nome: "Banda Lusofonia", data_registro: monthsAgo(20) },
];

const MOCK_ARTISTS: ArtistSearchResult[] = [
  { external_id: "ART-001", nome: "Carlos Drummond", tipo: "compositor", numero_filiado: "ABR-0012341", obras_count: 34, fonogramas_count: 0, generos: ["MPB", "Samba"], data_filiacao: monthsAgo(48) },
  { external_id: "ART-002", nome: "Maria Souza", tipo: "compositor", numero_filiado: "ABR-0054321", obras_count: 18, fonogramas_count: 0, generos: ["MPB", "Jazz"], data_filiacao: monthsAgo(36) },
  { external_id: "ART-003", nome: "João Barreto", tipo: "interprete", numero_filiado: "ABR-0098765", obras_count: 12, fonogramas_count: 8, generos: ["Sertanejo"], data_filiacao: monthsAgo(24) },
  { external_id: "ART-004", nome: "Banda Lusofonia", tipo: "interprete", fonogramas_count: 45, generos: ["MPB", "Baião", "Forró"], data_filiacao: monthsAgo(60) },
  { external_id: "ART-005", nome: "MUSIC OS Records", tipo: "gravadora", obras_count: 0, fonogramas_count: 210, data_filiacao: monthsAgo(84) },
  { external_id: "ART-006", nome: "Ana Paula Rodrigues", tipo: "compositor", numero_filiado: "UBC-0023456", obras_count: 22, fonogramas_count: 15, generos: ["Forró", "Axé"], data_filiacao: monthsAgo(30) },
];

// ─── Dados mock de arrecadação ────────────────────────────────────────────────

function buildMockArrecadacao(entity: RightsEntityId, periodo: string): ArrecadacaoEntry[] {
  const seed = entity + periodo;
  const base  = seed.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const tipos: ArrecadacaoTipo[] = ["execucao_publica", "streaming", "sincronizacao", "mecanica"];

  return tipos.map((tipo, i): ArrecadacaoEntry => {
    const bruto  = Math.abs(((base * (i + 1) * 1337) % 150_000) + 20_000);
    const liquido = Math.floor(bruto * 0.82);
    return {
      id:                  `${entity.toUpperCase()}-${periodo.replace("-", "")}-${i + 1}`,
      entity,
      tipo,
      obra_id:             i < 2 ? `OBR-00${i + 1}` : null,
      fonograma_id:        i >= 2 ? `FON-00${i - 1}` : null,
      periodo,
      valor_bruto_cents:   bruto,
      valor_liquido_cents: liquido,
      execucoes:           Math.floor(bruto / 15),
      fonte:               ["Globo", "Spotify Brasil", "TV Cultura", "Amazon Music"][i] ?? "Outros",
      referencia:          `REF-${entity.toUpperCase()}-${periodo}-${i + 1}`,
      created_at:          nowISO(),
    };
  });
}

// ─── Chaves de localStorage ───────────────────────────────────────────────────

function registrationKey(entity: RightsEntityId, kind: RightsKind, localId: string): string {
  return `musicos360_${entity}_reg_${kind}_${localId}`;
}

function historyKey(entity: RightsEntityId, kind: RightsKind, localId: string): string {
  return `musicos360_${entity}_hist_${kind}_${localId}`;
}

function saveReg(entity: RightsEntityId, kind: RightsKind, localId: string, data: RightsRegistrationStatus): void {
  localStorage.setItem(registrationKey(entity, kind, localId), JSON.stringify(data));
}

function loadReg(entity: RightsEntityId, kind: RightsKind, localId: string): RightsRegistrationStatus | null {
  try {
    const raw = localStorage.getItem(registrationKey(entity, kind, localId));
    return raw ? (JSON.parse(raw) as RightsRegistrationStatus) : null;
  } catch { return null; }
}

function appendHistory(entity: RightsEntityId, kind: RightsKind, localId: string, entry: RegistrationHistoryEntry): void {
  const key = historyKey(entity, kind, localId);
  try {
    const existing = JSON.parse(localStorage.getItem(key) ?? "[]") as RegistrationHistoryEntry[];
    existing.unshift(entry);
    localStorage.setItem(key, JSON.stringify(existing.slice(0, 50)));
  } catch { /* ignore */ }
}

function loadHistory(entity: RightsEntityId, kind: RightsKind, localId: string): RegistrationHistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(historyKey(entity, kind, localId)) ?? "[]") as RegistrationHistoryEntry[];
  } catch { return []; }
}

// ─── Classe MockRightsProvider ────────────────────────────────────────────────

export class MockRightsProvider implements IRightsProvider {
  readonly entity: RightsEntityId;

  constructor(entity: RightsEntityId) {
    this.entity = entity;
  }

  // ── Pesquisa ────────────────────────────────────────────────────────────────

  async search(query: RightsSearchQuery): Promise<RightsSearchResult[]> {
    await delay(500);
    const pool   = query.kind === "obra" ? MOCK_OBRAS : MOCK_FONOGRAMAS;
    const q      = query.query.toLowerCase();
    const result = pool.filter(r =>
      r.titulo.toLowerCase().includes(q) ||
      (r.compositores ?? []).some(c => c.toLowerCase().includes(q)) ||
      (r.interpretes  ?? []).some(i => i.toLowerCase().includes(q)) ||
      r.isrc?.toLowerCase().includes(q) ||
      r.iswc?.toLowerCase().includes(q)
    );
    const offset = query.offset ?? 0;
    const limit  = query.limit  ?? 20;
    return result.slice(offset, offset + limit);
  }

  async searchArtists(query: ArtistSearchQuery): Promise<ArtistSearchResult[]> {
    await delay(400);
    const q      = query.query.toLowerCase();
    const result = MOCK_ARTISTS.filter(a => a.nome.toLowerCase().includes(q) || a.numero_filiado?.toLowerCase().includes(q));
    return result.slice(0, query.limit ?? 20);
  }

  // ── Importação / Status ──────────────────────────────────────────────────────

  async import(kind: RightsKind, externalId: string): Promise<{ local_id: string }> {
    await delay(800);
    const local_id = `local_${externalId.toLowerCase()}`;
    const status: RightsRegistrationStatus = {
      entity:         this.entity,
      kind,
      local_id,
      external_id:    externalId,
      registered:     true,
      registered_at:  nowISO(),
      last_synced_at: nowISO(),
      code:           `${this.entity.toUpperCase()}-IMP-${externalId}`,
    };
    saveReg(this.entity, kind, local_id, status);
    appendHistory(this.entity, kind, local_id, {
      id:           uuid(),
      entity:       this.entity,
      kind,
      local_id,
      external_id:  externalId,
      titulo:       externalId,
      action:       "registered",
      performed_at: nowISO(),
      notes:        "Importado via integração mock",
    });
    return { local_id };
  }

  async getRegistrationStatus(kind: RightsKind, localId: string): Promise<RightsRegistrationStatus> {
    await delay(300);
    const cached = loadReg(this.entity, kind, localId);
    if (cached) return cached;
    return {
      entity:      this.entity,
      kind,
      local_id:    localId,
      registered:  false,
    };
  }

  async getRegistrationHistory(kind: RightsKind, localId: string): Promise<RegistrationHistoryEntry[]> {
    await delay(300);
    return loadHistory(this.entity, kind, localId);
  }

  // ── Registro ────────────────────────────────────────────────────────────────

  async registerObra(input: RegisterObraInput): Promise<RegistrationResult> {
    await delay(1200);
    const external_id  = `${this.entity.toUpperCase()}-OBR-${uuid().slice(0, 8).toUpperCase()}`;
    const iswc         = input.iswc ?? generateMockISWC(`${this.entity}:${input.titulo}:${input.local_id}`);
    const code         = `${this.entity.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, "0")}`;
    const result: RegistrationResult = {
      entity:       this.entity,
      kind:         "obra",
      local_id:     input.local_id,
      external_id,
      code,
      iswc,
      registered_at: nowISO(),
      status:        "registered",
    };
    saveReg(this.entity, "obra", input.local_id, {
      entity:         this.entity,
      kind:           "obra",
      local_id:       input.local_id,
      external_id,
      code,
      iswc,
      registered:     true,
      registered_at:  nowISO(),
      last_synced_at: nowISO(),
    });
    appendHistory(this.entity, "obra", input.local_id, {
      id:           uuid(),
      entity:       this.entity,
      kind:         "obra",
      local_id:     input.local_id,
      external_id,
      titulo:       input.titulo,
      action:       "registered",
      iswc,
      performed_at: nowISO(),
    });
    return result;
  }

  async updateObraRegistration(externalId: string, input: Partial<RegisterObraInput>): Promise<RegistrationResult> {
    await delay(800);
    const local_id = input.local_id ?? `local_${externalId.toLowerCase()}`;
    const existing = loadReg(this.entity, "obra", local_id);
    const result: RegistrationResult = {
      entity:        this.entity,
      kind:          "obra",
      local_id,
      external_id:   externalId,
      code:          existing?.code ?? `${this.entity.toUpperCase()}-UPD-${externalId}`,
      iswc:          existing?.iswc,
      registered_at: existing?.registered_at ?? nowISO(),
      status:        "registered",
    };
    if (existing) {
      saveReg(this.entity, "obra", local_id, { ...existing, last_synced_at: nowISO() });
    }
    appendHistory(this.entity, "obra", local_id, {
      id:           uuid(),
      entity:       this.entity,
      kind:         "obra",
      local_id,
      external_id:  externalId,
      titulo:       input.titulo ?? externalId,
      action:       "updated",
      iswc:         existing?.iswc,
      performed_at: nowISO(),
    });
    return result;
  }

  async registerFonograma(input: RegisterFonogramaInput): Promise<RegistrationResult> {
    await delay(1200);
    const external_id  = `${this.entity.toUpperCase()}-FON-${uuid().slice(0, 8).toUpperCase()}`;
    const isrc         = input.isrc ?? generateMockISRC("BR", "MSC", new Date().getFullYear(), Math.floor(Math.random() * 99999));
    const code         = `${this.entity.toUpperCase()}-${new Date().getFullYear()}-${Math.floor(Math.random() * 999999).toString().padStart(6, "0")}`;
    const result: RegistrationResult = {
      entity:        this.entity,
      kind:          "fonograma",
      local_id:      input.local_id,
      external_id,
      code,
      isrc,
      registered_at: nowISO(),
      status:        "registered",
    };
    saveReg(this.entity, "fonograma", input.local_id, {
      entity:         this.entity,
      kind:           "fonograma",
      local_id:       input.local_id,
      external_id,
      code,
      isrc,
      registered:     true,
      registered_at:  nowISO(),
      last_synced_at: nowISO(),
    });
    appendHistory(this.entity, "fonograma", input.local_id, {
      id:           uuid(),
      entity:       this.entity,
      kind:         "fonograma",
      local_id:     input.local_id,
      external_id,
      titulo:       input.titulo,
      action:       "registered",
      isrc,
      performed_at: nowISO(),
    });
    return result;
  }

  async updateFonogramaRegistration(externalId: string, input: Partial<RegisterFonogramaInput>): Promise<RegistrationResult> {
    await delay(800);
    const local_id = input.local_id ?? `local_${externalId.toLowerCase()}`;
    const existing = loadReg(this.entity, "fonograma", local_id);
    const result: RegistrationResult = {
      entity:        this.entity,
      kind:          "fonograma",
      local_id,
      external_id:   externalId,
      code:          existing?.code ?? `${this.entity.toUpperCase()}-UPD-${externalId}`,
      isrc:          existing?.isrc,
      registered_at: existing?.registered_at ?? nowISO(),
      status:        "registered",
    };
    if (existing) {
      saveReg(this.entity, "fonograma", local_id, { ...existing, last_synced_at: nowISO() });
    }
    appendHistory(this.entity, "fonograma", local_id, {
      id:           uuid(),
      entity:       this.entity,
      kind:         "fonograma",
      local_id,
      external_id:  externalId,
      titulo:       input.titulo ?? externalId,
      action:       "updated",
      isrc:         existing?.isrc,
      performed_at: nowISO(),
    });
    return result;
  }

  // ── Geração de códigos ──────────────────────────────────────────────────────

  async generateISWC(input: GenerateISWCInput): Promise<GenerateISWCResult> {
    await delay(400);
    if (input.existing_iswc) {
      return { iswc: input.existing_iswc, local_obra_id: input.local_obra_id, source: "existing", generated_at: nowISO() };
    }
    const iswc = generateMockISWC(`${this.entity}:${input.titulo}:${input.local_obra_id}`);
    return { iswc, local_obra_id: input.local_obra_id, source: "generated", generated_at: nowISO() };
  }

  async generateISRC(input: GenerateISRCInput): Promise<GenerateISRCResult> {
    await delay(400);
    if (input.existing_isrc) {
      return { isrc: input.existing_isrc, local_fonograma_id: input.local_fonograma_id, source: "existing", generated_at: nowISO() };
    }
    const isrc = generateMockISRC(
      input.country_code ?? "BR",
      input.registrant_code ?? "MSC",
      input.ano ?? new Date().getFullYear(),
      Math.floor(Math.random() * 99999),
    );
    return { isrc, local_fonograma_id: input.local_fonograma_id, source: "generated", generated_at: nowISO() };
  }

  // ── Sincronização ────────────────────────────────────────────────────────────

  async syncAll(): Promise<{ synced: number; errors: number }> {
    await delay(2000);
    return { synced: 12, errors: 0 };
  }

  // ── Arrecadação ─────────────────────────────────────────────────────────────

  async getArrecadacao(periodo: string): Promise<ArrecadacaoEntry[]> {
    await delay(600);
    const key = arrecadacaoStorageKey(this.entity, periodo);
    try {
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached) as ArrecadacaoEntry[];
    } catch { /* fall through */ }
    const entries = buildMockArrecadacao(this.entity, periodo);
    localStorage.setItem(key, JSON.stringify(entries));
    return entries;
  }

  async getArrecadacaoSummary(periodo: string): Promise<ArrecadacaoSummary> {
    const entries = await this.getArrecadacao(periodo);
    const porTipo = entries.reduce<Record<ArrecadacaoTipo, number>>((acc, e) => {
      acc[e.tipo] = (acc[e.tipo] ?? 0) + e.valor_liquido_cents;
      return acc;
    }, {} as Record<ArrecadacaoTipo, number>);
    return {
      entity:               this.entity,
      periodo,
      total_bruto_cents:    entries.reduce((s, e) => s + e.valor_bruto_cents,  0),
      total_liquido_cents:  entries.reduce((s, e) => s + e.valor_liquido_cents, 0),
      total_execucoes:      entries.reduce((s, e) => s + (e.execucoes ?? 0),    0),
      por_tipo:             porTipo,
    };
  }

  async conciliar(periodo: string): Promise<ConciliacaoResult> {
    await delay(1500);
    const entries = await this.getArrecadacao(periodo);
    const matched = entries.map(e => ({
      local_id:         e.obra_id ?? e.fonograma_id ?? `local-${e.id}`,
      external_id:      e.id,
      titulo:           `Obra/Fonograma ${e.id}`,
      diferenca_cents:  Math.floor((e.valor_bruto_cents - e.valor_liquido_cents) * 0.05),
    }));
    return {
      matched,
      unmatched_local:    [],
      unmatched_external: [],
      total_matched:      matched.length,
      total_unmatched_local:    0,
      total_unmatched_external: 0,
    };
  }

  // ── Saúde ────────────────────────────────────────────────────────────────────

  async verifyConnection(): Promise<boolean> {
    await delay(300);
    return true;
  }
}

// ─── Instâncias exportadas ────────────────────────────────────────────────────

export const mockEcadProvider    = new MockRightsProvider("ecad");
export const mockUbcProvider     = new MockRightsProvider("ubc");
export const mockAbramusProvider = new MockRightsProvider("abramus");

export const mockRightsProviders: Record<RightsEntityId, IRightsProvider> = {
  ecad:    mockEcadProvider,
  ubc:     mockUbcProvider,
  abramus: mockAbramusProvider,
};

export function getMockRightsProvider(entity: RightsEntityId): IRightsProvider {
  return mockRightsProviders[entity];
}
