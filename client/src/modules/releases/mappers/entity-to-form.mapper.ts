/**
 * releases/mappers/entity-to-form.mapper.ts
 * Entity (DB record / WS payload) → form field values.
 * Source of truth for Lancamento hydration.
 */

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
  // ── Novos campos ──────────────────────────
  isrcGlobal: string;
  upc: string;
  notasInternas: string;
  // Assets
  assetAudioMasterUrl: string;
  assetCapaUrl: string;
  assetVideoClipeUrl: string;
  assetLetra: string;
  assetFichaTecnica: string;
  assetPressRelease: string;
  assetEpkUrl: string;
  // Cronograma
  cronGravacao: string;
  cronMixMaster: string;
  cronEntregaDistribuidora: string;
}

function ps(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

export function lancamentoToFormFields(l: Lancamento | null | undefined): LancamentoFormFields {
  const assets = (l as any)?.assets ?? {};
  const cron = (l as any)?.cronograma ?? {};
  return {
    projetoSeed:               "",
    titulo:                    ps(l?.titulo),
    artista_id:                ps(l?.artista_id),
    tipo:                      ps(l?.tipo),
    codigoUPC:                 ps((l as any)?.codigo_upc ?? (l as any)?.codigoUPC ?? l?.upc),
    genero:                    ps((l as any)?.genero),
    idioma:                    ps((l as any)?.idioma),
    dataLancamento:            ps(l?.data_lancamento),
    status:                    ps(l?.status) || "analise",
    gravadora:                 ps((l as any)?.gravadora),
    copyright:                 ps((l as any)?.copyright),
    distribuidora:             ps(l?.distribuidora) || "onerpm",
    notasDistribuicao:         ps(l?.observacoes),
    isrcGlobal:                ps(l?.isrc_global),
    upc:                       ps(l?.upc),
    notasInternas:             ps(l?.notas_internas),
    assetAudioMasterUrl:       ps(assets.audio_master_url),
    assetCapaUrl:              ps(assets.capa_url),
    assetVideoClipeUrl:        ps(assets.video_clipe_url),
    assetLetra:                ps(assets.letra),
    assetFichaTecnica:         ps(assets.ficha_tecnica),
    assetPressRelease:         ps(assets.press_release),
    assetEpkUrl:               ps(assets.epk_url),
    cronGravacao:              ps(cron.data_gravacao),
    cronMixMaster:             ps(cron.data_mix_master),
    cronEntregaDistribuidora:  ps(cron.data_entrega_distribuidora),
  };
}

export function emptyLancamentoFormFields(): LancamentoFormFields {
  return {
    projetoSeed: "", titulo: "", artista_id: "", tipo: "",
    codigoUPC: "", genero: "", idioma: "", dataLancamento: "",
    status: "analise", gravadora: "", copyright: "",
    distribuidora: "onerpm", notasDistribuicao: "",
    isrcGlobal: "", upc: "", notasInternas: "",
    assetAudioMasterUrl: "", assetCapaUrl: "", assetVideoClipeUrl: "",
    assetLetra: "", assetFichaTecnica: "", assetPressRelease: "", assetEpkUrl: "",
    cronGravacao: "", cronMixMaster: "", cronEntregaDistribuidora: "",
  };
}
