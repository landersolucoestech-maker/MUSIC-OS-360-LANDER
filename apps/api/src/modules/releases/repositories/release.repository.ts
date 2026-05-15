import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReleaseEntity } from '../entities/release.entity';

@Injectable()
export class ReleaseRepository {
  constructor(
    @InjectRepository(ReleaseEntity)
    private readonly repo: Repository<ReleaseEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({ where: { /* tenant_id: tenantId */ } as never });
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<ReleaseEntity>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  update(id: string, data: Partial<ReleaseEntity>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
