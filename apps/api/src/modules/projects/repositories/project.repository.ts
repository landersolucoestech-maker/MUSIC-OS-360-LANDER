import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectEntity } from '../entities/project.entity';

@Injectable()
export class ProjectRepository {
  constructor(
    @InjectRepository(ProjectEntity)
    private readonly repo: Repository<ProjectEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.find({ where: { /* tenant_id: tenantId */ } as never });
  }

  findById(id: string) {
    return this.repo.findOneBy({ id });
  }

  create(data: Partial<ProjectEntity>) {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  update(id: string, data: Partial<ProjectEntity>) {
    return this.repo.update(id, data);
  }

  remove(id: string) {
    return this.repo.delete(id);
  }
}
