/**
 * releases/mappers/entity-to-form.mapper.ts
 * Entity (DB record / WS payload) → form field values.
 * Source of truth for Lancamento hydration.
 */

import { normalizeStr } from "@/shared/lib/normalize";
import type { Lancamento } from "@/modules/releases/hooks/useLancamentos";

export interface LancamentoFormFields {
  projetoSeed: string;
  titulo: string;
  artista_id: string;
  tipo: string;
  codigoUPC: string;
  genero: string;
  idioma: string;
  dataLancamento: string;
  status: string;
  gravadora: string;
  copyright: string;
  distribuidora: string;
  notasDistribuicao: string;
}

function ps(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export function lancamentoToFormFields(l: Lancamento | null | undefined): LancamentoFormFields {
  return {
    projetoSeed:       "",
    titulo:            ps(l?.titulo),
    artista_id:        ps(l?.artista_id),
    tipo:              ps(l?.tipo),
    codigoUPC:         ps((l as any)?.codigo_upc ?? (l as any)?.codigoUPC),
    genero:            ps((l as any)?.genero),
    idioma:            ps((l as any)?.idioma),
    dataLancamento:    ps(l?.data_lancamento),
    status:            ps(l?.status) || "analise",
    gravadora:         ps((l as any)?.gravadora),
    copyright:         ps((l as any)?.copyright),
    distribuidora:     ps(l?.distribuidora) || "onerpm",
    notasDistribuicao: ps(l?.observacoes),
  };
}

export function emptyLancamentoFormFields(): LancamentoFormFields {
  return {
    projetoSeed: "", titulo: "", artista_id: "", tipo: "",
    codigoUPC: "", genero: "", idioma: "", dataLancamento: "",
    status: "analise", gravadora: "", copyright: "",
    distribuidora: "onerpm", notasDistribuicao: "",
  };
}
