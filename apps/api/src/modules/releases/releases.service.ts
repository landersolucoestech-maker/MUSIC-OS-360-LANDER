import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ReleaseEntity } from '../../database/entities';
import type { CreateReleaseDto, UpdateReleaseDto, QueryReleaseDto } from './dto/releases.dto';
import { ReleaseStatus } from '@music-os-360/types';

@Injectable()
export class ReleasesService {
  private readonly repo: Repository<ReleaseEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(ReleaseEntity);
  }

  async list(tenantId: string, q: QueryReleaseDto) {
    const qb = this.repo!
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.deleted_at IS NULL');

    if (q.status)      qb.andWhere('r.status = :status',             { status:      q.status });
    if (q.type)        qb.andWhere('r.tipo = :tipo',                 { tipo:        q.type });
    if (q.artistId)    qb.andWhere('r.artista_id = :artistaId',      { artistaId:   q.artistId });
    if (q.distributor) qb.andWhere('r.distribuidora = :distribuidora', { distribuidora: q.distributor });
    if (q.search)      qb.andWhere('r.titulo ILIKE :search',         { search:      `%${q.search}%` });

    qb.orderBy('r.created_at', q.ascending ? 'ASC' : 'DESC')
      .skip(q.offset ?? 0)
      .take(q.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<ReleaseEntity> {
    const result = await this.repo!
      .createQueryBuilder('r')
      .where('r.id = :id AND r.tenant_id = :tenantId AND r.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Lançamento não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateReleaseDto): Promise<ReleaseEntity> {
    const entity = this.repo!.create({
      tenant_id:       tenantId,
      titulo:          dto.title,
      tipo:            dto.type,
      artista_id:      dto.artistId    ?? null,
      upc:             dto.upc         ?? null,
      distribuidora:   dto.distributor ?? null,
      data_lancamento: dto.releasedAt  ? new Date(dto.releasedAt) : null,
      plataformas:     dto.platforms   ?? [],
      capa_url:        dto.coverUrl    ?? null,
      status:          ReleaseStatus.PLANEJAMENTO,
      metadata:        dto.metadata    ?? {},
      created_by:      userId,
      updated_by:      userId,
    });
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateReleaseDto): Promise<ReleaseEntity> {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, unknown> = { updated_at: new Date(), updated_by: userId };
    if (dto.title       != null) updates.titulo          = dto.title;
    if (dto.type        != null) updates.tipo            = dto.type;
    if (dto.status      != null) updates.status          = dto.status;
    if (dto.artistId    != null) updates.artista_id      = dto.artistId;
    if (dto.upc         != null) updates.upc             = dto.upc;
    if (dto.distributor != null) updates.distribuidora   = dto.distributor;
    if (dto.releasedAt  != null) updates.data_lancamento = new Date(dto.releasedAt);
    if (dto.platforms   != null) updates.plataformas     = dto.platforms;
    if (dto.coverUrl    != null) updates.capa_url        = dto.coverUrl;
    if (dto.metadata    != null) updates.metadata        = dto.metadata;

    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
