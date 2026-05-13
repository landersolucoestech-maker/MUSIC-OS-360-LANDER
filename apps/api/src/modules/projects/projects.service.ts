import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { projects, Project } from '../../database/schema';
import { CreateProjectDto, UpdateProjectDto, QueryProjectDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryProjectDto) {
    const conditions: SQL[] = [eq(projects.tenantId, tenantId)];
    if (q.status)   conditions.push(eq(projects.status, q.status));
    if (q.type)     conditions.push(eq(projects.type, q.type));
    if (q.artistId) conditions.push(eq(projects.artistId, q.artistId));
    if (q.search)   conditions.push(ilike(projects.title, `%${q.search}%`));
    const where = and(...conditions);
    const col   = q.ascending ? asc(projects.createdAt) : desc(projects.createdAt);
    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(projects).where(where).orderBy(col).offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(projects).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Project> {
    const [row] = await this.db.select().from(projects)
      .where(and(eq(projects.tenantId, tenantId), eq(projects.id, id))).limit(1);
    if (!row) throw new NotFoundException('Projecto não encontrado');
    return row;
  }

  async create(tenantId: string, dto: CreateProjectDto): Promise<Project> {
    const [row] = await this.db.insert(projects).values({
      tenantId, title: dto.title, type: dto.type,
      artistId:   dto.artistId   ?? null,
      budget:     dto.budget     != null ? String(dto.budget) : null,
      currency:   dto.currency   ?? 'BRL',
      startsAt:   dto.startsAt   ?? null,
      deadlineAt: dto.deadlineAt ?? null,
      releasedAt: dto.releasedAt ?? null,
      metadata:   dto.metadata   ?? {},
    }).returning();
    return row;
  }

  async update(tenantId: string, id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(projects).set({
      ...(dto.title      != null && { title:      dto.title }),
      ...(dto.type       != null && { type:       dto.type }),
      ...(dto.status     != null && { status:     dto.status }),
      ...(dto.artistId   != null && { artistId:   dto.artistId }),
      ...(dto.budget     != null && { budget:     String(dto.budget) }),
      ...(dto.startsAt   != null && { startsAt:   dto.startsAt }),
      ...(dto.deadlineAt != null && { deadlineAt: dto.deadlineAt }),
      ...(dto.releasedAt != null && { releasedAt: dto.releasedAt }),
      ...(dto.metadata   != null && { metadata:   dto.metadata }),
      updatedAt: new Date(),
    }).where(and(eq(projects.tenantId, tenantId), eq(projects.id, id))).returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(projects).set({ status: 'cancelled', updatedAt: new Date() })
      .where(and(eq(projects.tenantId, tenantId), eq(projects.id, id)));
    return { deleted: true };
  }
}
