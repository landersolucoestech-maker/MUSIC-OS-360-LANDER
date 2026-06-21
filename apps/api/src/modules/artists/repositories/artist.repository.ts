import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArtistEntity } from '../entities/artist.entity';

@Injectable()
export class ArtistRepository {
  constructor(
    @InjectRepository(ArtistEntity)
    private readonly repo: Repository<ArtistEntity>,
  ) {}

  findAll(tenantId: string) {
    return this.repo.createQueryBuilder('entity').where('entity.tenant_id = :tenantId', { tenantId }).getMany();
  }

  findById(tenantId: string, id: string) {
    return this.repo.createQueryBuilder('entity').where('entity.id = :id AND entity.tenant_id = :tenantId', { id, tenantId }).getOne();
  }

  create(tenantId: string, data: Partial<ArtistEntity>) {
    const entity = this.repo.create({ ...data, tenant_id: tenantId } as Partial<ArtistEntity> & { tenant_id: string });
    return this.repo.save(entity);
  }

  update(tenantId: string, id: string, data: Partial<ArtistEntity>) {
    return this.repo.update({ id, tenant_id: tenantId } as { id: string; tenant_id: string }, data);
  }

  remove(tenantId: string, id: string) {
    return this.repo.delete({ id, tenant_id: tenantId } as { id: string; tenant_id: string });
  }
}
