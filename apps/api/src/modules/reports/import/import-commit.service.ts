import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { EncryptionService } from '../../../core/security/encryption.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import {
  contractEncryptedFields,
  contractMetadataFields,
  getReportFormContract,
  type ReportFormContract,
} from '../form-contracts/report-form-contracts';
import { REPEATING_GROUP_IMPORT_WRITERS } from '../computed-fields/registry';
import { ImportAuditService } from './import-audit.service';
import { ImportEngineService } from './import-engine.service';
import type { RowValidation } from './import.types';

export interface ImportCommitResult {
  entity: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  warnings: string[];
  errors: string[];
}

interface RowGroup {
  generalRow: RowValidation;
  itemRows: RowValidation[];
}

const MULTI_VALUE_SEPARATOR = ' | ';
const RELATION_TARGETS: Record<string, string> = {
  artista_id: 'artists',
  projeto_id: 'projects',
  release_id: 'releases',
  contrato_id: 'contracts',
  cliente_id: 'clients',
  campaign_id: 'campaigns',
};
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function quote(name: string): string {
  if (!IDENT.test(name)) throw new BadRequestException(`Identificador inválido: ${name}`);
  return `"${name}"`;
}

function normalizeImportedValue(value: unknown): unknown {
  if (value === '' || value === null || value === undefined) return null;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
    try { return JSON.parse(trimmed); } catch { return value; }
  }
  return value;
}

function groupRows(contract: ReportFormContract | null, rows: RowValidation[]): RowGroup[] {
  const repeatingGroup = contract?.repeatingGroup;
  if (!contract || !repeatingGroup) return rows.map((row) => ({ generalRow: row, itemRows: [row] }));

  const generalKeys = contract.fields.map((field) => field.key);
  const groups: RowGroup[] = [];
  let currentSignature: string | null = null;
  let current: RowGroup | null = null;

  for (const row of rows) {
    const signature = JSON.stringify(generalKeys.map((key) => row.data[key] ?? null));
    if (!current || signature !== currentSignature) {
      current = { generalRow: row, itemRows: [] };
      groups.push(current);
      currentSignature = signature;
    }
    current.itemRows.push(row);
  }
  return groups;
}

@Injectable()
export class ImportCommitService {
  constructor(
    @Inject(DATA_SOURCE) @Optional() private readonly ds: DataSource | null,
    private readonly engine: ImportEngineService,
    private readonly definitions: ReportEntityDefinitionService,
    private readonly audit: ImportAuditService,
    private readonly encryption: EncryptionService,
  ) {}

  async commit(
    entity: string,
    file: { filename: string; content: Buffer },
    tenantId: string | undefined,
    userId: string,
  ): Promise<ImportCommitResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const validation = await this.engine.validateFile(entity, file, tenantId);
    const def = this.definitions.getDefinition(entity)!;
    const contract = getReportFormContract(entity);

    if (validation.errors.length > 0 || validation.invalidRows > 0) {
      const rowErrors = validation.rows
        .filter((row) => !row.valid)
        .flatMap((row) => row.errors.map((error) => `Linha ${row.index + 2}: ${error.column} — ${error.message}`));
      return {
        entity,
        totalRows: validation.totalRows,
        importedRows: 0,
        failedRows: validation.invalidRows || validation.totalRows,
        warnings: validation.warnings,
        errors: [...validation.errors, ...rowErrors],
      };
    }

    if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponível');
    const groups = groupRows(contract, validation.rows);
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    await qr.query(`SELECT set_config('app.current_tenant_id', $1, true)`, [tenantId]);

