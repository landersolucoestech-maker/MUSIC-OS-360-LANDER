import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB } from '../../database/database.module';
import { artistGoals, ArtistGoal } from '../../database/schema';
import { CreateArtistGoalDto } from './dto/create-artist-goal.dto';
import { UpdateArtistGoalDto } from './dto/update-artist-goal.dto';

@Injectable()
export class ArtistGoalsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string) {
    return this.db
      .select()
      .from(artistGoals)
      .where(and(eq(artistGoals.tenant_id, tenantId), isNull(artistGoals.deleted_at)))
      .orderBy(desc(artistGoals.created_at));
  }

  async findById(tenantId: string, id: string): Promise<ArtistGoal> {
    const [result] = await this.db
      .select()
      .from(artistGoals)
      .where(and(eq(artistGoals.tenant_id, tenantId), eq(artistGoals.id, id), isNull(artistGoals.deleted_at)))
      .limit(1);

    if (!result) throw new NotFoundException('Meta de artista não encontrada');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateArtistGoalDto): Promise<ArtistGoal> {
    const [created] = await this.db
      .insert(artistGoals)
      .values({
        tenant_id:   tenantId,
        artista_id:  dto.artista_id,
        titulo:      dto.titulo,
        tipo:        dto.tipo,
        meta_valor:  dto.meta_valor  ?? null,
        valor_atual: dto.valor_atual ?? '0',
        status:      dto.status      ?? 'em_andamento',
        periodo:     dto.periodo     ?? 'mensal',
        data_inicio: dto.data_inicio ? new Date(dto.data_inicio) : null,
        data_fim:    dto.data_fim    ? new Date(dto.data_fim)    : null,
        metadata:    dto.metadata    ?? {},
        created_by:  userId,
      })
      .returning();

    return created;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateArtistGoalDto): Promise<ArtistGoal> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(artistGoals)
      .set({
        ...(dto.titulo      != null && { titulo:      dto.titulo }),
        ...(dto.tipo        != null && { tipo:        dto.tipo }),
        ...(dto.meta_valor  != null && { meta_valor:  dto.meta_valor }),
        ...(dto.valor_atual != null && { valor_atual: dto.valor_atual }),
        ...(dto.status      != null && { status:      dto.status }),
        ...(dto.periodo     != null && { periodo:     dto.periodo }),
        ...(dto.metadata    != null && { metadata:    dto.metadata }),
        ...(dto.data_inicio != null && { data_inicio: new Date(dto.data_inicio) }),
        ...(dto.data_fim    != null && { data_fim:    new Date(dto.data_fim) }),
        updated_at: new Date(),
      })
      .where(and(eq(artistGoals.tenant_id, tenantId), eq(artistGoals.id, id), isNull(artistGoals.deleted_at)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(artistGoals)
      .set({ deleted_at: new Date() })
      .where(and(eq(artistGoals.tenant_id, tenantId), eq(artistGoals.id, id)));

    return { deleted: true };
  }
}
