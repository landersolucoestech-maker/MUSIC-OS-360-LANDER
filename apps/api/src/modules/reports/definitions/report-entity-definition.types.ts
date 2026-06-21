/**
 * modules/reports/definitions/report-entity-definition.types.ts
 *
 * FASE 2.1 — contrato explícito por entidade reportável.
 * O contrato declara CHAVES TÉCNICAS (colunas reais da metadata TypeORM).
 * Os LABELS são resolvidos exclusivamente pela camada i18n (getFieldLabelPtBr).
 */
import type { EntityCategory } from '../entity-metadata.types';

export interface ReportEntityDefinition {
  entityName: string;
  tableName: string;
  category: EntityCategory;

  /** Coluna de identidade natural (não-PK interna) — ex.: numero, nome. */
  identityColumn: string;
  /** Coluna usada para exibição amigável. */
  displayColumn: string;
  /** Coluna de data principal (filtro/ordem temporal). */
  dateColumn: string;

  exportableColumns: string[];
  importableColumns: string[];
  filterableColumns: string[];
  sortableColumns: string[];
  searchableColumns: string[];
  sensitiveColumns: string[];
  requiredImportColumns: string[];

  supportsExport: boolean;
  supportsImport: boolean;
}
