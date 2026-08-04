/**
 * modules/reports/computed-fields/registry.ts  ·  Parte 87
 *
 * Registro mínimo de resolvers para abas filhas (`ReportFormContract.childSheets`,
 * report-form-contracts.ts) — chaveado por "tableName.childSheetKey". NÃO é
 * um framework de plugins: é um lookup direto, e uma aba filha declarada sem
 * resolver registrado aqui falha alto e cedo (ExportEngineService/
 * ImportCommitService lançam erro explícito), nunca silenciosamente.
 */
import type { DataSource, QueryRunner } from 'typeorm';
import {
  fetchProjectsMusicasForExport,
  insertProjectsMusicasForImport,
} from './projects-musicas.field';

export type ChildSheetExportResolver = (
  ds: DataSource,
  tenantId: string,
  refIds: string[],
) => Promise<Map<string, Record<string, unknown>[]>>;

export type ChildSheetImportWriter = (
  qr: QueryRunner,
  tenantId: string,
  parentId: string,
  rows: unknown,
) => Promise<void>;

export const CHILD_SHEET_EXPORT_RESOLVERS: Record<string, ChildSheetExportResolver> = {
  'projects.musicas': fetchProjectsMusicasForExport as unknown as ChildSheetExportResolver,
};

export const CHILD_SHEET_IMPORT_WRITERS: Record<string, ChildSheetImportWriter> = {
  'projects.musicas': insertProjectsMusicasForImport,
};
