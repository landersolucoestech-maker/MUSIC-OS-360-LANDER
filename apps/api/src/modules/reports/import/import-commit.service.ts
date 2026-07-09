import {
  ForbiddenException,
  Inject,
  Injectable,
  Optional,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ImportEngineService } from './import-engine.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import { ImportAuditService } from './import-audit.service';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import type { RowValidation } from './import.types';
import { EncryptionService } from '../../../core/security/encryption.service';
import {
  ARTIST_DIRECT_COLUMNS,
  ARTIST_ENCRYPTED_FIELDS,
  isArtistMetadataField,
} from '../form-contracts/artists.form-contract';

export interface ImportCommitResult {
  entity: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  warnings: string[];
  errors: string[];
}

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
  if (value === '') return null;

  if (typeof value !== 'string') return value;

  const trimmed = value.trim();

  if (trimmed === '') return null;

  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      return JSON.parse(trimmed);
    } catch {
      return value;
    }
  }

  return value;
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

    if (validation.errors.length > 0 || validation.invalidRows > 0) {
      const rowErrors = validation.rows
        .filter((r) => !r.valid)
        .flatMap((r) =>
          r.errors.map((e) => `Linha ${r.index + 2}: ${e.column} — ${e.message}`),
        );

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

    const qr = this.ds.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();

    const errors: string[] = [];

    try {
      for (const row of validation.rows) {
        await this.assertNotDuplicate(qr, def, row, tenantId, errors);
        await this.assertRelationships(qr, def, row, tenantId, errors);
      }

      if (errors.length > 0) {
        await qr.rollbackTransaction();

        this.audit.record({
          userId,
          tenantId,
          entity,
          recordCount: validation.totalRows,
          successCount: 0,
          failureCount: validation.totalRows,
          status: 'rolledback',
        });

        return {
          entity,
          totalRows: validation.totalRows,
          importedRows: 0,
          failedRows: validation.totalRows,
          warnings: validation.warnings,
          errors,
        };
      }

      for (const row of validation.rows) {
        await this.insertRow(qr, def, row, tenantId);
      }

      await qr.commitTransaction();

      this.audit.record({
        userId,
        tenantId,
        entity,
        recordCount: validation.totalRows,
        successCount: validation.totalRows,
        failureCount: 0,
        status: 'committed',
      });

      return {
        entity,
        totalRows: validation.totalRows,
        importedRows: validation.totalRows,
        failedRows: 0,
        warnings: validation.warnings,
        errors: [],
      };
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();

      this.audit.record({
        userId,
        tenantId,
        entity,
        recordCount: validation.totalRows,
        successCount: 0,
        failureCount: validation.totalRows,
        status: 'rolledback',
      });

      throw err;
    } finally {
      await qr.release();
    }
  }

  private async assertNotDuplicate(
    qr: QueryRunner,
    def: ReportEntityDefinition,
    row: RowValidation,
    tenantId: string,
    errors: string[],
  ): Promise<void> {
    const idVal = row.data[def.identityColumn];

    if (idVal === null || idVal === undefined || idVal === '') return;

    const found = await qr.query(
      `SELECT 1 FROM ${quote(def.tableName)} WHERE ${quote(def.identityColumn)} = $1 AND ${quote('tenant_id')} = $2 LIMIT 1`,
      [idVal, tenantId],
    );

    if (Array.isArray(found) && found.length > 0) {
      errors.push(
        `Linha ${row.index + 2}: já existe registro com ${def.identityColumn}="${String(idVal)}" (create-only).`,
      );
    }
  }

  private async assertRelationships(
    qr: QueryRunner,
    def: ReportEntityDefinition,
    row: RowValidation,
    tenantId: string,
    errors: string[],
  ): Promise<void> {
    for (const col of def.importableColumns) {
      if (!/_id$/.test(col)) continue;

      const target = RELATION_TARGETS[col];

      if (!target) continue;

      const val = row.data[col];

      if (val === null || val === undefined || val === '') continue;

      const ref = await qr.query(
        `SELECT 1 FROM ${quote(target)} WHERE ${quote('id')} = $1 AND ${quote('tenant_id')} = $2 LIMIT 1`,
        [val, tenantId],
      );

      if (!Array.isArray(ref) || ref.length === 0) {
        errors.push(`Linha ${row.index + 2}: relacionamento inválido ${col}="${String(val)}".`);
      }
    }
  }

  private async insertRow(
    qr: QueryRunner,
    def: ReportEntityDefinition,
    row: RowValidation,
    tenantId: string,
  ): Promise<void> {
    if (def.tableName === 'artists') {
      await this.insertArtistRow(qr, def, row, tenantId);
      return;
    }

    const cols: string[] = [];
    const values: unknown[] = [];

    for (const col of def.importableColumns) {
      if (col in row.data) {
        cols.push(col);
        values.push(row.data[col]);
      }
    }

    cols.push('tenant_id');
    values.push(tenantId);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${quote(def.tableName)} (${cols.map(quote).join(', ')}) VALUES (${placeholders})`;

    await qr.query(sql, values);
  }

  private async insertArtistRow(
    qr: QueryRunner,
    def: ReportEntityDefinition,
    row: RowValidation,
    tenantId: string,
  ): Promise<void> {
    const cols: string[] = [];
    const values: unknown[] = [];
    const metadata: Record<string, unknown> = {};

    for (const col of def.importableColumns) {
      if (!(col in row.data)) continue;

      const rawValue = normalizeImportedValue(row.data[col]);

      const encryptedColumn = ARTIST_ENCRYPTED_FIELDS[col];

      if (encryptedColumn) {
        cols.push(encryptedColumn);
        values.push(
          typeof rawValue === 'string'
            ? this.encryption.encryptNullable(rawValue)
            : null,
        );
        continue;
      }

      if (ARTIST_DIRECT_COLUMNS.has(col)) {
        cols.push(col);
        values.push(rawValue);
        continue;
      }

      if (isArtistMetadataField(col)) {
        metadata[col] = rawValue;
      }
    }

    cols.push('metadata');
    values.push(metadata);

    cols.push('tenant_id');
    values.push(tenantId);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `INSERT INTO ${quote(def.tableName)} (${cols.map(quote).join(', ')}) VALUES (${placeholders})`;

    await qr.query(sql, values);
  }
}