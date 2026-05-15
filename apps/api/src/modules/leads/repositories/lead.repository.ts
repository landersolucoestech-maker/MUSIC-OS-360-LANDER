import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LeadEntity } from '../entities/lead.entity';

@Injectable()
export class LeadRepository {
  constructor(
    @InjectRepository(LeadEntity)
    private readonly repo: Repository<LeadEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({ where: { /* tenant_id: tenantId */ } as never });
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<LeadEntity>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  update(id: string, data: Partial<LeadEntity>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
