/**
 * modules/reports/definitions/report-entity-definition.service.ts
 *
 * FASE 2.1 — compõe o contrato ReportEntityDefinition de cada entidade
 * reportável EFETIVA, ancorado nas colunas REAIS da metadata TypeORM (FASE 1).
 * Nunca inventa coluna. Colunas sensíveis nunca entram em export/import.
 * Labels não vivem aqui — são resolvidos pela camada i18n.
 */
import { Injectable } from '@nestjs/common';
import { EntityMetadataService } from '../entity-metadata.service';
import type { ColumnMeta, EntityReport } from '../entity-metadata.types';
import type { ReportEntityDefinition } from './report-entity-definition.types';

const IDENTITY_NAMES = [
  'numero', 'nome', 'nome_artistico', 'nome_civil', 'razao_social', 'titulo',
  'title', 'name', 'codigo', 'code', 'slug', 'email', 'label', 'assunto',
  'ticket_number', 'isrc', 'iswc',
];

/** Tipos de blob estruturado (JSON/snapshot) — não são colunas de relatório. */
const JSON_TYPES = new Set(['json', 'jsonb', 'simple-json']);

/** Colunas técnicas/auditoria que nunca são exportáveis. */
function isInternalColumn(c: ColumnMeta): boolean {
  return (
    c.primary || c.generated || c.isTenantId ||
    c.isCreatedAt || c.isUpdatedAt || c.isDeletedAt ||
    /_id$/.test(c.name) ||
    JSON_TYPES.has(c.type) ||
    ['created_by', 'updated_by', 'uploaded_by', 'approved_by', 'org_slug', 'metadata'].includes(c.name)
  );
}

/** Colunas sensíveis (criptografadas/credenciais) — nunca exportadas/importadas. */
function isSensitiveColumn(c: ColumnMeta): boolean {
  return /_encrypted$|token|password|secret|hash|credential/i.test(c.name);
}

const DATE_TYPES = new Set(['timestamp', 'timestamptz', 'date', 'datetime', 'Date']);
const NUMERIC_TYPES = new Set(['int', 'integer', 'numeric', 'decimal', 'float', 'bigint', 'Number', 'real', 'double precision']);
const FILTERABLE_HINTS = /^(status|situacao|categoria|category|tipo|type|kind|stage|prioridade|priority|active|ativo|is_active|published|approved|archived)$/;

@Injectable()
export class ReportEntityDefinitionService {
  constructor(private readonly entityMetadata: EntityMetadataService) {}

  getDefinitions(): ReportEntityDefinition[] {
    return this.entityMetadata
      .scan()
      .entities.filter((e) => e.reportable)
      .map((e) => this.build(e));
  }

  getDefinition(tableName: string): ReportEntityDefinition | null {
    return this.getDefinitions().find((d) => d.tableName === tableName) ?? null;
  }

  private build(e: EntityReport): ReportEntityDefinition {
    const cols = e.columns;
    const sensitive = cols.filter(isSensitiveColumn).map((c) => c.name);

    const visible = cols.filter((c) => !isInternalColumn(c) && !isSensitiveColumn(c));
    const exportableColumns = visible.map((c) => c.name);

    // Importáveis: visíveis exceto colunas claramente derivadas/automáticas.
    const importableColumns = visible
      .filter((c) => !/_count$|^auto_|_at$/.test(c.name) && c.name !== 'auto_generated')
      .map((c) => c.name);

    const identityColumn =
      cols.find((c) => IDENTITY_NAMES.includes(c.name))?.name ?? exportableColumns[0] ?? 'id';
    const displayColumn = identityColumn;

    const dateColumn =
      cols.find((c) => c.isCreatedAt)?.name ??
      cols.find((c) => DATE_TYPES.has(c.type) && !c.isUpdatedAt && !c.isDeletedAt)?.name ??
      'created_at';

    const filterableColumns = visible
      .filter((c) => FILTERABLE_HINTS.test(c.name) || c.isEnum || c.type === 'Boolean' || DATE_TYPES.has(c.type))
      .map((c) => c.name);

    const sortableColumns = Array.from(
      new Set([
        identityColumn,
        dateColumn,
        ...visible.filter((c) => NUMERIC_TYPES.has(c.type) || DATE_TYPES.has(c.type)).map((c) => c.name),
      ]),
    );

    const searchableColumns = visible
      .filter((c) => (c.type === 'String' || c.type === 'varchar' || c.type === 'text') && !c.isEnum)
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
      // Export sempre disponível; import declarado para entidades com identidade
      // e ao menos uma coluna importável (a execução real é fase posterior).
      supportsExport: exportableColumns.length > 0,
      supportsImport: importableColumns.length > 0 && IDENTITY_NAMES.includes(identityColumn),
    };
  }
}
