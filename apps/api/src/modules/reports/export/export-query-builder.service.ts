/**
 * modules/reports/export/export-query-builder.service.ts  ·  FASE 2.2
 *
 * Constrói a consulta de exportação EXCLUSIVAMENTE a partir do contrato
 * (ReportEntityDefinition). Sem SELECT *, sem heurística, sem if/switch por
 * entidade. tenant_id SEMPRE aplicado e nunca vem do request. Colunas, filtros e
 * ordenação são validados contra o contrato (whitelist). Colunas sensíveis são
 * bloqueadas. Valores são sempre parametrizados.
 */
import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';
import { EXPORT_MAX_PAGE_SIZE, type BuiltExportQuery, type ExportQueryParams } from './export.types';

// Identificadores são SEMPRE quotados ("name") antes de irem ao SQL, então
// letras maiúsculas são seguras: aceita colunas físicas camelCase legadas
// (ex.: leads."tipoServico", leads."origemLead") sem abrir brecha de injeção.
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

@Injectable()
export class ExportQueryBuilderService {
  build(
    def: ReportEntityDefinition,
    params: ExportQueryParams,
    tenantId: string,
    opts: { softDeleteColumn?: string } = {},
  ): BuiltExportQuery {
    // tenant_id obrigatório — nunca exporta sem isolamento.
    if (!tenantId) throw new ForbiddenException('Tenant não identificado para exportação');

    // ── Colunas (whitelist do contrato; sensíveis bloqueadas) ─────────────────
    const requested = params.columns && params.columns.length > 0 ? params.columns : def.exportableColumns;
    for (const c of requested) {
      if (def.sensitiveColumns.includes(c)) throw new BadRequestException(`Coluna sensível não pode ser exportada: ${c}`);
      if (!def.exportableColumns.includes(c)) throw new BadRequestException(`Coluna não exportável: ${c}`);
    }
    const columns = [...requested];
    const selectList = columns.map(quote).join(', ');

    // ── WHERE: tenant sempre; soft delete quando houver ───────────────────────
    const where: string[] = [`${quote('tenant_id')} = $1`];
    const parameters: unknown[] = [tenantId];
    if (opts.softDeleteColumn) where.push(`${quote(opts.softDeleteColumn)} IS NULL`);

    // ── Filtros (somente filterableColumns) ───────────────────────────────────
    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        if (!def.filterableColumns.includes(key)) throw new BadRequestException(`Filtro não permitido: ${key}`);
        parameters.push(value);
        where.push(`${quote(key)} = $${parameters.length}`);
      }
    }

    // ── Ordenação (somente sortableColumns) ───────────────────────────────────
    let orderBy = '';
    if (params.sort) {
      if (!def.sortableColumns.includes(params.sort)) throw new BadRequestException(`Ordenação não permitida: ${params.sort}`);
      const order = params.order === 'DESC' ? 'DESC' : 'ASC';
      orderBy = ` ORDER BY ${quote(params.sort)} ${order}`;
    }

    // ── Paginação (limites obrigatórios) ──────────────────────────────────────
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
