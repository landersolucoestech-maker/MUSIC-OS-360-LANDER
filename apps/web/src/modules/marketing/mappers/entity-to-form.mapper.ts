/**
 * marketing/mappers/entity-to-form.mapper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Entity (DB record) → form field values.
 * Single source of truth for Campanha hydration.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { normalizeStr } from "@/shared/lib/normalize";

export interface CampanhaFormFields {
  nome: string;
  artista_id: string;
  lancamento_id: string;
  plataformas: string[];
  orcamentoDiario: number;
  duracao: number;
  objetivo: string;
  status: string;
  observacoes: string;
}

export function campanhaToFormFields(c: Record<string, unknown> | null | undefined): CampanhaFormFields {
  if (!c) return emptyCampanhaFormFields();

  const plataformas: string[] = (() => {
    const p = c.plataforma;
    if (typeof p === "string" && p.trim()) return p.split(",").map((s) => s.trim()).filter(Boolean);
    if (Array.isArray(p)) return (p as string[]).filter(Boolean);
    return [];
  })();

  const dataInicio = normalizeStr(c.data_inicio as string) ?? "";
  const dataFim    = normalizeStr(c.data_fim    as string) ?? "";
  let duracao = 7;
  if (dataInicio && dataFim) {
    const diff = (new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24);
    if (Number.isFinite(diff) && diff > 0) duracao = Math.round(diff);
  }

  const total = typeof c.orcamento === "number" ? (c.orcamento as number) : 0;

  return {
    nome:          normalizeStr(c.nome         as string) ?? "",
    artista_id:    normalizeStr(c.artista_id   as string) ?? "",
    lancamento_id: normalizeStr((c.lancamento_id ?? (c as any).lancamentoId) as string) ?? "",
    plataformas,
    orcamentoDiario: duracao > 0 ? Math.round(total / duracao) : 10,
    duracao,
    objetivo:    normalizeStr(c.objetivo    as string) ?? "",
    status:      normalizeStr(c.status      as string) ?? "planejada",
    observacoes: normalizeStr(c.observacoes as string) ?? "",
  };
}

export function emptyCampanhaFormFields(): CampanhaFormFields {
  return {
    nome: "",
    artista_id: "",
    lancamento_id: "",
    plataformas: [],
    orcamentoDiario: 10,
    duracao: 7,
    objetivo: "",
    status: "planejada",
    observacoes: "",
  };
}
