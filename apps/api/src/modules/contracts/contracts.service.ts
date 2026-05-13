/**
 * modules/contracts/contracts.service.ts
 *
 * ContractsService — CRUD de contratos com Drizzle ORM + isolamento por tenant.
 */

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { contracts, Contract }   from '../../database/schema';
import { CreateContractDto }     from './dto/create-contract.dto';
import { UpdateContractDto }     from './dto/update-contract.dto';
import { QueryContractDto }      from './dto/query-contract.dto';

@Injectable()
export class ContractsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string, query: QueryContractDto) {
    const conditions: SQL[] = [eq(contracts.tenantId, tenantId)];

    if (query.status)   conditions.push(eq(contracts.status,   query.status));
    if (query.type)     conditions.push(eq(contracts.type,     query.type));
    if (query.artistId) conditions.push(eq(contracts.artistId, query.artistId));
    if (query.search)   conditions.push(ilike(contracts.title, `%${query.search}%`) as SQL);

    const where    = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'created_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db
        .select()
        .from(contracts)
        .where(where)
        .orderBy(orderDir)
        .offset(query.offset ?? 0)
        .limit(query.limit ?? 50),
      this.db
        .select({ value: count() })
        .from(contracts)
        .where(where),
    ]);

    return {
      data: rows,
      meta: { total: Number(total), offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<Contract> {
    const [result] = await this.db
      .select()
      .from(contracts)
      .where(and(eq(contracts.tenantId, tenantId), eq(contracts.id, id)))
      .limit(1);

    if (!result) throw new NotFoundException('Contrato não encontrado');
    return result;
  }

  async create(tenantId: string, _userId: string, dto: CreateContractDto): Promise<Contract> {
    const [created] = await this.db
      .insert(contracts)
      .values({
        tenantId,
        artistId:  dto.artistId  ?? null,
        title:     dto.title,
        type:      dto.type,
        status:    dto.status    ?? 'draft',
        value:     dto.value     ?? null,
        currency:  dto.currency  ?? 'BRL',
        startsAt:  dto.startsAt  ? new Date(dto.startsAt)  : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        signedAt:  dto.signedAt  ? new Date(dto.signedAt)  : null,
        fileUrl:   dto.fileUrl   ?? null,
        parties:   dto.parties   ?? [],
        metadata:  dto.metadata  ?? {},
      })
      .returning();

    return created;
  }

  async update(tenantId: string, _userId: string, id: string, dto: UpdateContractDto): Promise<Contract> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(contracts)
      .set({
        ...(dto.title     != null && { title:     dto.title }),
        ...(dto.type      != null && { type:      dto.type }),
        ...(dto.artistId  != null && { artistId:  dto.artistId }),
        ...(dto.status    != null && { status:    dto.status }),
        ...(dto.value     != null && { value:     dto.value }),
        ...(dto.currency  != null && { currency:  dto.currency }),
        ...(dto.startsAt  != null && { startsAt:  new Date(dto.startsAt) }),
        ...(dto.expiresAt != null && { expiresAt: new Date(dto.expiresAt) }),
        ...(dto.signedAt  != null && { signedAt:  new Date(dto.signedAt) }),
        ...(dto.fileUrl   != null && { fileUrl:   dto.fileUrl }),
        ...(dto.parties   != null && { parties:   dto.parties }),
        ...(dto.metadata  != null && { metadata:  dto.metadata }),
        updatedAt: new Date(),
      })
      .where(and(eq(contracts.tenantId, tenantId), eq(contracts.id, id)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(contracts)
      .set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(contracts.tenantId, tenantId), eq(contracts.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at: contracts.createdAt,
      updated_at: contracts.updatedAt,
      expires_at: contracts.expiresAt,
      title:      contracts.title,
    };
    return map[field] ?? contracts.createdAt;
  }
}
