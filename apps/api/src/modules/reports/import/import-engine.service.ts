/**
 * modules/reports/import/import-engine.service.ts  ·  FASE 2.3A
 * Orquestra: valida entidade/contrato/tenant → parse → mapping → validação →
 * preview. NENHUMA persistência (commit é a FASE 2.3B).
 */
import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { EntityMetadataService } from '../entity-metadata.service';
import { ReportEntityDefinitionService } from '../definitions/report-entity-definition.service';
import { ImportParserService } from './import-parser.service';
import { ImportMapperService } from './import-mapper.service';
import { ImportValidationService } from './import-validation.service';
import { ReportTableGuardService } from '../report-table-guard.service';
import type { FieldTypeMeta, ImportValidationResult } from './import.types';

@Injectable()
export class ImportEngineService {
  constructor(
    private readonly metadata: EntityMetadataService,
    private readonly definitions: ReportEntityDefinitionService,
    private readonly parser: ImportParserService,
    private readonly mapper: ImportMapperService,
    private readonly validator: ImportValidationService,
    private readonly tableGuard: ReportTableGuardService,
  ) {}

  /** Upload → parse → mapping → preview → validação. Sem persistência. */
  async validateFile(
    entity: string,
    file: { filename: string; content: Buffer },
    tenantId: string | undefined,
  ): Promise<ImportValidationResult> {
    if (!tenantId) throw new ForbiddenException('Tenant não identificado');

    const report = this.metadata.scan().entities.find((e) => e.tableName === entity);
    if (!report) throw new NotFoundException(`Entidade não encontrada: ${entity}`);
    if (!report.reportable) throw new NotFoundException(`Entidade não é reportável: ${entity}`);

    // Guarda: tabela física precisa existir (422 controlado, nunca 500).
    await this.tableGuard.assertTableUsable(entity, report);

    const def = this.definitions.getDefinition(entity);
    if (!def) throw new NotFoundException(`Contrato de relatório ausente: ${entity}`);
    if (!def.supportsImport) throw new BadRequestException(`Entidade não suporta importação: ${entity}`);

    const typeMap: Record<string, FieldTypeMeta> = {};
    for (const c of report.columns) {
      typeMap[c.name] = { type: c.type, isEnum: c.isEnum, enumValues: c.enumValues, nullable: c.nullable };
    }

    const parsed = this.parser.parse(file.filename, file.content);
    const headerMapping = this.mapper.build(def, parsed.headers);
    return this.validator.validate(def, typeMap, headerMapping, parsed.rows, entity);
  }
}
