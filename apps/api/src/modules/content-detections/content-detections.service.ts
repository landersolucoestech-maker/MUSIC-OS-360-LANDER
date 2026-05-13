import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { DRIZZLE_DB, DrizzleDB }       from '../../database/database.module';
import { contentDetections, ContentDetection } from '../../database/schema';
import { CreateContentDetectionDto }   from './dto/create-content-detection.dto';
import { UpdateContentDetectionDto }   from './dto/update-content-detection.dto';

@Injectable()
export class ContentDetectionsService {
  constructor(
    @Inject(DRIZZLE_DB) private readonly db: DrizzleDB,
  ) {}

  async list(tenantId: string) {
    return this.db
      .select()
      .from(contentDetections)
      .where(and(eq(contentDetections.tenant_id, tenantId), isNull(contentDetections.deleted_at)))
      .orderBy(desc(contentDetections.created_at));
  }

  async findById(tenantId: string, id: string): Promise<ContentDetection> {
    const [result] = await this.db
      .select()
      .from(contentDetections)
      .where(and(
        eq(contentDetections.tenant_id, tenantId),
        eq(contentDetections.id, id),
        isNull(contentDetections.deleted_at),
      ))
      .limit(1);

    if (!result) throw new NotFoundException('Detecção não encontrada');
    return result;
  }

  async create(tenantId: string, dto: CreateContentDetectionDto): Promise<ContentDetection> {
    const [created] = await this.db
      .insert(contentDetections)
      .values({
        tenant_id:        tenantId,
        plataforma:       dto.plataforma,
        obra_id:          dto.obra_id          ?? null,
        artista_id:       dto.artista_id       ?? null,
        titulo_detectado: dto.titulo_detectado ?? null,
        url:              dto.url              ?? null,
        score:            dto.score            ?? null,
        status:           dto.status           ?? 'pendente',
        tipo:             dto.tipo             ?? 'uso_nao_autorizado',
        metadata:         dto.metadata         ?? {},
      })
      .returning();

    return created;
  }

  async update(tenantId: string, id: string, dto: UpdateContentDetectionDto): Promise<ContentDetection> {
    await this.findById(tenantId, id);

    const [updated] = await this.db
      .update(contentDetections)
      .set({
        ...(dto.plataforma       != null && { plataforma:       dto.plataforma }),
        ...(dto.obra_id          != null && { obra_id:          dto.obra_id }),
        ...(dto.artista_id       != null && { artista_id:       dto.artista_id }),
        ...(dto.titulo_detectado != null && { titulo_detectado: dto.titulo_detectado }),
        ...(dto.url              != null && { url:              dto.url }),
        ...(dto.score            != null && { score:            dto.score }),
        ...(dto.status           != null && { status:           dto.status }),
        ...(dto.tipo             != null && { tipo:             dto.tipo }),
        ...(dto.metadata         != null && { metadata:         dto.metadata }),
        updated_at: new Date(),
      })
      .where(and(eq(contentDetections.tenant_id, tenantId), eq(contentDetections.id, id), isNull(contentDetections.deleted_at)))
      .returning();

    return updated;
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);

    await this.db
      .update(contentDetections)
      .set({ deleted_at: new Date() })
      .where(and(eq(contentDetections.tenant_id, tenantId), eq(contentDetections.id, id)));

    return { deleted: true };
  }
}
