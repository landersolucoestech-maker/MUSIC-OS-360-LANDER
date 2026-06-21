import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contract_templateEntity } from '../entities/contract_template.entity';

@Injectable()
export class Contract_templateRepository {
  constructor(
    @InjectRepository(Contract_templateEntity)
    private readonly repo: Repository<Contract_templateEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.createQueryBuilder('entity').where('entity.tenant_id = :tenantId', { tenantId }).getMany();
  }

  findById(tenantId: string, id: string) {
    return this.repo.createQueryBuilder('entity').where('entity.id = :id AND entity.tenant_id = :tenantId', { id, tenantId }).getOne();
  }

  create(tenantId: string, data: Partial<Contract_templateEntity>) {
    const entity = this.repo.create({ ...data, tenant_id: tenantId } as Partial<Contract_templateEntity> & { tenant_id: string });
    return this.repo.save(entity);
  }

  update(tenantId: string, id: string, data: Partial<Contract_templateEntity>) {
    return this.repo.update({ id, tenant_id: tenantId } as { id: string; tenant_id: string }, data);
  }

  remove(tenantId: string, id: string) {
    return this.repo.delete({ id, tenant_id: tenantId } as { id: string; tenant_id: string });
  }
}
