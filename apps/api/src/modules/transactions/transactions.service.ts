import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { TransactionEntity } from '../../database/entities';
import type { QueryTransactionDto } from './dto/query-transaction.dto';
import type {
  CreateTransacaoDto,
  UpdateTransacaoDto,
  PatchTransacaoDto,
} from './validators/transacao.validator';

type AnyRecord = Record<string, unknown>;

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

    if ((query as AnyRecord).status)     qb.andWhere('t.status = :status',         { status:     (query as AnyRecord).status });
    if ((query as AnyRecord).tipo)       qb.andWhere('t.tipo = :tipo',             { tipo:       (query as AnyRecord).tipo });
    if ((query as AnyRecord).categoria)  qb.andWhere('t.categoria = :categoria',   { categoria:  (query as AnyRecord).categoria });
    if ((query as AnyRecord).artista_id) qb.andWhere('t.artista_id = :artistaId', { artistaId:  (query as AnyRecord).artista_id });
    if ((query as AnyRecord).dateFrom)   qb.andWhere('t.data >= :dateFrom',        { dateFrom:   (query as AnyRecord).dateFrom });
    if ((query as AnyRecord).dateTo)     qb.andWhere('t.data <= :dateTo',          { dateTo:     (query as AnyRecord).dateTo });

    qb.orderBy('t.data', (query as AnyRecord).ascending ? 'ASC' : 'DESC')
      .skip((query as AnyRecord).offset as number ?? 0)
      .take((query as AnyRecord).limit  as number ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: (query as AnyRecord).offset ?? 0, limit: (query as AnyRecord).limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<TransactionEntity> {
    const result = await this.repo!
      .createQueryBuilder('t')
      .where('t.id = :id AND t.tenant_id = :tenantId AND t.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Transação não encontrada');
    return result;
  }

  async create(tenantId: string, userId: string, dto: CreateTransacaoDto): Promise<TransactionEntity> {
    const payload = { tenant_id: tenantId, ...dto, created_by: userId, updated_by: userId } as AnyRecord;
    const entity  = this.repo!.create(payload as Parameters<Repository<TransactionEntity>['create']>[0]);
    return this.repo!.save(entity as TransactionEntity);
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateTransacaoDto): Promise<TransactionEntity> {
    await this.findById(tenantId, id);
    const patch = { ...dto, updated_at: new Date(), updated_by: userId } as AnyRecord;
    await this.repo!.update({ id, tenant_id: tenantId } as AnyRecord, patch as AnyRecord);
    return this.findById(tenantId, id);
  }

  async patch(tenantId: string, userId: string, id: string, dto: PatchTransacaoDto): Promise<TransactionEntity> {
    await this.findById(tenantId, id);
    const patch = { ...dto, updated_at: new Date(), updated_by: userId } as AnyRecord;
    await this.repo!.update({ id, tenant_id: tenantId } as AnyRecord, patch as AnyRecord);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as AnyRecord, { deleted_at: new Date() } as AnyRecord);
    return { deleted: true };
  }
}
