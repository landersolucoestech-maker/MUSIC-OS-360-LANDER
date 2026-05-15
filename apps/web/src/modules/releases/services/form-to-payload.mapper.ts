/**
 * releases/mappers/form-to-payload.mapper.ts
 * Form field values → DB/API payload.
 * Source of truth for Lancamento persistence.
 */

import { normalizeStr } from "@/shared/lib/normalize";
import type { LancamentoFormFields } from "./entity-to-form.mapper";
import type { LancamentoInsert } from "@/modules/releases/hooks/useLancamentos";

function ns(v: string): string | null {
  const t = v.trim();
  return t || null;
}

export function formToLancamentoPayload(f: LancamentoFormFields): LancamentoInsert {
  const assets = {
    audio_master_url:  ns(f.assetAudioMasterUrl),
    capa_url:          ns(f.assetCapaUrl),
    video_clipe_url:   ns(f.assetVideoClipeUrl),
    letra:             ns(f.assetLetra),
    ficha_tecnica:     ns(f.assetFichaTecnica),
    press_release:     ns(f.assetPressRelease),
    epk_url:           ns(f.assetEpkUrl),
  };

  const cronograma = {
    data_gravacao:              ns(f.cronGravacao),
    data_mix_master:            ns(f.cronMixMaster),
    data_entrega_distribuidora: ns(f.cronEntregaDistribuidora),
  };

  const hasAssets = Object.values(assets).some(Boolean);
  const hasCron = Object.values(cronograma).some(Boolean);

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
    isrc_global:     ns(f.isrcGlobal),
    upc:             ns(f.upc),
    notas_internas:  ns(f.notasInternas),
    assets:          hasAssets ? assets : null,
    cronograma:      hasCron ? cronograma : null,
  } as LancamentoInsert;
}
