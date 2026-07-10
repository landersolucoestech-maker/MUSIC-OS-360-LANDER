/**
 * Catalog lookup service for Rights Monitoring.
 * Reads obras from MOCK_DATA (which itself reads localStorage and falls back to seed data).
 * Builds an ISRC → obra index so executions can be enriched with real catalog data.
 */


export interface CatalogObra {
  id: string;
  titulo: string;
  compositor: string;
  compositores: string;
  co_compositores: string | null;
  detentores: string;
  editora: string;
  isrc: string;
  iswc: string | null;
  cod_abramus: string | null;
  cod_ecad: string | null;
  genero: string;
  status: string;
  duracao: string;
}

export interface CatalogArtista {
  id: string;
  nome_artistico: string;
}

export function getCatalogObras(): CatalogObra[] {
  return [];
}

export function getCatalogArtistas(): CatalogArtista[] {
  const raw: Array<{ id: string; nome_artistico?: string }> = [];
  return raw
    .filter(a => a.nome_artistico)
    .map(a => ({ id: a.id, nome_artistico: a.nome_artistico! }))
    .sort((a, b) => a.nome_artistico.localeCompare(b.nome_artistico, "pt-BR"));
}

export function buildIsrcIndex(obras: CatalogObra[]): Map<string, CatalogObra> {
  const index = new Map<string, CatalogObra>();
  for (const obra of obras) {
    if (obra.isrc) index.set(obra.isrc, obra);
  }
  return index;
}

export function getIsrcIndex(): Map<string, CatalogObra> {
  return buildIsrcIndex(getCatalogObras());
}

/**
 * Computes match rate (0–100) based on how many unique ISRCs have
 * a catalog obra with a non-empty cod_ecad.
 */
export function computeEcadMatchRate(
  isrcs: string[],
  isrcIndex: Map<string, CatalogObra>,
): number {
  if (isrcs.length === 0) return 0;
  const matched = isrcs.filter((isrc) => {
    const obra = isrcIndex.get(isrc);
    return obra && obra.cod_ecad;
  }).length;
  return Math.round((matched / isrcs.length) * 100);
}

/**
 * Returns a list of ISRCs that have no corresponding obra in the catalog.
 */
export function findOrphanIsrcs(
  isrcs: string[],
  isrcIndex: Map<string, CatalogObra>,
): string[] {
  return isrcs.filter((isrc) => !isrcIndex.has(isrc));
}

