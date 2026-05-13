import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, or, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { clients, Client }       from '../../database/schema';
import { CreateClientDto, UpdateClientDto, QueryClientDto } from './dto/clients.dto';

@Injectable()
export class ClientsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryClientDto) {
    const conditions: SQL[] = [
      eq(clients.tenant_id, tenantId),
      isNull(clients.deleted_at),
    ];
    if (q.status) conditions.push(eq(clients.status, q.status));
    if (q.search) conditions.push(or(ilike(clients.nome, `%${q.search}%`)) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(clients.created_at) : desc(clients.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(clients).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(clients).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Client> {
    const [row] = await this.db.select().from(clients)
      .where(and(eq(clients.tenant_id, tenantId), eq(clients.id, id), isNull(clients.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Cliente não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateClientDto): Promise<Client> {
    const [row] = await this.db.insert(clients).values({
      tenant_id:          tenantId,
      nome:               dto.name,
      tipo_pessoa:        dto.type             ?? 'pessoa_juridica',
      segmento:           dto.category         ?? null,
      responsavel:        null,
      email_encrypted:    dto.email            ?? null,
      telefone_encrypted: dto.phone            ?? null,
      endereco:           dto.address ? JSON.stringify(dto.address) : null,
      cidade:             null,
      estado:             null,
      observacoes:        null,
      metadata:           dto.metadata ?? {},
      created_by:         userId,
      updated_by:         userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateClientDto): Promise<Client> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(clients).set({
      ...(dto.name     != null && { nome:               dto.name }),
      ...(dto.type     != null && { tipo_pessoa:        dto.type }),
      ...(dto.category != null && { segmento:           dto.category }),
      ...(dto.status   != null && { status:             dto.status }),
      ...(dto.email    != null && { email_encrypted:    dto.email }),
      ...(dto.phone    != null && { telefone_encrypted: dto.phone }),
      ...(dto.address  != null && { endereco:           JSON.stringify(dto.address) }),
      ...(dto.metadata != null && { metadata:           dto.metadata }),
      updated_at: new Date(),
      updated_by: userId,
    }).where(and(eq(clients.tenant_id, tenantId), eq(clients.id, id), isNull(clients.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(clients).set({ deleted_at: new Date() })
      .where(and(eq(clients.tenant_id, tenantId), eq(clients.id, id)));
    return { deleted: true };
  }
}
