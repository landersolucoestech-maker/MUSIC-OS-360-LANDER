/**
 * modules/reports/import/import-commit.service.ts  ·  FASE 2.3B
 *
 * Commit transacional da importação. Tudo-ou-nada: qualquer falha (validação,
 * duplicidade no banco, FK inválida, exceção) → ROLLBACK total. Sem upsert/merge
 * /overwrite. tenant_id SEMPRE do tenant atual, nunca do arquivo. Persiste apenas
 * importableColumns (whitelist explícita).
 */
import {
  BadRequestException, ForbiddenException, Inject, Injectable, Optional, ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import { ImportEngineService } from './import-engine.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import { ImportAuditService } from './import-audit.service';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import type { RowValidation } from './import.types';

export interface ImportCommitResult {
  entity: string;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  warnings: string[];
  errors: string[];
}

// FK importáveis → tabela alvo (create-only não cria relacionamento; só valida).
const RELATION_TARGETS: Record<string, string> = {
  artista_id: 'artists',
  projeto_id: 'projects',
  release_id: 'releases',
  contrato_id: 'contracts',
  cliente_id: 'clients',
  campaign_id: 'campaigns',
};

// Identificadores são SEMPRE quotados antes do SQL → maiúsculas são seguras.
// Aceita colunas físicas camelCase legadas (ex.: leads."tipoServico") sem injeção.
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
function quote(name: string): string {
  if (!IDENT.test(name)) throw new BadRequestException(`Identificador inválido: ${name}`);
  return `"${name}"`;
}

@Injectable()
export class ImportCommitService {
  constructor(
    @Inject(DATA_SOURCE) @Optional() private readonly ds: DataSource | null,
    private readonly engine: ImportEngineService,
    private readonly definitions: ReportEntityDefinitionService,
    private readonly audit: ImportAuditService,
  ) {}

  async commit(
    entity: string,
    file: { filename: string; content: Buffer },
    tenantId: string | undefined,
    userId: string,
  ): Promise<ImportCommitResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    // ── ETAPA 3: REVALIDAÇÃO (nunca confia no preview do cliente) ──────────────
    const validation = await this.engine.validateFile(entity, file, tenantId);
    const def = this.definitions.getDefinition(entity)!;

    // Falha de validação → nada persiste (importação parcial proibida).
    if (validation.errors.length > 0 || validation.invalidRows > 0) {
      const rowErrors = validation.rows
        .filter((r) => !r.valid)
        .flatMap((r) => r.errors.map((e) => `Linha ${r.index + 2}: ${e.column} — ${e.message}`));
      return {
        entity, totalRows: validation.totalRows, importedRows: 0,
        failedRows: validation.invalidRows || validation.totalRows,
        warnings: validation.warnings, errors: [...validation.errors, ...rowErrors],
      };
    }

    if (!this.ds) throw new ServiceUnavailableException('Banco de dados indisponível');

    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    const errors: string[] = [];
    try {
      // ── Deduplicação contra o banco + FK (read) ──────────────────────────────
      for (const row of validation.rows) {
        await this.assertNotDuplicate(qr, def, row, tenantId, errors);
        await this.assertRelationships(qr, def, row, tenantId, errors);
      }

      if (errors.length > 0) {
        await qr.rollbackTransaction();
        this.audit.record({ userId, tenantId, entity, recordCount: validation.totalRows, successCount: 0, failureCount: validation.totalRows, status: 'rolledback' });
        return { entity, totalRows: validation.totalRows, importedRows: 0, failedRows: validation.totalRows, warnings: validation.warnings, errors };
      }

      // ── Persistência create-only (whitelist + tenant forçado) ────────────────
      for (const row of validation.rows) {
        await this.insertRow(qr, def, row, tenantId);
      }

      await qr.commitTransaction();
      this.audit.record({ userId, tenantId, entity, recordCount: validation.totalRows, successCount: validation.totalRows, failureCount: 0, status: 'committed' });
      return { entity, totalRows: validation.totalRows, importedRows: validation.totalRows, failedRows: 0, warnings: validation.warnings, errors: [] };
    } catch (err) {
      if (qr.isTransactionActive) await qr.rollbackTransaction();
      this.audit.record({ userId, tenantId, entity, recordCount: validation.totalRows, successCount: 0, failureCount: validation.totalRows, status: 'rolledback' });
      throw err;
    } finally {
      await qr.release();
    }
  }

  private async assertNotDuplicate(
    qr: QueryRunner, def: ReportEntityDefinition, row: RowValidation, tenantId: string, errors: string[],
  ): Promise<void> {
    const idVal = row.data[def.identityColumn];
    if (idVal === null || idVal === undefined || idVal === '') return;
    const found = await qr.query(
      `SELECT 1 FROM ${quote(def.tableName)} WHERE ${quote(def.identityColumn)} = $1 AND ${quote('tenant_id')} = $2 LIMIT 1`,
      [idVal, tenantId],
    );
    if (Array.isArray(found) && found.length > 0) {
      errors.push(`Linha ${row.index + 2}: já existe registro com ${def.identityColumn}="${String(idVal)}" (create-only).`);
    }
  }

  private async assertRelationships(
    qr: QueryRunner, def: ReportEntityDefinition, row: RowValidation, tenantId: string, errors: string[],
  ): Promise<void> {
    for (const col of def.importableColumns) {
      if (!/_id$/.test(col)) continue;
      const target = RELATION_TARGETS[col];
      if (!target) continue; // alvo desconhecido → não cria, não valida (não bloqueia)
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

  private async insertRow(qr: QueryRunner, def: ReportEntityDefinition, row: RowValidation, tenantId: string): Promise<void> {
    // Objeto EXPLÍCITO a partir da whitelist; sem spread do arquivo.
    const cols: string[] = [];
    const values: unknown[] = [];
    for (const col of def.importableColumns) {
      if (col in row.data) { cols.push(col); values.push(row.data[col]); }
    }
    // tenant_id SEMPRE do tenant atual (sobrescreve qualquer coisa do arquivo).
    cols.push('tenant_id');
    values.push(tenantId);

    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `INSERT INTO ${quote(def.tableName)} (${cols.map(quote).join(', ')}) VALUES (${placeholders})`;
    await qr.query(sql, values);
  }
}
