import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }     from '../../database/database.module';
import { transactions, Transaction } from '../../database/schema';
import { CreateTransactionDto }      from './dto/create-transaction.dto';
import { UpdateTransactionDto }      from './dto/update-transaction.dto';
import { QueryTransactionDto }       from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryTransactionDto) {
    const conditions: SQL[] = [
      eq(transactions.tenant_id, tenantId),
      isNull(transactions.deleted_at),
    ];

    if (query.type)     conditions.push(eq(transactions.tipo,      query.type));
    if (query.category) conditions.push(eq(transactions.categoria, query.category));
    if (query.status)   conditions.push(eq(transactions.status,    query.status));
    if (query.artistId) conditions.push(eq(transactions.artista_id, query.artistId));
    if (query.search)   conditions.push(ilike(transactions.descricao, `%${query.search}%`) as SQL);

    const where    = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'data');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(transactions).where(where).orderBy(orderDir)
        .offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(transactions).where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<Transaction> {
    const [result] = await this.db
      .select()
      .from(transactions)
      .where(and(eq(transactions.tenant_id, tenantId), eq(transactions.id, id), isNull(transactions.deleted_at)))
      .limit(1);

    if (!result) throw new NotFoundException('Transacção não encontrada');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const [created] = await this.db
      .insert(transactions)
      .values({
        tenant_id:  tenantId,
        artista_id: dto.artistId   ?? null,
        tipo:       dto.type,
        categoria:  dto.category,
        valor:      dto.amount,
        descricao:  dto.description ?? null,
        status:     dto.status      ?? 'pendente',
        referencia: dto.referenceId ?? null,
        data:       dto.occurredAt  ? new Date(dto.occurredAt) : new Date(),
        metadata:   dto.metadata    ?? {},
        created_by: userId,
        updated_by: userId,
      })
      .returning();

    return created;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(transactions)
      .set({
        ...(dto.type        != null && { tipo:       dto.type }),
        ...(dto.category    != null && { categoria:  dto.category }),
        ...(dto.amount      != null && { valor:      dto.amount }),
        ...(dto.description != null && { descricao:  dto.description }),
        ...(dto.status      != null && { status:     dto.status }),
        ...(dto.artistId    != null && { artista_id: dto.artistId }),
        ...(dto.referenceId != null && { referencia: dto.referenceId }),
        ...(dto.occurredAt  != null && { data:       new Date(dto.occurredAt) }),
        ...(dto.metadata    != null && { metadata:   dto.metadata }),
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(and(eq(transactions.tenant_id, tenantId), eq(transactions.id, id), isNull(transactions.deleted_at)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(transactions)
      .set({ deleted_at: new Date() })
      .where(and(eq(transactions.tenant_id, tenantId), eq(transactions.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      data:       transactions.data,
      created_at: transactions.created_at,
      updated_at: transactions.updated_at,
      valor:      transactions.valor,
    };
    return map[field] ?? transactions.data;
  }
}
