import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PhonogramEntity } from '../entities/phonogram.entity';

@Injectable()
export class PhonogramRepository {
  constructor(
    @InjectRepository(PhonogramEntity)
    private readonly repo: Repository<PhonogramEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.createQueryBuilder('entity').where('entity.tenant_id = :tenantId', { tenantId }).getMany();
  }

  findById(tenantId: string, id: string) {
    return this.repo.createQueryBuilder('entity').where('entity.id = :id AND entity.tenant_id = :tenantId', { id, tenantId }).getOne();
  }

  create(tenantId: string, data: Partial<PhonogramEntity>) {
    const entity = this.repo.create({ ...data, tenant_id: tenantId } as Partial<PhonogramEntity> & { tenant_id: string });
    return this.repo.save(entity);
  }

  update(tenantId: string, id: string, data: Partial<PhonogramEntity>) {
    return this.repo.update({ id, tenant_id: tenantId } as { id: string; tenant_id: string }, data);
  }

  remove(tenantId: string, id: string) {
    return this.repo.delete({ id, tenant_id: tenantId } as { id: string; tenant_id: string });
  }
}
