/**
 * modules/reports/services/reports-source.ts
 *
 * Gate de exposição dos dados de Relatórios.
 * Em produção (IS_PROD): empty arrays + KPIs zerados. Backend ainda não tem
 * endpoint real de imports/exports (jobs queue), então mostrar dados fictícios
 * seria enganoso. UI deve renderizar empty state real.
 */
import { IS_PROD } from "@/shared/lib/env";
import type { ImportJob, ExportJob, AuditLogEntry } from "../types";
import {
  MOCK_IMPORT_JOBS, MOCK_EXPORT_JOBS, MOCK_AUDIT_LOG,
} from "./mock-data";

export const REPORTS_DATA_IS_MOCK: boolean = !IS_PROD;

export const REPORT_IMPORT_JOBS: ImportJob[] = IS_PROD ? [] : MOCK_IMPORT_JOBS;
export const REPORT_EXPORT_JOBS: ExportJob[] = IS_PROD ? [] : MOCK_EXPORT_JOBS;
export const REPORT_AUDIT_LOG:   AuditLogEntry[] = IS_PROD ? [] : MOCK_AUDIT_LOG;

const EMPTY_KPIS = {
  totalImports: 0,
  totalExports: 0,
  importErrors: 0,
  successRate:  0,
  totalRecordsImported: 0,
  totalRecordsExported: 0,
};

export const REPORT_OVERVIEW_KPIS = IS_PROD ? EMPTY_KPIS : {
  totalImports: MOCK_IMPORT_JOBS.length,
  totalExports: MOCK_EXPORT_JOBS.length,
  importErrors: MOCK_IMPORT_JOBS.reduce((a, j) => a + (j.errorCount ?? 0), 0),
  successRate:  MOCK_IMPORT_JOBS.length === 0
    ? 0
    : Math.round(
        (MOCK_IMPORT_JOBS.filter((j) => j.status === "done").length /
          MOCK_IMPORT_JOBS.length) *
          100,
      ),
  totalRecordsImported: MOCK_IMPORT_JOBS.reduce((a, j) => a + (j.processedRows ?? 0), 0),
  totalRecordsExported: MOCK_EXPORT_JOBS
    .filter((j) => j.status === "done")
    .reduce((a, j) => a + (j.totalRows ?? 0), 0),
};
