/**
 * Registro dos resolvers e writers para grupos repetíveis achatados em linhas
 * da mesma aba XLSX.
 */
import type { DataSource, QueryRunner } from 'typeorm';
import {
  fetchProjectsMusicasForExport,
  insertProjectsMusicasForImport,
} from './projects-musicas.field';
import {
  fetchReleasesFaixasForExport,
  writeReleasesFaixasForImport,
} from './releases-faixas.field';
import {
  makeRowEmbeddedRepeatingGroupExportResolver,
  makeRowEmbeddedRepeatingGroupImportWriter,
} from './row-embedded-repeating-group';

export type RepeatingGroupExportResolver = (
  dataSource: DataSource,
  tenantId: string,
  parentIds: string[],
) => Promise<Map<string, Record<string, unknown>[]>>;

export type RepeatingGroupImportWriter = (
  queryRunner: QueryRunner,
  tenantId: string,
  parentId: string,
  items: unknown,
) => Promise<void>;

const invoiceItems = {
  tableName: 'invoices',
  jsonColumn: 'itens',
  arrayKey: null,
} as const;
const eventParticipants = {
  tableName: 'events',
  jsonColumn: 'participantes',
  arrayKey: null,
} as const;

export const REPEATING_GROUP_EXPORT_RESOLVERS: Record<string, RepeatingGroupExportResolver> = {
  'projects.musicas': fetchProjectsMusicasForExport as unknown as RepeatingGroupExportResolver,
  'releases.faixas': fetchReleasesFaixasForExport as unknown as RepeatingGroupExportResolver,
  'invoices.itens': makeRowEmbeddedRepeatingGroupExportResolver(invoiceItems),
  'events.participantes': makeRowEmbeddedRepeatingGroupExportResolver(eventParticipants),
};

export const REPEATING_GROUP_IMPORT_WRITERS: Record<string, RepeatingGroupImportWriter> = {
  'projects.musicas': insertProjectsMusicasForImport,
  'releases.faixas': writeReleasesFaixasForImport,
  'invoices.itens': makeRowEmbeddedRepeatingGroupImportWriter(invoiceItems),
  'events.participantes': makeRowEmbeddedRepeatingGroupImportWriter(eventParticipants),
};
