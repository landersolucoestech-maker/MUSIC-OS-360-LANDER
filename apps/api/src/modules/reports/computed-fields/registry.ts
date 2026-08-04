/**
 * modules/reports/computed-fields/registry.ts
 *
 * Registro mínimo de resolvers para grupos repetíveis achatados em linhas da
 * mesma aba. A chave é "tableName.groupKey".
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
  makeRowEmbeddedChildSheetExportResolver,
  makeRowEmbeddedChildSheetImportWriter,
} from './row-embedded-child-sheet';

export type RepeatingGroupExportResolver = (
  ds: DataSource,
  tenantId: string,
  parentIds: string[],
) => Promise<Map<string, Record<string, unknown>[]>>;

export type RepeatingGroupImportWriter = (
  qr: QueryRunner,
  tenantId: string,
  parentId: string,
  items: unknown,
) => Promise<void>;

const invoicesItens = { tableName: 'invoices', jsonColumn: 'itens', arrayKey: null } as const;
const eventsParticipantes = { tableName: 'events', jsonColumn: 'participantes', arrayKey: null } as const;

export const REPEATING_GROUP_EXPORT_RESOLVERS: Record<string, RepeatingGroupExportResolver> = {
  'projects.musicas': fetchProjectsMusicasForExport as unknown as RepeatingGroupExportResolver,
  'releases.faixas': fetchReleasesFaixasForExport as unknown as RepeatingGroupExportResolver,
  'invoices.itens': makeRowEmbeddedChildSheetExportResolver(invoicesItens),
  'events.participantes': makeRowEmbeddedChildSheetExportResolver(eventsParticipantes),
};

export const REPEATING_GROUP_IMPORT_WRITERS: Record<string, RepeatingGroupImportWriter> = {
  'projects.musicas': insertProjectsMusicasForImport,
  'releases.faixas': writeReleasesFaixasForImport,
  'invoices.itens': makeRowEmbeddedChildSheetImportWriter(invoicesItens),
  'events.participantes': makeRowEmbeddedChildSheetImportWriter(eventsParticipantes),
};
