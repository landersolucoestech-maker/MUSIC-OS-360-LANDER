import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ecad_reportEntity } from '../entities/ecad_report.entity';

@Injectable()
export class Ecad_reportRepository {
  constructor(
    @InjectRepository(Ecad_reportEntity)
    private readonly repo: Repository<Ecad_reportEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({ where: { /* tenant_id: tenantId */ } as never });
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<Ecad_reportEntity>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  update(id: string, data: Partial<Ecad_reportEntity>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
