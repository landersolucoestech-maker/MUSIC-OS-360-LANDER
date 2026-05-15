import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead_interactionEntity } from '../entities/lead_interaction.entity';

@Injectable()
export class Lead_interactionRepository {
  constructor(
    @InjectRepository(Lead_interactionEntity)
    private readonly repo: Repository<Lead_interactionEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({ where: { /* tenant_id: tenantId */ } as never });
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<Lead_interactionEntity>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  update(id: string, data: Partial<Lead_interactionEntity>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
