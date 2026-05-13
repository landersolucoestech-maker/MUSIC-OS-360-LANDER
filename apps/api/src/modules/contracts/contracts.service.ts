import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
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
    const conditions: SQL[] = [
      eq(contracts.tenant_id, tenantId),
      isNull(contracts.deleted_at),
    ];

    if (query.status)   conditions.push(eq(contracts.status,     query.status));
    if (query.type)     conditions.push(eq(contracts.tipo,       query.type));
    if (query.artistId) conditions.push(eq(contracts.artista_id, query.artistId));
    if (query.search)   conditions.push(ilike(contracts.titulo,  `%${query.search}%`) as SQL);

    const where    = and(...conditions);
    const orderCol = this.resolveOrder(query.orderBy ?? 'created_at');
    const orderDir = query.ascending ? asc(orderCol) : desc(orderCol);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(contracts).where(where).orderBy(orderDir)
        .offset(query.offset ?? 0).limit(query.limit ?? 50),
      this.db.select({ value: count() }).from(contracts).where(where),
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
      .where(and(eq(contracts.tenant_id, tenantId), eq(contracts.id, id), isNull(contracts.deleted_at)))
      .limit(1);

    if (!result) throw new NotFoundException('Contrato não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateContractDto): Promise<Contract> {
    const [created] = await this.db
      .insert(contracts)
      .values({
        tenant_id:   tenantId,
        artista_id:  dto.artistId  ?? null,
        titulo:      dto.titulo,
        tipo:        dto.tipo,
        status:      dto.status    ?? 'rascunho',
        valor:       dto.valor     ?? null,
        exclusivo:   dto.exclusivo ?? false,
        data_inicio: dto.dataInicio ? new Date(dto.dataInicio) : null,
        data_fim:    dto.dataFim    ? new Date(dto.dataFim)    : null,
        arquivo_url: dto.arquivoUrl ?? null,
        observacoes: dto.observacoes ?? null,
        metadata:    dto.metadata  ?? {},
        created_by:  userId,
        updated_by:  userId,
      })
      .returning();

    return created;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateContractDto): Promise<Contract> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(contracts)
      .set({
        ...(dto.titulo      != null && { titulo:      dto.titulo }),
        ...(dto.tipo        != null && { tipo:        dto.tipo }),
        ...(dto.artistId    != null && { artista_id:  dto.artistId }),
        ...(dto.status      != null && { status:      dto.status }),
        ...(dto.valor       != null && { valor:       dto.valor }),
        ...(dto.exclusivo   != null && { exclusivo:   dto.exclusivo }),
        ...(dto.dataInicio  != null && { data_inicio: new Date(dto.dataInicio) }),
        ...(dto.dataFim     != null && { data_fim:    new Date(dto.dataFim) }),
        ...(dto.arquivoUrl  != null && { arquivo_url: dto.arquivoUrl }),
        ...(dto.observacoes != null && { observacoes: dto.observacoes }),
        ...(dto.metadata    != null && { metadata:    dto.metadata }),
        updated_at: new Date(),
        updated_by: userId,
      })
      .where(and(eq(contracts.tenant_id, tenantId), eq(contracts.id, id), isNull(contracts.deleted_at)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(contracts)
      .set({ deleted_at: new Date() })
      .where(and(eq(contracts.tenant_id, tenantId), eq(contracts.id, id)));

    return { deleted: true };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private resolveOrder(field: string): any {
    const map: Record<string, any> = {
      created_at: contracts.created_at,
      updated_at: contracts.updated_at,
      data_fim:   contracts.data_fim,
      titulo:     contracts.titulo,
    };
    return map[field] ?? contracts.created_at;
  }
}
