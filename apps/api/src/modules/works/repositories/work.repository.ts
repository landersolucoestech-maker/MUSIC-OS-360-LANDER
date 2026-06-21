import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkEntity } from '../entities/work.entity';

@Injectable()
export class WorkRepository {
  constructor(
    @InjectRepository(WorkEntity)
    private readonly repo: Repository<WorkEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.createQueryBuilder('work').where('work.tenant_id = :tenantId', { tenantId }).getMany();
  }

  findById(tenantId: string, id: string) {
    return this.repo.createQueryBuilder('work').where('work.id = :id AND work.tenant_id = :tenantId', { id, tenantId }).getOne();
  }

  create(tenantId: string, data: Partial<WorkEntity>) {
    const entity = this.repo.create({ ...data, tenant_id: tenantId } as Partial<WorkEntity> & { tenant_id: string });
    return this.repo.save(entity);
  }

  update(tenantId: string, id: string, data: Partial<WorkEntity>) {
    return this.repo.update({ id, tenant_id: tenantId } as { id: string; tenant_id: string }, data);
  }

  remove(tenantId: string, id: string) {
    return this.repo.delete({ id, tenant_id: tenantId } as { id: string; tenant_id: string });
  }
}
