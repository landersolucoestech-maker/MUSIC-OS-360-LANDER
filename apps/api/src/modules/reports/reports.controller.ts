/**
 * modules/reports/reports.controller.ts
 *
 * FASE 1 — expõe o inventário entity-driven da Central de Relatórios.
 * Apenas LEITURA de metadados (sem import/export ainda).
 */
import { BadRequestException, Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import type { Response } from 'express';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { EntityMetadataService } from './entity-metadata.service';
import { ReportEntityDefinitionService } from './definitions/report-entity-definition.service';
import { ReportTableGuardService } from './report-table-guard.service';
import { ExportEngineService } from './export/export-engine.service';
import { ImportEngineService } from './import/import-engine.service';
import { ImportCommitService, type ImportCommitResult } from './import/import-commit.service';
import { EXPORT_DEFAULT_PAGE_SIZE, type ExportFormat, type ExportQueryParams } from './export/export.types';
import type { ImportValidationResult } from './import/import.types';
import type { EntitiesInventory } from './entity-metadata.types';
import type { ReportEntityDefinition } from './definitions/report-entity-definition.types';

interface ImportValidateBody {
  filename: string;
  contentBase64?: string;
  content?: string;
}

const RESERVED_QUERY_KEYS = new Set(['format', 'columns', 'sort', 'order', 'page', 'pageSize']);

function parseExportParams(query: Record<string, string | string[] | undefined>): ExportQueryParams {
  const str = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  const filters: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    if (RESERVED_QUERY_KEYS.has(k)) continue;
    const val = str(v);
    if (val !== undefined) filters[k] = val;
  }
  const columnsRaw = str(query['columns']);
  return {
    format: (str(query['format']) ?? 'json') as ExportFormat,
    columns: columnsRaw ? columnsRaw.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
    filters: Object.keys(filters).length ? filters : undefined,
    sort: str(query['sort']),
    order: str(query['order'])?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC',
    page: Number(str(query['page']) ?? 1),
    pageSize: Number(str(query['pageSize']) ?? EXPORT_DEFAULT_PAGE_SIZE),
  };
}

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(
    private readonly entityMetadata: EntityMetadataService,
    private readonly definitions: ReportEntityDefinitionService,
    private readonly tableGuard: ReportTableGuardService,
    private readonly exportEngine: ExportEngineService,
    private readonly importEngine: ImportEngineService,
    private readonly importCommit: ImportCommitService,
  ) {}

  @Get('entities')
  @RequireRole('admin')
  @ApiOperation({ summary: 'Inventário classificado das entidades persistidas (metadata)' })
  async entities(): Promise<EntitiesInventory> {
    const inventory = this.entityMetadata.scan();
    const tables = await this.tableGuard.existingTables();
    if (!tables) return inventory; // sem verificação de banco — devolve metadata pura

    // Overlay de disponibilidade: entidade sem tabela física nunca é reportável
    // (evita export/import 500). Mantida no inventário com available=false + risco.
    for (const e of inventory.entities) {
      const available = tables.has(e.tableName);
      e.available = available;
      if (!available) {
        if (e.reportable) e.reportable = false;
        if (!e.risks.includes('TABLE_NOT_AVAILABLE')) e.risks.push('TABLE_NOT_AVAILABLE');
      }
    }
    inventory.reportableEntities = inventory.entities.filter((e) => e.reportable).length;
    inventory.nonReportableEntities = inventory.entities.length - inventory.reportableEntities;
    return inventory;
  }

  @Get('definitions')
  @RequireRole('admin')
  @ApiOperation({ summary: 'Contratos ReportEntityDefinition das entidades reportáveis' })
  async reportDefinitions(): Promise<ReportEntityDefinition[]> {
    const defs = this.definitions.getDefinitions();
    const tables = await this.tableGuard.existingTables();
    if (!tables) return defs;
    // Só expõe contrato de entidade com tabela física (não oferece export/import 500).
    return defs.filter((d) => tables.has(d.tableName));
  }

  @Get('entities/:entity/export')
  @RequireRole('manager')
  @Audit('report.exported')
  @ApiOperation({ summary: 'Exporta uma entidade reportável (JSON/CSV/XLSX) — entity-driven, tenant-safe' })
  async export(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { userId: string },
    @Param('entity') entity: string,
    @Query() query: Record<string, string | string[] | undefined>,
    @Res() res: Response,
  ): Promise<void> {
    const params = parseExportParams(query);
    const result = await this.exportEngine.export(entity, params, tenant?.id, user?.userId ?? 'unknown');

    res.setHeader('Content-Type', result.contentType);
    if (result.format === 'json') {
      res.status(200).json(result.body);
      return;
    }
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(200).send(result.body);
  }

  @Post('entities/:entity/import/validate')
  @RequireRole('manager')
  @ApiOperation({ summary: 'Valida um arquivo de importação (preview) — SEM persistir (FASE 2.3A)' })
  importValidate(
    @CurrentTenant() tenant: { id: string },
    @Param('entity') entity: string,
    @Body() body: ImportValidateBody,
  ): Promise<ImportValidationResult> {
    if (!body?.filename || (!body.contentBase64 && body.content === undefined)) {
      throw new BadRequestException('Envie filename e content (texto) ou contentBase64.');
    }
    const content = body.contentBase64
      ? Buffer.from(body.contentBase64, 'base64')
      : Buffer.from(body.content ?? '', 'utf8');
    return this.importEngine.validateFile(entity, { filename: body.filename, content }, tenant?.id);
  }

  @Post('entities/:entity/import/commit')
  @RequireRole('manager')
  @Audit('report.import.committed')
  @ApiOperation({ summary: 'Commit transacional da importação (create-only, tudo-ou-nada) — FASE 2.3B' })
  async importCommitEndpoint(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { userId: string },
    @Param('entity') entity: string,
    @Body() body: ImportValidateBody,
  ): Promise<ImportCommitResult> {
    if (!body?.filename || (!body.contentBase64 && body.content === undefined)) {
      throw new BadRequestException('Envie filename e content (texto) ou contentBase64.');
    }
    const content = body.contentBase64
      ? Buffer.from(body.contentBase64, 'base64')
      : Buffer.from(body.content ?? '', 'utf8');
    return this.importCommit.commit(entity, { filename: body.filename, content }, tenant?.id, user?.userId ?? 'unknown');
  }
}
