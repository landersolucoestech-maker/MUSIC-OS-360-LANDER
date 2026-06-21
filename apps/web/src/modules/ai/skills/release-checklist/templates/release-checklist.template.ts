/**
 * skills/release-checklist/templates/release-checklist.template.ts
 *
 * Templates de referência de itens obrigatórios por tipo de lançamento.
 * Servem de guia para enriquecer a auditoria — não substituem a saída do modelo.
 */

import type { ReleaseType } from "@music-os-360/ai-skills";

export interface ReleaseChecklistTemplate {
  releaseType: ReleaseType;
  label: string;
  requiredItems: string[];
  recommendedItems: string[];
}

export const RELEASE_CHECKLIST_TEMPLATES: ReleaseChecklistTemplate[] = [
  {
    releaseType: "single",
    label: "Single",
    requiredItems: ["Master final", "ISRC", "UPC", "Capa", "Metadata", "Splits", "Contratos", "Distribuição"],
    recommendedItems: ["Pre-save", "Pitch para playlists", "Plano de marketing", "Visualizer"],
  },
  {
    releaseType: "ep",
    label: "EP",
    requiredItems: ["Masters de todas as faixas", "ISRC por faixa", "UPC do EP", "Capa", "Metadata completa", "Splits por faixa", "Contratos", "Distribuição"],
    recommendedItems: ["Single de teaser", "Plano de marketing", "Assets visuais", "Press release"],
  },
  {
    releaseType: "album",
    label: "Álbum",
    requiredItems: ["Masters de todas as faixas", "ISRC por faixa", "UPC do álbum", "Capa", "Metadata completa", "Splits por faixa", "Contratos", "Sequenciamento", "Distribuição"],
    recommendedItems: ["Singles de antecipação", "Listening party", "Press release", "Tour announcement", "Plano de marketing"],
  },
  {
    releaseType: "mixtape",
    label: "Mixtape",
    requiredItems: ["Masters", "ISRC por faixa", "UPC", "Capa", "Metadata", "Clearances de samples", "Distribuição"],
    recommendedItems: ["Splits documentados", "Plano de marketing", "Assets visuais"],
  },
  {
    releaseType: "video",
    label: "Vídeo / Clipe",
    requiredItems: ["Master de vídeo", "Liberação de imagem", "Créditos de produção", "Metadata de vídeo", "Direitos da obra e fonograma", "Distribuição (YouTube/DSPs)"],
    recommendedItems: ["Thumbnail", "Legendas", "Plano de marketing", "Estratégia de estreia"],
  },
  {
    releaseType: "other",
    label: "Outro",
    requiredItems: ["Master final", "Capa", "Metadata", "Direitos documentados", "Distribuição"],
    recommendedItems: ["Plano de marketing", "Assets visuais"],
  },
];

export function getReleaseChecklistTemplate(releaseType: ReleaseType): ReleaseChecklistTemplate | undefined {
  return RELEASE_CHECKLIST_TEMPLATES.find((t) => t.releaseType === releaseType);
}
