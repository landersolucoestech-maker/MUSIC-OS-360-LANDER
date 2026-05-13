/**
 * modules/transactions/transactions.service.ts
 *
 * TransactionsService — CRUD de transacções financeiras com Drizzle ORM + isolamento por tenant.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }       from '../../database/database.module';
import { transactions, Transaction }   from '../../database/schema';
import { CreateTransactionDto }        from './dto/create-transaction.dto';
import { UpdateTransactionDto }        from './dto/update-transaction.dto';
import { QueryTransactionDto }         from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryTransactionDto) {
    const conditions: SQL[] = [eq(transactions.tenantId, tenantId)];

    if (query.type)     conditions.push(eq(transactions.type,     query.type));
    if (query.category) conditions.push(eq(transactions.category, query.category));
    if (query.status)   conditions.push(eq(transactions.status,   query.status));
    if (query.artistId) conditions.push(eq(transactions.artistId, query.artistId));
    if (query.search)   conditions.push(ilike(transactions.description, `%${query.search}%`) as SQL);

    const where    = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'occurred_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(transactions)
        .where(where)
        .orderBy(orderDir)
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db
        .select({ value: count() })
        .from(transactions)
        .where(where),
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
      .where(and(eq(transactions.tenantId, tenantId), eq(transactions.id, id)))
      .limit(1);

    if (!result) throw new NotFoundException('Transacção não encontrada');
    return result;
  }

  async create(tenantId: string, _userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const [created] = await this.db
      .insert(transactions)
      .values({
        tenantId,
        artistId:    dto.artistId    ?? null,
        type:        dto.type,
        category:    dto.category,
        amount:      dto.amount,
        currency:    dto.currency    ?? 'BRL',
        description: dto.description ?? null,
        status:      dto.status      ?? 'pending',
        referenceId: dto.referenceId ?? null,
        occurredAt:  dto.occurredAt  ? new Date(dto.occurredAt) : new Date(),
        metadata:    dto.metadata    ?? {},
      })
      .returning();

    return created;
  }

  async update(tenantId: string, _userId: string, id: string, dto: UpdateTransactionDto): Promise<Transaction> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(transactions)
      .set({
        ...(dto.type        != null && { type:        dto.type }),
        ...(dto.category    != null && { category:    dto.category }),
        ...(dto.amount      != null && { amount:      dto.amount }),
        ...(dto.currency    != null && { currency:    dto.currency }),
        ...(dto.description != null && { description: dto.description }),
        ...(dto.status      != null && { status:      dto.status }),
        ...(dto.artistId    != null && { artistId:    dto.artistId }),
        ...(dto.referenceId != null && { referenceId: dto.referenceId }),
        ...(dto.occurredAt  != null && { occurredAt:  new Date(dto.occurredAt) }),
        ...(dto.metadata    != null && { metadata:    dto.metadata }),
        updatedAt: new Date(),
      })
      .where(and(eq(transactions.tenantId, tenantId), eq(transactions.id, id)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(transactions)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(transactions.tenantId, tenantId), eq(transactions.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      occurred_at: transactions.occurredAt,
      created_at:  transactions.createdAt,
      updated_at:  transactions.updatedAt,
      amount:      transactions.amount,
    };
    return map[field] ?? transactions.occurredAt;
  }
}
