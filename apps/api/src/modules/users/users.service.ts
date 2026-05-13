import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { orgMembers, OrgMember } from '../../database/schema';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto/users.dto';

@Injectable()
export class UsersService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryUserDto) {
    const conditions: SQL[] = [eq(orgMembers.tenant_id, tenantId)];
    if (q.role)   conditions.push(eq(orgMembers.role,  q.role));
    if (q.search) conditions.push(ilike(orgMembers.email, `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(orgMembers.created_at) : desc(orgMembers.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(orgMembers).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(orgMembers).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<OrgMember> {
    const [row] = await this.db.select().from(orgMembers)
      .where(and(eq(orgMembers.tenant_id, tenantId), eq(orgMembers.id, id)))
      .limit(1);
    if (!row) throw new NotFoundException('Utilizador não encontrado');
    return row;
  }

  async findByClerkId(tenantId: string, clerkUserId: string): Promise<OrgMember | null> {
    const [row] = await this.db.select().from(orgMembers)
      .where(and(eq(orgMembers.tenant_id, tenantId), eq(orgMembers.clerk_user_id, clerkUserId)))
      .limit(1);
    return row ?? null;
  }

  async create(tenantId: string, dto: CreateUserDto): Promise<OrgMember> {
    const existing = await this.findByClerkId(tenantId, dto.clerkId);
    if (existing) throw new ConflictException('Utilizador já existe neste tenant');

    const [member] = await this.db.select({ org_id: orgMembers.org_id })
      .from(orgMembers).where(eq(orgMembers.tenant_id, tenantId)).limit(1);

    if (!member) throw new NotFoundException('Tenant sem organização associada');

    const [row] = await this.db.insert(orgMembers).values({
      org_id:        member.org_id,
      tenant_id:     tenantId,
      clerk_user_id: dto.clerkId,
      email:         dto.email,
      full_name:     dto.fullName  ?? null,
      role:          dto.role,
      is_active:     true,
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<OrgMember> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(orgMembers).set({
      ...(dto.fullName != null && { full_name: dto.fullName }),
      ...(dto.role     != null && { role:      dto.role }),
      ...(dto.status   != null && { is_active: dto.status === 'active' }),
      updated_at: new Date(),
    }).where(and(eq(orgMembers.tenant_id, tenantId), eq(orgMembers.id, id)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(orgMembers).set({ is_active: false, updated_at: new Date() })
      .where(and(eq(orgMembers.tenant_id, tenantId), eq(orgMembers.id, id)));
    return { deleted: true };
  }
}
