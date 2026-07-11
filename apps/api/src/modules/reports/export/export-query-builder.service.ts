import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import { EXPORT_MAX_PAGE_SIZE, type BuiltExportQuery, type ExportQueryParams } from './export.types';
import {
  contractEncryptedFields,
  contractMetadataFields,
  getReportFormContract,
} from '../form-contracts/report-form-contracts';

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdent(name: string): void {
  if (!IDENT.test(name)) throw new BadRequestException(`Identificador inválido: ${name}`);
}

function quote(name: string): string {
  assertIdent(name);
  return `"${name}"`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function metadataSelectExpression(column: string): string {
  const safeJsonKey = column.replace(/'/g, "''");
  return `${quote('metadata')} ->> '${safeJsonKey}' AS ${quote(column)}`;
}

@Injectable()
export class ExportQueryBuilderService {
  build(
    def: ReportEntityDefinition,
    params: ExportQueryParams,
    tenantId: string,
    opts: { softDeleteColumn?: string } = {},
  ): BuiltExportQuery {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado para exportação');

    const requested =
      params.columns && params.columns.length > 0
        ? params.columns
        : def.exportableColumns;

    for (const c of requested) {
      if (def.sensitiveColumns.includes(c)) {
        throw new BadRequestException(`Coluna sensível não pode ser exportada: ${c}`);
      }

      if (!def.exportableColumns.includes(c)) {
        throw new BadRequestException(`Coluna não exportável: ${c}`);
      }
    }

    const columns = [...requested];

    // Resolução física via contrato central (fonte única): coluna direta,
    // campo em metadata jsonb ou coluna cifrada (exposta pela chave lógica).
    const contract = getReportFormContract(def.tableName);
    const encryptedFields = contract ? contractEncryptedFields(contract) : {};
    const metadataFields = contract ? contractMetadataFields(contract) : new Set<string>();

    const selectList = columns
      .map((column) => {
        const encryptedPhysicalColumn = encryptedFields[column];
        if (encryptedPhysicalColumn) {
          return `${quote(encryptedPhysicalColumn)} AS ${quote(column)}`;
        }
        if (metadataFields.has(column)) {
          return metadataSelectExpression(column);
        }
        return quote(column);
      })
      .join(', ');

    const where: string[] = [`${quote('tenant_id')} = $1`];
    const parameters: unknown[] = [tenantId];

    if (opts.softDeleteColumn) {
      where.push(`${quote(opts.softDeleteColumn)} IS NULL`);
    }

    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (!def.filterableColumns.includes(key)) {
          throw new BadRequestException(`Filtro não permitido: ${key}`);
        }

        parameters.push(value);
        where.push(`${quote(key)} = $${parameters.length}`);
      }
    }

    let orderBy = '';

    if (params.sort) {
      if (!def.sortableColumns.includes(params.sort)) {
        throw new BadRequestException(`Ordenação não permitida: ${params.sort}`);
      }

      const order = params.order === 'DESC' ? 'DESC' : 'ASC';
      orderBy = ` ORDER BY ${quote(params.sort)} ${order}`;
    }

    const pageSize = clamp(Math.trunc(params.pageSize) || 1, 1, EXPORT_MAX_PAGE_SIZE);
    const page = Math.max(1, Math.trunc(params.page) || 1);

    parameters.push(pageSize);
    const limitIdx = parameters.length;

    parameters.push((page - 1) * pageSize);
    const offsetIdx = parameters.length;

    const sql =
      `SELECT ${selectList} FROM ${quote(def.tableName)} ` +
      `WHERE ${where.join(' AND ')}${orderBy} ` +
      `LIMIT $${limitIdx} OFFSET $${offsetIdx}`;

    return { sql, parameters, columns };
  }
}