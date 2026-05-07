/**
 * releases/mappers/form-to-payload.mapper.ts
 * Form field values → DB/API payload.
 * Source of truth for Lancamento persistence.
 */

import { normalizeStr } from "@/shared/lib/normalize";
import type { LancamentoFormFields } from "./entity-to-form.mapper";
import type { LancamentoInsert } from "@/modules/releases/hooks/useLancamentos";

export function formToLancamentoPayload(f: LancamentoFormFields): LancamentoInsert {
  return {
    titulo:          f.titulo.trim(),
    artista_id:      normalizeStr(f.artista_id),
    tipo:            normalizeStr(f.tipo),
    status:          normalizeStr(f.status) ?? "analise",
    data_lancamento: normalizeStr(f.dataLancamento),
    distribuidora:   normalizeStr(f.distribuidora),
    observacoes:     normalizeStr(f.notasDistribuicao),
    plataformas:     null,
    fonograma_ids:   null,
  };
}
