import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, ilike, isNull, desc, asc, count, SQL } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { projects, Project }     from '../../database/schema';
import { CreateProjectDto, UpdateProjectDto, QueryProjectDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(@Inject(DRIZZLE_DB) private readonly db: DrizzleDB) {}

  async list(tenantId: string, q: QueryProjectDto) {
    const conditions: SQL[] = [
      eq(projects.tenant_id, tenantId),
      isNull(projects.deleted_at),
    ];
    if (q.status)   conditions.push(eq(projects.status,     q.status));
    if (q.type)     conditions.push(eq(projects.tipo,       q.type));
    if (q.artistId) conditions.push(eq(projects.artista_id, q.artistId));
    if (q.search)   conditions.push(ilike(projects.nome,    `%${q.search}%`) as SQL);

    const where = and(...conditions);
    const col   = q.ascending ? asc(projects.created_at) : desc(projects.created_at);

    const [rows, [{ value: total }]] = await Promise.all([
      this.db.select().from(projects).where(where).orderBy(col)
        .offset(q.offset ?? 0).limit(q.limit ?? 50),
      this.db.select({ value: count() }).from(projects).where(where),
    ]);
    return { data: rows, meta: { total: Number(total), offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<Project> {
    const [row] = await this.db.select().from(projects)
      .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, id), isNull(projects.deleted_at)))
      .limit(1);
    if (!row) throw new NotFoundException('Projecto não encontrado');
    return row;
  }

  async create(tenantId: string, userId: string, dto: CreateProjectDto): Promise<Project> {
    const [row] = await this.db.insert(projects).values({
      tenant_id:   tenantId,
      nome:        dto.title,
      tipo:        dto.type,
      artista_id:  dto.artistId ?? null,
      orcamento:   dto.budget != null ? String(dto.budget) : null,
      data_inicio: dto.startsAt    ? new Date(dto.startsAt)   : null,
      data_fim:    dto.deadlineAt  ? new Date(dto.deadlineAt) : null,
      descricao:   null,
      status:      'planejamento',
      metadata:    dto.metadata    ?? {},
      created_by:  userId,
      updated_by:  userId,
    }).returning();
    return row;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateProjectDto): Promise<Project> {
    await this.findById(tenantId, id);
    const [row] = await this.db.update(projects).set({
      ...(dto.title      != null && { nome:        dto.title }),
      ...(dto.type       != null && { tipo:        dto.type }),
      ...(dto.status     != null && { status:      dto.status }),
      ...(dto.artistId   != null && { artista_id:  dto.artistId }),
      ...(dto.budget     != null && { orcamento:   String(dto.budget) }),
      ...(dto.startsAt   != null && { data_inicio: new Date(dto.startsAt) }),
      ...(dto.deadlineAt != null && { data_fim:    new Date(dto.deadlineAt) }),
      ...(dto.metadata   != null && { metadata:    dto.metadata }),
      updated_at: new Date(),
      updated_by: userId,
    }).where(and(eq(projects.tenant_id, tenantId), eq(projects.id, id), isNull(projects.deleted_at)))
      .returning();
    return row;
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.db.update(projects).set({ deleted_at: new Date() })
      .where(and(eq(projects.tenant_id, tenantId), eq(projects.id, id)));
    return { deleted: true };
  }
}
