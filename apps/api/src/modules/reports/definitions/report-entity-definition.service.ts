import { Injectable } from '@nestjs/common';
import { EntityMetadataService } from '../entity-metadata.service';
import type { ColumnMeta, EntityReport } from '../entity-metadata.types';
import type { ReportEntityDefinition } from './report-entity-definition.types';
import {
  contractDirectColumns,
  contractExportableColumns,
  contractImportableColumns,
  getReportFormContract,
  type ReportFormContract,
} from '../form-contracts/report-form-contracts';

const JSON_TYPES = new Set(['json', 'jsonb', 'simple-json', 'simple-array']);

const BLOB_NAME_HINT = /(^|_)(html|raw|payload|snapshot|dump|debug|xml)(_|$)/i;

const HIDDEN_INTERNAL_HINT =
  /^(notas?_internas?|observacoes?_internas?|comentarios?_internos?|internal_notes)$/i;

function isInternalColumn(c: ColumnMeta): boolean {
  return (
    c.primary ||
    c.generated ||
    c.isTenantId ||
    c.isCreatedAt ||
    c.isUpdatedAt ||
    c.isDeletedAt ||
    /_id$/.test(c.name) ||
    JSON_TYPES.has(c.type) ||
    BLOB_NAME_HINT.test(c.name) ||
    HIDDEN_INTERNAL_HINT.test(c.name) ||
    ['created_by', 'updated_by', 'uploaded_by', 'approved_by', 'org_slug', 'metadata'].includes(c.name)
  );
}

function isSensitiveColumn(c: ColumnMeta): boolean {
  return /_encrypted$|token|password|secret|hash|credential/i.test(c.name);
}

const DATE_TYPES = new Set(['timestamp', 'timestamptz', 'date', 'datetime', 'Date']);

const NUMERIC_TYPES = new Set([
  'int',
  'integer',
  'numeric',
  'decimal',
  'float',
  'bigint',
  'Number',
  'real',
  'double precision',
]);

const FILTERABLE_HINTS =
  /^(status|situacao|categoria|category|tipo|type|kind|stage|prioridade|priority|active|ativo|is_active|published|approved|archived)$/;

/**
 * Parte 88 — PROIBIDO fallback heurístico para entidades reportáveis. Uma
 * entidade só aparece na Central de Relatórios quando possui um
 * ReportFormContract explícito registrado em report-form-contracts.ts —
 * ela nunca "adivinha" colunas a partir da Entity/metadata TypeORM. Sem
 * contrato, a entidade simplesmente não existe para getDefinitions()/
 * getDefinition() (ver REPORT_CONTRACT_REQUIRED nos engines de export/import).
 */
@Injectable()
export class ReportEntityDefinitionService {
  constructor(private readonly entityMetadata: EntityMetadataService) {}

  getDefinitions(): ReportEntityDefinition[] {
    return this.entityMetadata
      .scan()
      .entities.filter((e) => e.reportable && getReportFormContract(e.tableName) !== null)
      .map((e) => this.build(e, getReportFormContract(e.tableName)!));
  }

  getDefinition(tableName: string): ReportEntityDefinition | null {
    return this.getDefinitions().find((d) => d.tableName === tableName) ?? null;
  }

  private build(e: EntityReport, contract: ReportFormContract): ReportEntityDefinition {
    const cols = e.columns;
    const sensitive = cols.filter(isSensitiveColumn).map((c) => c.name);
    const visible = cols.filter((c) => !isInternalColumn(c) && !isSensitiveColumn(c));

    const exportableColumns = contractExportableColumns(contract);
    const importableColumns = contractImportableColumns(contract);
    const identityColumn = contract.identityColumn;
    const displayColumn = identityColumn;

    const dateColumn =
      cols.find((c) => c.isCreatedAt)?.name ??
      cols.find((c) => DATE_TYPES.has(c.type) && !c.isUpdatedAt && !c.isDeletedAt)?.name ??
      'created_at';

    // Filtros/ordenação/busca operam em SQL: restritos a colunas FÍSICAS
    // diretas do contrato (nunca metadata/encrypted/ref, e nunca uma coluna
    // fora do contrato).
    const directContractColumns = contractDirectColumns(contract);
    const sqlSafe = (name: string): boolean => directContractColumns.has(name);

    const filterableColumns = contract.filterableColumns ?? visible
      .filter(
        (c) =>
          (FILTERABLE_HINTS.test(c.name) ||
            c.isEnum ||
            c.type === 'Boolean' ||
            DATE_TYPES.has(c.type)) &&
          sqlSafe(c.name),
      )
      .map((c) => c.name);

    const sortableColumns = Array.from(
      new Set([
        identityColumn,
        dateColumn,
        ...visible
          .filter((c) => (NUMERIC_TYPES.has(c.type) || DATE_TYPES.has(c.type)) && sqlSafe(c.name))
          .map((c) => c.name),
      ]),
    );

    const searchableColumns = contract.searchableColumns ?? visible
      .filter(
        (c) =>
          (c.type === 'String' || c.type === 'varchar' || c.type === 'text') &&
          !c.isEnum &&
          sqlSafe(c.name),
      )
      .map((c) => c.name);

    return {
      entityName: e.entityName,
      tableName: e.tableName,
      category: e.category,
      identityColumn,
      displayColumn,
      dateColumn,
      exportableColumns,
      importableColumns,
      filterableColumns,
      sortableColumns,
      searchableColumns,
      sensitiveColumns: sensitive,
      requiredImportColumns: [identityColumn],
      supportsExport: exportableColumns.length > 0,
      supportsImport: importableColumns.length > 0,
    };
  }
}
