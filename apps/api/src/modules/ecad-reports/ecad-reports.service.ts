import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { EcadReportEntity } from '../../database/entities';
import type { CreateEcadReportDto } from './dto/create-ecad-report.dto';
import { casUpdate } from '../../common/persistence/optimistic-update.util';

@Injectable()
export class EcadReportsService {
  private readonly repo: Repository<EcadReportEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(EcadReportEntity);
  }

  async list(tenantId: string, query: any) {
    const qb = this.repo!
      .createQueryBuilder('r')
      .where('r.tenant_id = :tenantId', { tenantId })
      .andWhere('r.deleted_at IS NULL');

    if (query.obra_id) qb.andWhere('r.obra_id = :obraId',    { obraId:  query.obra_id });
    if (query.periodo) qb.andWhere('r.periodo = :periodo',   { periodo: query.periodo });
    if (query.status)  qb.andWhere('r.status = :status',     { status:  query.status });

    qb.orderBy('r.created_at', query.ascending ? 'ASC' : 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<EcadReportEntity> {
    const result = await this.repo!
      .createQueryBuilder('r')
      .where('r.id = :id AND r.tenant_id = :tenantId AND r.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Relatório ECAD não encontrado');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateEcadReportDto): Promise<EcadReportEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), created_by: userId });
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, id: string, dto: any): Promise<EcadReportEntity> {
    await this.findById(tenantId, id);
    const { expectedUpdatedAt, ...rest } = dto ?? {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await casUpdate(
      this.repo!,
      { id, tenant_id: tenantId } as any,
      { ...rest, updated_at: new Date() } as any,
      expectedUpdatedAt,
      'Este relatório ECAD foi alterado por outro usuário desde que você o carregou. Recarregue e tente novamente.',
    );
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