    const errors: string[] = [];
    try {
      for (const group of groups) await this.assertNotDuplicate(qr, def, contract, group.generalRow, tenantId, errors);
      for (const row of validation.rows) await this.assertRelationships(qr, def, row, tenantId, errors);

      if (errors.length > 0) {
        await qr.rollbackTransaction();
        this.audit.record({ userId, tenantId, entity, recordCount: validation.totalRows, successCount: 0, failureCount: validation.totalRows, status: 'rolledback' });
        return { entity, totalRows: validation.totalRows, importedRows: 0, failedRows: validation.totalRows, warnings: validation.warnings, errors };
      }

      for (const group of groups) await this.insertGroup(qr, def, contract, group, tenantId);

      await qr.commitTransaction();
      this.audit.record({ userId, tenantId, entity, recordCount: validation.totalRows, successCount: validation.totalRows, failureCount: 0, status: 'committed' });
      return { entity, totalRows: validation.totalRows, importedRows: validation.totalRows, failedRows: 0, warnings: validation.warnings, errors: [] };
    } catch (error) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      this.audit.record({ userId, tenantId, entity, recordCount: validation.totalRows, successCount: 0, failureCount: validation.totalRows, status: 'rolledback' });
      throw error;
    } finally {
      await qr.release();
    }
  }

  private async assertNotDuplicate(
    qr: QueryRunner,
    def: ReportEntityDefinition,
    contract: ReportFormContract | null,
    row: RowValidation,
    tenantId: string,
    errors: string[],
  ): Promise<void> {
    const value = row.data[def.identityColumn];
    if (value === null || value === undefined || value === '') return;
    const identityColumn = contract?.fields.find((field) => field.key === def.identityColumn)?.physical ?? def.identityColumn;
    const found = await qr.query(
      `SELECT 1 FROM ${quote(def.tableName)} WHERE ${quote(identityColumn)} = $1 AND ${quote('tenant_id')} = $2 LIMIT 1`,
      [value, tenantId],
    );
    if (Array.isArray(found) && found.length > 0) {
      errors.push(`Linha ${row.index + 2}: já existe registro com ${def.identityColumn}="${String(value)}" (create-only).`);
    }
  }

  private async assertRelationships(
    qr: QueryRunner,
    def: ReportEntityDefinition,
    row: RowValidation,
    tenantId: string,
    errors: string[],
  ): Promise<void> {
    for (const column of def.importableColumns) {
      if (!/_id$/.test(column)) continue;
      const target = RELATION_TARGETS[column];
      if (!target) continue;
      const value = row.data[column];
      if (value === null || value === undefined || value === '') continue;
      const found = await qr.query(
        `SELECT 1 FROM ${quote(target)} WHERE ${quote('id')} = $1 AND ${quote('tenant_id')} = $2 LIMIT 1`,
        [value, tenantId],
      );
      if (!Array.isArray(found) || found.length === 0) {
        errors.push(`Linha ${row.index + 2}: relacionamento inválido ${column}="${String(value)}".`);
      }
    }
  }

  private async insertGroup(
    qr: QueryRunner,
    def: ReportEntityDefinition,
    contract: ReportFormContract | null,
    group: RowGroup,
    tenantId: string,
  ): Promise<void> {
    const generalKeys = contract ? contract.fields.map((field) => field.key) : def.importableColumns;
    const encryptedFields = contract ? contractEncryptedFields(contract) : {};
    const metadataFields = contract ? contractMetadataFields(contract) : {};
    const cols: string[] = [];
    const values: unknown[] = [];
    const metadataByColumn: Record<string, Record<string, unknown>> = {};
    for (const physicalColumn of new Set(Object.values(metadataFields))) metadataByColumn[physicalColumn] = {};

    for (const column of generalKeys) {
      if (!(column in group.generalRow.data)) continue;
      const rawValue = contract ? normalizeImportedValue(group.generalRow.data[column]) : group.generalRow.data[column];
      if (contract && rawValue === null) continue;

      const encryptedColumn = encryptedFields[column];
      if (encryptedColumn) {
        cols.push(encryptedColumn);
        values.push(typeof rawValue === 'string' ? this.encryption.encryptNullable(rawValue) : null);
        continue;
      }

      const metadataColumn = metadataFields[column];
      if (metadataColumn) {
        metadataByColumn[metadataColumn][column] = rawValue;
        continue;
      }

      const field = contract?.fields.find((item) => item.key === column);
      cols.push(field?.physical ?? column);
      values.push(rawValue);
    }

    for (const [physicalColumn, object] of Object.entries(metadataByColumn)) {
      if (Object.keys(object).length === 0) continue;
      cols.push(physicalColumn);
      values.push(object);
    }
    cols.push('tenant_id');
    values.push(tenantId);

    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    const repeatingGroup = contract?.repeatingGroup;
    const sql = `INSERT INTO ${quote(def.tableName)} (${cols.map(quote).join(', ')}) VALUES (${placeholders})` +
      (repeatingGroup ? ` RETURNING ${quote('id')}` : '');
    const result = await qr.query(sql, values);

    if (!repeatingGroup) return;
    const insertedId = (result as Array<{ id: string }>)[0]?.id;
    if (!insertedId) throw new Error(`[reports-import] INSERT sem id retornado para grupo repetível: ${def.tableName}`);

    const writer = REPEATING_GROUP_IMPORT_WRITERS[`${def.tableName}.${repeatingGroup.key}`];
    if (!writer) throw new Error(`[reports-import] grupo repetível sem writer registrado: ${def.tableName}.${repeatingGroup.key}`);

    const items = group.itemRows
      .map((row) => {
        const item: Record<string, unknown> = {};
        for (const field of repeatingGroup.fields) {
          const raw = row.data[field.key];
          const text = raw === null || raw === undefined ? '' : String(raw);
          item[field.key] = field.multi
            ? text.split(MULTI_VALUE_SEPARATOR).map((part) => part.trim()).filter(Boolean)
            : (text === '' ? null : text);
        }
        return item;
      })
      .filter((item) => Object.values(item).some((value) => Array.isArray(value) ? value.length > 0 : value !== null));

    await writer(qr, tenantId, insertedId, items);
  }
}
