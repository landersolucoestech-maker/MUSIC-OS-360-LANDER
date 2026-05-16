import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { TransactionEntity } from '../../database/entities';
import type { CreateTransactionDto } from './dto/create-transaction.dto';
import type { UpdateTransactionDto } from './dto/update-transaction.dto';
import type { QueryTransactionDto }  from './dto/query-transaction.dto';

@Injectable()
export class TransactionsService {
  private readonly repo: Repository<TransactionEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    if (ds) this.repo = ds.getRepository(TransactionEntity);
  }

  async list(tenantId: string, query: QueryTransactionDto) {
    const qb = this.repo!
      .createQueryBuilder('t')
      .where('t.tenant_id = :tenantId', { tenantId })
      .andWhere('t.deleted_at IS NULL');

    if ((query as any).status)     qb.andWhere('t.status = :status',         { status:     (query as any).status });
    if ((query as any).tipo)       qb.andWhere('t.tipo = :tipo',             { tipo:       (query as any).tipo });
    if ((query as any).categoria)  qb.andWhere('t.categoria = :categoria',   { categoria:  (query as any).categoria });
    if ((query as any).artista_id) qb.andWhere('t.artista_id = :artistaId', { artistaId:  (query as any).artista_id });
    if ((query as any).dateFrom)   qb.andWhere('t.data >= :dateFrom',        { dateFrom:   (query as any).dateFrom });
    if ((query as any).dateTo)     qb.andWhere('t.data <= :dateTo',          { dateTo:     (query as any).dateTo });

    qb.orderBy('t.data', (query as any).ascending ? 'ASC' : 'DESC')
      .skip((query as any).offset ?? 0)
      .take((query as any).limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as any).offset ?? 0, limit: (query as any).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<TransactionEntity> {
    const result = await this.repo!
      .createQueryBuilder('t')
      .where('t.id = :id AND t.tenant_id = :tenantId AND t.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Transação não encontrada');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateTransactionDto): Promise<TransactionEntity> {
    const entity = this.repo!.create({ tenant_id: tenantId, ...(dto as any), created_by: userId, updated_by: userId });
    return this.repo!.save(entity as any) as any;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateTransactionDto): Promise<TransactionEntity> {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { ...(dto as any), updated_at: new Date(), updated_by: userId } as any);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
