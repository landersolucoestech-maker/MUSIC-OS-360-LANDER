import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { invoices, Invoice }     from '../../database/schema';
import { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoiceDto } from './dto/invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryInvoiceDto) {
    const conditions: SQL[] = [
      eq(invoices.tenant_id, tenantId),
      isNull(invoices.deleted_at),
    ];
    if (q.status) conditions.push(eq(invoices.status, q.status));
    if (q.type)   conditions.push(eq(invoices.tipo,   q.type));
    if (q.search) conditions.push(ilike(invoices.tomador_nome, `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(invoices.created_at) : desc(invoices.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(invoices).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(invoices).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Invoice> {
    const [row] = await this.db.select().from(invoices)
      .where(and(eq(invoices.tenant_id, tenantId), eq(invoices.id, id), isNull(invoices.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Nota fiscal não encontrada');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const [row] = await this.db.insert(invoices).values({
      tenant_id:             tenantId,
      tipo:                  dto.type,
      valor:                 dto.amount != null ? String(dto.amount) : '0',
      numero:                dto.number        ?? null,
      tomador_nome:          dto.recipientName ?? null,
      tomador_doc_encrypted: dto.recipientDoc  ?? null,
      descricao:             null,
      data_emissao:          dto.issuedAt ? new Date(dto.issuedAt) : null,
      data_vencimento:       dto.dueAt    ? new Date(dto.dueAt)    : null,
      metadata:              dto.metadata ?? {},
      created_by:            userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(invoices).set({
      ...(dto.status        != null && { status:                dto.status }),
      ...(dto.number        != null && { numero:                dto.number }),
      ...(dto.amount        != null && { valor:                 String(dto.amount) }),
      ...(dto.recipientName != null && { tomador_nome:          dto.recipientName }),
      ...(dto.recipientDoc  != null && { tomador_doc_encrypted: dto.recipientDoc }),
      ...(dto.issuedAt      != null && { data_emissao:          new Date(dto.issuedAt) }),
      ...(dto.dueAt         != null && { data_vencimento:       new Date(dto.dueAt) }),
      ...(dto.metadata      != null && { metadata:              dto.metadata }),
      updated_at: new Date(),
    }).where(and(eq(invoices.tenant_id, tenantId), eq(invoices.id, id), isNull(invoices.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(invoices).set({ deleted_at: new Date() })
      .where(and(eq(invoices.tenant_id, tenantId), eq(invoices.id, id)));
    return { deleted: true };
  }
}
