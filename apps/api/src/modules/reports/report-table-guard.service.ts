/**
 * modules/reports/report-table-guard.service.ts
 *
 * Guarda de segurança da Central de Relatórios: garante que uma entidade só é
 * exportada/importada quando sua tabela física EXISTE no banco. Entidades
 * declaradas (ALL_ENTITIES) mas sem tabela materializada (ex.: crm_contacts,
 * pipelines — schema só no dump consolidado) deixam de retornar 500 e passam a
 * retornar erro controlado 422 (UnprocessableEntity), sem stack trace.
 *
 * A lista de tabelas existentes é consultada uma única vez e cacheada (read-only,
 * information_schema). Quando o DataSource não está disponível, a guarda degrada
 * de forma segura (não bloqueia indevidamente — o engine já trata banco ausente).
 */
import { Injectable, Inject, Optional, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import type { EntityReport } from './entity-metadata.types';
import { REPORT_MODULE_REGISTRY_BY_TABLE } from './report-module-registry';

@Injectable()
export class ReportTableGuardService {
  private cache: Promise<Set<string> | null> | null = null;

  constructor(@Inject(DATA_SOURCE) @Optional() private readonly ds: DataSource | null) {}

  /** Conjunto de tabelas físicas do schema public (cacheado). `null` se indisponível. */
  existingTables(): Promise<Set<string> | null> {
    if (this.cache) return this.cache;
    this.cache = this.load();
    return this.cache;
  }

  /** Limpa o cache (após migrations, em testes). */
  invalidate(): void {
    this.cache = null;
  }

  private async load(): Promise<Set<string> | null> {
    if (!this.ds) return null;
    try {
      const rows = (await this.ds.query(
        `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
      )) as { tablename: string }[];
      return new Set(rows.map((r) => r.tablename));
    } catch {
      // Falha de introspecção não deve mascarar o fluxo; degrade seguro.
      return null;
    }
  }

  /**
   * Valida que a entidade pode ser exportada/importada com segurança.
   * Lança 422 (sem 500/stack trace) quando:
   *  - metadata da entidade não existe;
   *  - a tabela física não existe no banco;
   *  - a entidade é multi-tenant mas a tabela não possui coluna tenant_id.
   */
  async assertTableUsable(tableName: string, report: EntityReport | undefined): Promise<void> {
    if (!report) {
      throw new UnprocessableEntityException(
        `Entidade "${tableName}" não possui metadados registrados e não pode ser processada.`,
      );
    }
    // Relatório computado (ex.: Contabilidade/accounting_summary): não tem
    // tabela física própria — a validação de "tabela existe" não se aplica.
    if (REPORT_MODULE_REGISTRY_BY_TABLE.get(tableName)?.computed) return;

    const tables = await this.existingTables();
    if (!tables) return; // não foi possível verificar — não bloqueia (engine trata DB ausente)

    if (!tables.has(tableName)) {
      throw new UnprocessableEntityException(
        `A entidade "${tableName}" está registrada mas não possui tabela física no banco. ` +
          `Exportação/importação indisponível até a tabela ser criada por migration.`,
      );
    }

    if (report.hasTenantId) {
      const hasTenantColumn = report.columns.some((c) => c.isTenantId);
      if (!hasTenantColumn) {
        throw new UnprocessableEntityException(
          `A entidade multi-tenant "${tableName}" não possui coluna tenant_id e não pode ser isolada com segurança.`,
        );
      }
    }
  }
}
