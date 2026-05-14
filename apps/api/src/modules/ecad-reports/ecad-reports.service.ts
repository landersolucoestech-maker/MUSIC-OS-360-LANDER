import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc, count } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }   from '../../database/database.module';
import { ecadReports, EcadReport } from '../../database/schema';
import { CreateEcadReportDto }     from './dto/create-ecad-report.dto';
import { UpdateEcadReportDto }     from './dto/update-ecad-report.dto';

@Injectable()
export class EcadReportsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: { periodo?: string; status?: string; offset?: number; limit?: number } = {}) {
    const conds = [eq(ecadReports.tenant_id, tenantId), isNull(ecadReports.deleted_at)];
    if (query.periodo) conds.push(eq(ecadReports.periodo, query.periodo));
    if (query.status)  conds.push(eq(ecadReports.status, query.status));
    const where = and(...conds);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(ecadReports).where(where)
        .orderBy(desc(ecadReports.created_at))
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(ecadReports).where(where),
    ]);
    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<EcadReport> {
    const [result] = await this.db
      .select()
      .from(ecadReports)
      .where(and(eq(ecadReports.tenant_id, tenantId), eq(ecadReports.id, id), isNull(ecadReports.deleted_at)))
      .limit(1);
    if (!result) throw new NotFoundException('Relatório ECAD não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateEcadReportDto): Promise<EcadReport> {
    const [created] = await this.db
      .insert(ecadReports)
      .values({
        tenant_id:     tenantId,
        periodo:       dto.periodo,
        tipo:          dto.tipo,
        obra_id:       dto.obra_id       ?? null,
        valor_bruto:   dto.valor_bruto   ?? null,
        valor_liquido: dto.valor_liquido ?? null,
        status:        dto.status        ?? 'pendente',
        arquivo_url:   dto.arquivo_url   ?? null,
        metadata:      dto.metadata      ?? {},
        created_by:    userId,
      })
      .returning();
    return created;
  }

  async update(tenantId: string, id: string, dto: UpdateEcadReportDto): Promise<EcadReport> {
    await this.findById(tenantId, id);
    const [updated] = await this.db
      .update(ecadReports)
      .set({
        ...(dto.periodo       != null && { periodo:       dto.periodo }),
        ...(dto.tipo          != null && { tipo:          dto.tipo }),
        ...(dto.obra_id       != null && { obra_id:       dto.obra_id }),
        ...(dto.valor_bruto   != null && { valor_bruto:   dto.valor_bruto }),
        ...(dto.valor_liquido != null && { valor_liquido: dto.valor_liquido }),
        ...(dto.status        != null && { status:        dto.status }),
        ...(dto.arquivo_url   != null && { arquivo_url:   dto.arquivo_url }),
        ...(dto.metadata      != null && { metadata:      dto.metadata }),
        updated_at: new Date(),
      })
      .where(and(eq(ecadReports.tenant_id, tenantId), eq(ecadReports.id, id), isNull(ecadReports.deleted_at)))
      .returning();
    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);
    await this.db
      .update(ecadReports)
      .set({ deleted_at: new Date() })
      .where(and(eq(ecadReports.tenant_id, tenantId), eq(ecadReports.id, id)));
    return { deleted: true };
  }
}
