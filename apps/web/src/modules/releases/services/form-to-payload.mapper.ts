/**
 * releases/services/form-to-payload.mapper.ts
 * Form field values → backend DTO payload (camelCase, matching CreateReleaseDto / UpdateReleaseDto).
 *
 * Backend expects:
 *   POST /releases  → CreateReleaseDto  { title, type, artistId, upc, distributor, releasedAt, platforms, coverUrl, metadata }
 *   PATCH /releases → UpdateReleaseDto  (all optional + status: ReleaseStatus)
 *
 * NestJS ValidationPipe runs with { whitelist: true, forbidNonWhitelisted: true } —
 * any snake_case or unknown field causes a 400. Only DTO fields must be sent.
 */

import type { LancamentoFormFields } from "./entity-to-form.mapper";

function ns(v: string): string | null {
  const t = v.trim();
  return t || null;
}

// Maps frontend form status values → backend ReleaseStatus enum values
const STATUS_MAP: Record<string, string> = {
  // Portuguese legacy values
  planejado:               "draft",
  em_producao:             "metadata_pending",
  analise:                 "review",
  aprovado:                "approved",
  aguardando_distribuicao: "scheduled",
  programado:              "scheduled",
  ativo:                   "released",
  cancelado:               "cancelled",
  // Pass-through: already valid ReleaseStatus enum values
  draft:             "draft",
  metadata_pending:  "metadata_pending",
  assets_pending:    "assets_pending",
  review:            "review",
  approved:          "approved",
  scheduled:         "scheduled",
  distributed:       "distributed",
  released:          "released",
  archived:          "archived",
  cancelled:         "cancelled",
};

function mapStatus(raw: string): string | undefined {
  const t = raw.trim().toLowerCase();
  return STATUS_MAP[t] ?? (t || undefined);
}

export function formToLancamentoPayload(f: LancamentoFormFields, mode: "create" | "edit" = "create"): Record<string, unknown> {
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

  // Extra fields not in the DTO go into metadata
  const metadata: Record<string, unknown> = {};
  if (ns(f.isrcGlobal))        metadata["isrc_global"]    = ns(f.isrcGlobal);
  if (ns(f.notasInternas))     metadata["notas_internas"] = ns(f.notasInternas);
  if (ns(f.notasDistribuicao)) metadata["observacoes"]    = ns(f.notasDistribuicao);
  if (ns(f.gravadora))         metadata["gravadora"]      = ns(f.gravadora);
  if (ns(f.copyright))         metadata["copyright"]      = ns(f.copyright);
  if (ns(f.genero))            metadata["genero"]         = ns(f.genero);
  if (ns(f.idioma))            metadata["idioma"]         = ns(f.idioma);
  if (hasAssets)               metadata["assets"]         = assets;
  if (hasCron)                 metadata["cronograma"]     = cronograma;

  const payload: Record<string, unknown> = {
    title:       f.titulo.trim(),
    type:        ns(f.tipo) ?? "single",
  };

  const artistId  = ns(f.artista_id);
  const upc       = ns(f.upc) || ns(f.codigoUPC);
  const distributor = ns(f.distribuidora);
  const releasedAt  = ns(f.dataLancamento);
  const coverUrl    = ns(f.assetCapaUrl);

  if (artistId)   payload["artistId"]    = artistId;
  if (upc)        payload["upc"]         = upc;
  if (distributor) payload["distributor"] = distributor;
  if (releasedAt) payload["releasedAt"]  = releasedAt;
  if (coverUrl)   payload["coverUrl"]    = coverUrl;

  // status is not in CreateReleaseDto — only send on edit (backend always sets DRAFT on create)
  if (mode === "edit") {
    const mappedStatus = mapStatus(f.status);
    if (mappedStatus) payload["status"] = mappedStatus;
  }

  if (Object.keys(metadata).length > 0) payload["metadata"] = metadata;

  return payload;
}
