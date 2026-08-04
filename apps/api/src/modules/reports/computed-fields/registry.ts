/**
 * modules/reports/computed-fields/registry.ts  ·  Parte 86
 *
 * Registro mínimo de resolvers para campos `storage: 'computed'` do contrato
 * (report-form-contracts.ts) — chaveado por "tableName.fieldKey" para
 * precisão total caso uma entidade venha a ter mais de um campo computed no
 * futuro. NÃO é um framework de plugins: é um lookup direto, e um contrato
 * que declara `computed()` sem resolver registrado aqui falha alto e cedo
 * (ExportEngineService/ImportCommitService lançam erro explícito), nunca
 * silenciosamente.
 */
import type { DataSource, QueryRunner } from 'typeorm';
import {
  fetchProjectsMusicasForExport,
  insertProjectsMusicasForImport,
} from './projects-musicas.field';

export type ComputedFieldExportResolver = (
  ds: DataSource,
  tenantId: string,
  rowIds: string[],
) => Promise<Map<string, unknown>>;

export type ComputedFieldImportWriter = (
  qr: QueryRunner,
  tenantId: string,
  rowId: string,
  value: unknown,
) => Promise<void>;

export const COMPUTED_FIELD_EXPORT_RESOLVERS: Record<string, ComputedFieldExportResolver> = {
  'projects.musicas': fetchProjectsMusicasForExport,
};

export const COMPUTED_FIELD_IMPORT_WRITERS: Record<string, ComputedFieldImportWriter> = {
  'projects.musicas': insertProjectsMusicasForImport,
};
