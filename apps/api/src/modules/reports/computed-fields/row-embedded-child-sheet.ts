/**
 * modules/reports/computed-fields/row-embedded-child-sheet.ts  ·  Parte 89
 *
 * Fábrica de resolver/writer para abas filhas cujos itens vivem DENTRO da
 * própria linha do pai — num array armazenado numa coluna jsonb própria
 * (ex.: invoices.itens) ou dentro de uma chave do jsonb `metadata`
 * (ex.: releases.metadata.faixas, events.metadata.participantes) — ao
 * contrário de Projetos, cujas músicas vivem numa tabela filha normalizada
 * (project_tracks). Mesma regra do Bloco 6: cada item do array vira UMA
 * LINHA da aba filha, nunca uma célula JSON.
 */
import type { DataSource, QueryRunner } from 'typeorm';

export interface RowEmbeddedChildSheetSpec {
  /** Tabela do pai (ex.: 'releases'). */
  tableName: string;
  /** Coluna jsonb onde o array vive (ex.: 'itens' ou 'metadata'). */
  jsonColumn: string;
  /** Chave dentro de jsonColumn onde o array vive, ou null se jsonColumn É o array. */
  arrayKey: string | null;
}

export function makeRowEmbeddedChildSheetExportResolver(spec: RowEmbeddedChildSheetSpec) {
  return async (
    ds: DataSource,
    tenantId: string,
    refIds: string[],
  ): Promise<Map<string, Record<string, unknown>[]>> => {
    const out = new Map<string, Record<string, unknown>[]>();
    if (refIds.length === 0) return out;
    const selectExpr = spec.arrayKey
      ? `"${spec.jsonColumn}"->'${spec.arrayKey}'`
      : `"${spec.jsonColumn}"`;
    const rows = (await ds.query(
      `SELECT "id", ${selectExpr} AS items FROM "${spec.tableName}" WHERE "tenant_id" = $1 AND "id" = ANY($2::uuid[])`,
      [tenantId, refIds],
    )) as { id: string; items: unknown }[];
    for (const row of rows) {
      out.set(row.id, Array.isArray(row.items) ? (row.items as Record<string, unknown>[]) : []);
    }
    return out;
  };
}

export function makeRowEmbeddedChildSheetImportWriter(spec: RowEmbeddedChildSheetSpec) {
  return async (
    qr: QueryRunner,
    tenantId: string,
    parentId: string,
    items: unknown,
  ): Promise<void> => {
    const list = Array.isArray(items) ? items : [];
    if (spec.arrayKey) {
      await qr.query(
        `UPDATE "${spec.tableName}" SET "${spec.jsonColumn}" = jsonb_set(COALESCE("${spec.jsonColumn}", '{}'::jsonb), '{${spec.arrayKey}}', $1::jsonb) WHERE "id" = $2 AND "tenant_id" = $3`,
        [JSON.stringify(list), parentId, tenantId],
      );
    } else {
      await qr.query(
        `UPDATE "${spec.tableName}" SET "${spec.jsonColumn}" = $1::jsonb WHERE "id" = $2 AND "tenant_id" = $3`,
        [JSON.stringify(list), parentId, tenantId],
      );
    }
  };
}
