import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { contractTemplates, ContractTemplate } from '../../database/schema';
import { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto } from './dto/update-contract-template.dto';
import { QueryContractTemplateDto }  from './dto/query-contract-template.dto';

@Injectable()
export class ContractTemplatesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryContractTemplateDto) {
    const conditions: SQL[] = [
      eq(contractTemplates.tenant_id, tenantId),
      isNull(contractTemplates.deleted_at),
    ];
    if (q.type)   conditions.push(eq(contractTemplates.tipo, q.type));
    if (q.search) conditions.push(ilike(contractTemplates.titulo, `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(contractTemplates.created_at) : desc(contractTemplates.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(contractTemplates).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(contractTemplates).where(where),
    ]);

    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ContractTemplate> {
    const [row] = await this.db.select().from(contractTemplates)
      .where(and(eq(contractTemplates.tenant_id, tenantId), eq(contractTemplates.id, id), isNull(contractTemplates.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Template não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateContractTemplateDto): Promise<ContractTemplate> {
    const [row] = await this.db.insert(contractTemplates).values({
      tenant_id:  tenantId,
      titulo:     dto.title,
      tipo:       dto.type,
      conteudo:   dto.content   ?? '',
      variaveis:  dto.variables ?? [],
      ativo:      true,
      created_by: userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateContractTemplateDto): Promise<ContractTemplate> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(contractTemplates).set({
      ...(dto.title     != null && { titulo:    dto.title }),
      ...(dto.type      != null && { tipo:      dto.type }),
      ...(dto.content   != null && { conteudo:  dto.content }),
      ...(dto.variables != null && { variaveis: dto.variables }),
      ...(dto.status    != null && { ativo:     dto.status === 'active' }),
      updated_at: new Date(),
    }).where(and(eq(contractTemplates.tenant_id, tenantId), eq(contractTemplates.id, id), isNull(contractTemplates.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(contractTemplates).set({ deleted_at: new Date() })
      .where(and(eq(contractTemplates.tenant_id, tenantId), eq(contractTemplates.id, id)));
    return { deleted: true };
  }
}
