import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { contractTemplates, ContractTemplate } from '../../database/schema';
import { CreateContractTemplateDto } from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto } from './dto/update-contract-template.dto';
import { QueryContractTemplateDto }  from './dto/query-contract-template.dto';

@Injectable()
export class ContractTemplatesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryContractTemplateDto) {
    const conditions: SQL[] = [eq(contractTemplates.tenantId, tenantId)];
    if (q.status) conditions.push(eq(contractTemplates.status, q.status));
    if (q.type)   conditions.push(eq(contractTemplates.type, q.type));
    if (q.search) conditions.push(ilike(contractTemplates.title, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(contractTemplates.createdAt) : desc(contractTemplates.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(contractTemplates).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(contractTemplates).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ContractTemplate> {
    const [row] = await this.db.select().from(contractTemplates)
      .where(and(eq(contractTemplates.tenantId, tenantId), eq(contractTemplates.id, id))).limit(1);
    if (!row) throw new NotFoundException('Template não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateContractTemplateDto): Promise<ContractTemplate> {
    const [row] = await this.db.insert(contractTemplates).values({
      tenantId, title: dto.title, type: dto.type,
      content: dto.content ?? null, variables: dto.variables ?? [], metadata: dto.metadata ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateContractTemplateDto): Promise<ContractTemplate> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(contractTemplates).set({
      ...(dto.title    != null && { title:    dto.title }),
      ...(dto.type     != null && { type:     dto.type }),
      ...(dto.status   != null && { status:   dto.status }),
      ...(dto.content  != null && { content:  dto.content }),
      ...(dto.variables != null && { variables: dto.variables }),
      ...(dto.metadata != null && { metadata: dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(contractTemplates.tenantId, tenantId), eq(contractTemplates.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(contractTemplates).set({ status: 'archived', updatedAt: new Date() })
      .where(and(eq(contractTemplates.tenantId, tenantId), eq(contractTemplates.id, id)));
    return { deleted: true };
  }
}
