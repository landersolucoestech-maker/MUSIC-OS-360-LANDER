/**
 * skills/catalog-metadata-validator/templates/catalog-metadata-validator.template.ts
 *
 * Templates de referência de campos obrigatórios/recomendados por tipo de item
 * de catálogo (obra vs fonograma). Guia para enriquecer a validação — não
 * substitui a saída do modelo.
 */

import type { CatalogMetadataType } from "@music-os-360/ai-skills";

export interface CatalogMetadataTemplate {
  type: CatalogMetadataType;
  label: string;
  domain: string;
  identifier: string;
  requiredFields: string[];
  recommendedFields: string[];
  notApplicableFields: string[];
}

export const CATALOG_METADATA_TEMPLATES: CatalogMetadataTemplate[] = [
  {
    type: "work",
    label: "Obra musical (composição)",
    domain: "Editora / Publishing",
    identifier: "ISWC",
    requiredFields: ["title", "composers", "shares"],
    recommendedFields: ["publisher", "iswc"],
    // ISRC/UPC pertencem ao fonograma, não à obra.
    notApplicableFields: ["isrc", "upc", "performers", "label"],
  },
  {
    type: "recording",
    label: "Fonograma / Gravação",
    domain: "Gravadora / Label",
    identifier: "ISRC",
    requiredFields: ["title", "performers", "isrc"],
    recommendedFields: ["producers", "upc", "label", "publisher"],
    notApplicableFields: [],
  },
];

export function getCatalogMetadataTemplate(type: CatalogMetadataType): CatalogMetadataTemplate | undefined {
  return CATALOG_METADATA_TEMPLATES.find((t) => t.type === type);
}
