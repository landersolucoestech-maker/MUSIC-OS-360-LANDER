import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { SupportRequestEntity } from '../../database/entities';
import type { CreateSupportRequestDto } from './dto/support-requests.dto';

@Injectable()
export class SupportRequestsService {
  private readonly repo: Repository<SupportRequestEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(SupportRequestEntity);
  }

  async list(tenantId: string): Promise<SupportRequestEntity[]> {
    return this.repo!
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId AND r.deleted_at IS NULL', { tenantId })
      .orderBy('r.votes', 'DESC')
      .addOrderBy('r.created_at', 'DESC')
      .getMany();
  }

  async create(tenantId: string, userId: string, dto: CreateSupportRequestDto): Promise<SupportRequestEntity> {
    const entity = this.repo!.create({
      tenant_id: tenantId,
      type: dto.type as SupportRequestEntity['type'],
      title: dto.title,
      description: dto.description ?? '',
      priority: dto.priority ?? 'medium',
      created_by: userId,
    });
    return this.repo!.save(entity);
  }

  /** Plain atomic counter — see entity comment for why no per-user vote table exists. */
  async upvote(tenantId: string, id: string): Promise<SupportRequestEntity> {
    const result = await this.repo!
      .createQueryBuilder()
      .update(SupportRequestEntity)
      .set({ votes: () => 'votes + 1' })
      .where('id = :id AND tenant_id = :tenantId AND deleted_at IS NULL', { id, tenantId })
      .execute();
    if (!result.affected) throw new NotFoundException('Solicitação não encontrada');

    const updated = await this.repo!
      .createQueryBuilder('r')
      .where('r.id = :id AND r.tenant_id = :tenantId', { id, tenantId })
      .getOne();
    if (!updated) throw new NotFoundException('Solicitação não encontrada');
    return updated;
  }
}
