import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { users, User } from '../../database/schema';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryUserDto) {
    const conditions: SQL[] = [eq(users.tenantId, tenantId)];
    if (q.status) conditions.push(eq(users.status, q.status));
    if (q.role)   conditions.push(eq(users.role,   q.role));
    if (q.search) conditions.push(ilike(users.email, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(users.createdAt) : desc(users.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(users).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(users).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<User> {
    const [row] = await this.db.select().from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id))).limit(1);
    if (!row) throw new NotFoundException('Utilizador não encontrado');
    return row;
  }

  async findByClerkId(tenantId: string, clerkId: string): Promise<User | null> {
    const [row] = await this.db.select().from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.clerkId, clerkId))).limit(1);
    return row ?? null;
  }

  async create(tenantId: string, dto: CreateUserDto): Promise<User> {
    const existing = await this.findByClerkId(tenantId, dto.clerkId);
    if (existing) throw new ConflictException('Utilizador já existe neste tenant');
    const [row] = await this.db.insert(users).values({
      tenantId,
      clerkId:  dto.clerkId,
      email:    dto.email,
      fullName: dto.fullName  ?? null,
      avatarUrl: dto.avatarUrl ?? null,
      role:     dto.role,
      metadata: dto.metadata  ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<User> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(users).set({
      ...(dto.fullName  != null && { fullName:  dto.fullName }),
      ...(dto.avatarUrl != null && { avatarUrl: dto.avatarUrl }),
      ...(dto.role      != null && { role:      dto.role }),
      ...(dto.status    != null && { status:    dto.status }),
      ...(dto.metadata  != null && { metadata:  dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(users.tenantId, tenantId), eq(users.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(users).set({ status: 'inactive', isActive: false, updatedAt: new Date() })
      .where(and(eq(users.tenantId, tenantId), eq(users.id, id)));
    return { deleted: true };
  }
}
