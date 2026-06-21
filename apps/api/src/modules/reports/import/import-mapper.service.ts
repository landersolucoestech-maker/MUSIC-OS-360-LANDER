/**
 * modules/reports/import/import-mapper.service.ts  ·  FASE 2.3A
 * Resolve cada cabeçalho do arquivo para uma coluna IMPORTÁVEL do contrato.
 * Aceita rótulo pt-BR (round-trip do export), nome técnico ou camelCase.
 * tenant_id nunca é importável → marcado como ignorado.
 */
import { Injectable } from '@nestjs/common';
import { getFieldLabelPtBr, normalizeFieldKey } from '../i18n/field-labels.pt-br';
import type { ReportEntityDefinition } from '../definitions/report-entity-definition.types';

export interface HeaderMapping {
  mapping: Record<string, string | null>;
  unknownColumns: string[];
  ignoredColumns: string[];
}

@Injectable()
export class ImportMapperService {
  build(def: ReportEntityDefinition, headers: string[]): HeaderMapping {
    // Índices de resolução a partir das colunas importáveis do contrato.
    const byLabel = new Map<string, string>();
    const byCanonical = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const col of def.importableColumns) {
      byLabel.set(getFieldLabelPtBr(col).toLowerCase(), col);
      byCanonical.set(normalizeFieldKey(col).toLowerCase(), col);
      byName.set(col.toLowerCase(), col);
    }

    const mapping: Record<string, string | null> = {};
    const unknownColumns: string[] = [];
    const ignoredColumns: string[] = [];

    for (const header of headers) {
      const h = header.trim();
      const hl = h.toLowerCase();
      // tenant_id (em qualquer forma) nunca é importado — segurança multi-tenant.
      if (hl === 'tenant_id' || normalizeFieldKey(h).toLowerCase() === 'tenantid' || hl === 'tenant') {
        mapping[header] = null;
        ignoredColumns.push(header);
        continue;
      }
      const col =
        byName.get(hl) ??
        byLabel.get(hl) ??
        byCanonical.get(normalizeFieldKey(h).toLowerCase()) ??
        null;
      mapping[header] = col;
      if (!col) unknownColumns.push(header);
    }

    return { mapping, unknownColumns, ignoredColumns };
  }
}
