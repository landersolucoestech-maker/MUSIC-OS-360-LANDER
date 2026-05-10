/**
 * modules/ai/memory/TenantMemory.ts
 *
 * Memória persistente por tenant — contexto que o sistema de IA mantém
 * entre sessões para personalizar respostas (artistas, géneros, histórico).
 *
 * MOCK_MODE: localStorage (chave: musicos360_ai_memory_{tenantId})
 * PRODUÇÃO:  substituir por Redis HSET com TTL por tenant
 *
 * Isolamento garantido: cada tenantId tem namespace próprio.
 */

import type { AISkillName } from "../domain/ai.types";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TenantMemoryEntry {
  key:       string;
  value:     unknown;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface TenantAIContext {
  tenantId:         string;
  artistNames:      string[];
  primaryGenres:    string[];
  preferredTone:    string;
  preferredLanguage: string;
  brandVoice:       string;
  recentSkillsUsed: AISkillName[];
  customSystemNotes: string;
  lastActivity:     string;
}

// ─── TenantMemory ─────────────────────────────────────────────────────────────

export class TenantMemory {
  private readonly storagePrefix = "musicos360_ai_memory_";

  // ── Leitura de contexto global do tenant ──────────────────────────────────

  getContext(tenantId: string): TenantAIContext {
    const stored = this.get<TenantAIContext>(tenantId, "__context__");
    return stored ?? this.defaultContext(tenantId);
  }

  setContext(tenantId: string, context: Partial<TenantAIContext>): TenantAIContext {
    const current  = this.getContext(tenantId);
    const updated: TenantAIContext = {
      ...current,
      ...context,
      tenantId,
      lastActivity: new Date().toISOString(),
    };
    this.set(tenantId, "__context__", updated);
    return updated;
  }

  // ── Registar uso de skill ─────────────────────────────────────────────────

  trackSkillUsage(tenantId: string, skill: AISkillName): void {
    const ctx = this.getContext(tenantId);
    const recent = [skill, ...ctx.recentSkillsUsed.filter((s) => s !== skill)].slice(0, 10);
    this.setContext(tenantId, { recentSkillsUsed: recent });
  }

  // ── Artistas conhecidos ───────────────────────────────────────────────────

  addArtist(tenantId: string, artistName: string): void {
    const ctx = this.getContext(tenantId);
    if (!ctx.artistNames.includes(artistName)) {
      this.setContext(tenantId, { artistNames: [...ctx.artistNames, artistName].slice(0, 50) });
    }
  }

  // ── Key-value genérico (por tenant) ──────────────────────────────────────

  get<T>(tenantId: string, key: string): T | undefined {
    try {
      const storageKey = this.storageKey(tenantId);
      const raw = localStorage.getItem(storageKey);
      if (!raw) return undefined;
      const namespace = JSON.parse(raw) as Record<string, TenantMemoryEntry>;
      const entry = namespace[key];
      if (!entry) return undefined;

      // Verificar expiração
      if (entry.expiresAt && new Date(entry.expiresAt) < new Date()) {
        this.delete(tenantId, key);
        return undefined;
      }

      return entry.value as T;
    } catch {
      return undefined;
    }
  }

  set<T>(tenantId: string, key: string, value: T, ttlMs?: number): void {
    try {
      const storageKey = this.storageKey(tenantId);
      const raw = localStorage.getItem(storageKey);
      const namespace: Record<string, TenantMemoryEntry> = raw ? JSON.parse(raw) : {};
      const now = new Date().toISOString();

      namespace[key] = {
        key,
        value,
        createdAt: namespace[key]?.createdAt ?? now,
        updatedAt: now,
        expiresAt: ttlMs ? new Date(Date.now() + ttlMs).toISOString() : undefined,
      };

      localStorage.setItem(storageKey, JSON.stringify(namespace));
    } catch {
      // localStorage cheio — silencioso
    }
  }

  delete(tenantId: string, key: string): void {
    try {
      const storageKey = this.storageKey(tenantId);
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const namespace = JSON.parse(raw) as Record<string, TenantMemoryEntry>;
      delete namespace[key];
      localStorage.setItem(storageKey, JSON.stringify(namespace));
    } catch {
      // silencioso
    }
  }

  clearTenant(tenantId: string): void {
    try {
      localStorage.removeItem(this.storageKey(tenantId));
    } catch {
      // silencioso
    }
  }

  // ── Listagem de chaves ────────────────────────────────────────────────────

  listKeys(tenantId: string): string[] {
    try {
      const raw = localStorage.getItem(this.storageKey(tenantId));
      if (!raw) return [];
      const namespace = JSON.parse(raw) as Record<string, TenantMemoryEntry>;
      return Object.keys(namespace);
    } catch {
      return [];
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private storageKey(tenantId: string): string {
    return `${this.storagePrefix}${tenantId}`;
  }

  private defaultContext(tenantId: string): TenantAIContext {
    return {
      tenantId,
      artistNames:       [],
      primaryGenres:     [],
      preferredTone:     "profissional",
      preferredLanguage: "pt-BR",
      brandVoice:        "",
      recentSkillsUsed:  [],
      customSystemNotes: "",
      lastActivity:      new Date().toISOString(),
    };
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

let _memoryInstance: TenantMemory | null = null;

export function getTenantMemory(): TenantMemory {
  if (!_memoryInstance) {
    _memoryInstance = new TenantMemory();
  }
  return _memoryInstance;
}
