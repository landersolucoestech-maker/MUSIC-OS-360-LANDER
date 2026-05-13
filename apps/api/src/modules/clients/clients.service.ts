import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, or, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { clients, Client } from '../../database/schema';
import { CreateClientDto, UpdateClientDto, QueryClientDto } from './dto/clients.dto';

@Injectable()
export class ClientsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryClientDto) {
    const conditions: SQL[] = [eq(clients.tenantId, tenantId)];
    if (q.status)   conditions.push(eq(clients.status, q.status));
    if (q.type)     conditions.push(eq(clients.type, q.type));
    if (q.category) conditions.push(eq(clients.category, q.category));
    if (q.search)   conditions.push(or(ilike(clients.name, `%${q.search}%`), ilike(clients.email, `%${q.search}%`)) as SQL);
    const where = and(...conditions);
    const col   = q.ascending ? asc(clients.createdAt) : desc(clients.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(clients).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(clients).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Client> {
    const [row] = await this.db.select().from(clients)
      .where(and(eq(clients.tenantId, tenantId), eq(clients.id, id))).limit(1);
    if (!row) throw new NotFoundException('Cliente não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateClientDto): Promise<Client> {
    const [row] = await this.db.insert(clients).values({
      tenantId, name: dto.name,
      type:      dto.type      ?? 'person',
      category:  dto.category  ?? null,
      email:     dto.email     ?? null,
      phone:     dto.phone     ?? null,
      document:  dto.document  ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      address:   dto.address   ?? {},
      metadata:  dto.metadata  ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateClientDto): Promise<Client> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(clients).set({
      ...(dto.name      != null && { name:      dto.name }),
      ...(dto.type      != null && { type:      dto.type }),
      ...(dto.category  != null && { category:  dto.category }),
      ...(dto.status    != null && { status:    dto.status }),
      ...(dto.email     != null && { email:     dto.email }),
      ...(dto.phone     != null && { phone:     dto.phone }),
      ...(dto.document  != null && { document:  dto.document }),
      ...(dto.avatarUrl != null && { avatarUrl: dto.avatarUrl }),
      ...(dto.address   != null && { address:   dto.address }),
      ...(dto.metadata  != null && { metadata:  dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(clients.tenantId, tenantId), eq(clients.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(clients).set({ status: 'inactive', updatedAt: new Date() })
      .where(and(eq(clients.tenantId, tenantId), eq(clients.id, id)));
    return { deleted: true };
  }
}
