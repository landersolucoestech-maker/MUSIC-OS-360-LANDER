import { Injectable } from '@nestjs/common';
import { EntityMetadataService } from '../entity-metadata.service';
import type { ColumnMeta, EntityReport } from '../entity-metadata.types';
import type { ReportEntityDefinition } from './report-entity-definition.types';
import { ARTIST_FORM_FIELDS } from '../form-contracts/artists.form-contract';

const IDENTITY_NAMES = [
  'numero',
  'nome',
  'nome_artistico',
  'nome_civil',
  'razao_social',
  'titulo',
  'title',
  'name',
  'codigo',
  'code',
  'slug',
  'email',
  'label',
  'assunto',
  'ticket_number',
  'isrc',
  'iswc',
];

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

    const exportableColumns =
      e.tableName === 'artists'
        ? [...ARTIST_FORM_FIELDS]
        : visible.map((c) => c.name);

    const importableColumns =
      e.tableName === 'artists'
        ? [...ARTIST_FORM_FIELDS]
        : visible
            .filter((c) => !/_count$|^auto_|_at$/.test(c.name) && c.name !== 'auto_generated')
            .map((c) => c.name);

    const identityColumn =
      e.tableName === 'artists'
        ? 'nome_artistico'
        : cols.find((c) => IDENTITY_NAMES.includes(c.name))?.name ?? exportableColumns[0] ?? 'id';

    const displayColumn = identityColumn;

    const dateColumn =
      cols.find((c) => c.isCreatedAt)?.name ??
      cols.find((c) => DATE_TYPES.has(c.type) && !c.isUpdatedAt && !c.isDeletedAt)?.name ??
      'created_at';

    const filterableColumns =
      e.tableName === 'artists'
        ? ['status', 'tipo', 'genero_musical']
        : visible
            .filter(
              (c) =>
                FILTERABLE_HINTS.test(c.name) ||
                c.isEnum ||
                c.type === 'Boolean' ||
                DATE_TYPES.has(c.type),
            )
            .map((c) => c.name);

    const sortableColumns = Array.from(
      new Set([
        identityColumn,
        dateColumn,
        ...visible
          .filter((c) => NUMERIC_TYPES.has(c.type) || DATE_TYPES.has(c.type))
          .map((c) => c.name),
      ]),
    );

    const searchableColumns =
      e.tableName === 'artists'
        ? ['nome_artistico', 'nome_civil', 'genero_musical', 'observacoes']
        : visible
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
      supportsExport: exportableColumns.length > 0,
      supportsImport: importableColumns.length > 0 && IDENTITY_NAMES.includes(identityColumn),
    };
  }
}