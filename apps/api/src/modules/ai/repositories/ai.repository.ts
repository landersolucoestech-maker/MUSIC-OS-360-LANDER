import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiEntity } from '../entities/ai.entity';

@Injectable()
export class AiRepository {
  constructor(
    @InjectRepository(AiEntity)
    private readonly repo: Repository<AiEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.createQueryBuilder('entity').where('entity.tenant_id = :tenantId', { tenantId }).getMany();
  }

  findById(tenantId: string, id: string) {
    return this.repo.createQueryBuilder('entity').where('entity.id = :id AND entity.tenant_id = :tenantId', { id, tenantId }).getOne();
  }

  create(tenantId: string, data: Partial<AiEntity>) {
    const entity = this.repo.create({ ...data, tenant_id: tenantId } as Partial<AiEntity> & { tenant_id: string });
    return this.repo.save(entity);
  }

  update(tenantId: string, id: string, data: Partial<AiEntity>) {
    return this.repo.update({ id, tenant_id: tenantId } as { id: string; tenant_id: string }, data);
  }

  remove(tenantId: string, id: string) {
    return this.repo.delete({ id, tenant_id: tenantId } as { id: string; tenant_id: string });
  }
}
