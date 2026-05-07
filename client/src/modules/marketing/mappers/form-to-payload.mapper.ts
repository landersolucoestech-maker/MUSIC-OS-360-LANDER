/**
 * marketing/mappers/form-to-payload.mapper.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Form field values → DB/API payload.
 * Single source of truth for Campanha persistence.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { normalizeStr } from "@/shared/lib/normalize";
import type { CampanhaFormFields } from "./entity-to-form.mapper";

export function formToCampanhaPayload(f: CampanhaFormFields): Record<string, unknown> {
  const total     = f.orcamentoDiario * f.duracao;
  const dataInicio = new Date().toISOString().split("T")[0];
  const dataFim    = new Date(Date.now() + f.duracao * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  return {
    nome:          f.nome.trim(),
    artista_id:    normalizeStr(f.artista_id),
    lancamento_id: normalizeStr(f.lancamento_id),
    plataforma:    f.plataformas.join(", ") || null,
    status:        f.status,
    orcamento:     total,
    gasto:         0,
    objetivo:      normalizeStr(f.objetivo),
    observacoes:   normalizeStr(f.observacoes),
    data_inicio:   dataInicio,
    data_fim:      dataFim,
  };
}
