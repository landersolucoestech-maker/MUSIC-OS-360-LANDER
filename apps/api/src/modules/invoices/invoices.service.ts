import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { invoices, Invoice } from '../../database/schema';
import { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoiceDto } from './dto/invoices.dto';

@Injectable()
export class InvoicesService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryInvoiceDto) {
    const conditions: SQL[] = [eq(invoices.tenantId, tenantId)];
    if (q.status)   conditions.push(eq(invoices.status, q.status));
    if (q.type)     conditions.push(eq(invoices.type, q.type));
    if (q.artistId) conditions.push(eq(invoices.artistId, q.artistId));
    if (q.search)   conditions.push(ilike(invoices.recipientName, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(invoices.createdAt) : desc(invoices.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(invoices).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(invoices).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Invoice> {
    const [row] = await this.db.select().from(invoices)
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id))).limit(1);
    if (!row) throw new NotFoundException('Nota fiscal não encontrada');
    return row;
  }

  async create(tenantId: string, dto: CreateInvoiceDto): Promise<Invoice> {
    const [row] = await this.db.insert(invoices).values({
      tenantId,
      type:          dto.type,
      amount:        String(dto.amount),
      number:        dto.number        ?? null,
      currency:      dto.currency      ?? 'BRL',
      issuerName:    dto.issuerName    ?? null,
      issuerDoc:     dto.issuerDoc     ?? null,
      recipientName: dto.recipientName ?? null,
      recipientDoc:  dto.recipientDoc  ?? null,
      artistId:      dto.artistId      ?? null,
      transactionId: dto.transactionId ?? null,
      issuedAt:      dto.issuedAt      ?? null,
      dueAt:         dto.dueAt         ?? null,
      metadata:      dto.metadata      ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto): Promise<Invoice> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(invoices).set({
      ...(dto.status        != null && { status:        dto.status }),
      ...(dto.number        != null && { number:        dto.number }),
      ...(dto.amount        != null && { amount:        String(dto.amount) }),
      ...(dto.issuerName    != null && { issuerName:    dto.issuerName }),
      ...(dto.issuerDoc     != null && { issuerDoc:     dto.issuerDoc }),
      ...(dto.recipientName != null && { recipientName: dto.recipientName }),
      ...(dto.recipientDoc  != null && { recipientDoc:  dto.recipientDoc }),
      ...(dto.r2Key         != null && { r2Key:         dto.r2Key }),
      ...(dto.issuedAt      != null && { issuedAt:      dto.issuedAt }),
      ...(dto.dueAt         != null && { dueAt:         dto.dueAt }),
      ...(dto.metadata      != null && { metadata:      dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(invoices).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(invoices.tenantId, tenantId), eq(invoices.id, id)));
    return { deleted: true };
  }
}
