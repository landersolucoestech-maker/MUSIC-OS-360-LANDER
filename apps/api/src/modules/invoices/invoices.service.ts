import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { InvoiceEntity } from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import type { CreateInvoiceDto, UpdateInvoiceDto, QueryInvoiceDto } from './dto/invoices.dto';

@Injectable()
export class InvoicesService {
  private readonly repo: Repository<InvoiceEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly enc: EncryptionService,
  ) {
    if (ds) this.repo = ds.getRepository(InvoiceEntity);
  }

  private mapInvoice(i: InvoiceEntity) {
    return {
      ...i,
      recipientDoc:          this.enc.decryptNullable(i.tomador_doc_encrypted),
      tomador_doc_encrypted: undefined,
    };
  }

  async list(tenantId: string, query: QueryInvoiceDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('i')
      .where('i.tenant_id = :tenantId', { tenantId })
      .andWhere('i.deleted_at IS NULL');

    if (q['status'])   qb.andWhere('i.status = :status', { status: q['status'] });
    if (q['type'])     qb.andWhere('i.tipo = :tipo',     { tipo:   q['type'] });
    if (q['artistId']) qb.andWhere('i.artista_id = :artistId', { artistId: q['artistId'] });
    if (q['search'])   qb.andWhere('i.numero ILIKE :search', { search: `%${q['search']}%` });

    qb.orderBy('i.created_at', q['ascending'] ? 'ASC' : 'DESC')
      .skip(typeof q['offset'] === 'number' ? q['offset'] : 0)
      .take(typeof q['limit']  === 'number' ? q['limit']  : 50);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((i) => this.mapInvoice(i)),
      meta: { total, offset: typeof q['offset'] === 'number' ? q['offset'] : 0, limit: typeof q['limit'] === 'number' ? q['limit'] : 50 },
    };
  }

  async findById(tenantId: string, id: string) {
    const result = await this.repo!
      .createQueryBuilder('i')
      .where('i.id = :id AND i.tenant_id = :tenantId AND i.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Nota fiscal não encontrada');
    return this.mapInvoice(result);
  }

  async create(tenantId: string, userId: string, dto: CreateInvoiceDto) {
    const { recipientDoc, ...rest } = dto as unknown as Record<string, unknown>;
    const entity = this.repo!.create({
      tenant_id:             tenantId,
      ...(rest as Partial<InvoiceEntity>),
      tomador_doc_encrypted: this.enc.encryptNullable(recipientDoc as string | undefined),
      created_by:            userId,
    } as Partial<InvoiceEntity>);
    const saved = await this.repo!.save(entity as InvoiceEntity);
    return this.mapInvoice(saved as InvoiceEntity);
  }

  async update(tenantId: string, id: string, dto: UpdateInvoiceDto) {
    await this.findById(tenantId, id);
    const { recipientDoc, ...rest } = dto as Record<string, unknown>;
    const updates: Record<string, unknown> = { ...rest, updated_at: new Date() };
    if (recipientDoc !== undefined) {
      updates['tomador_doc_encrypted'] = this.enc.encryptNullable(recipientDoc as string | null);
    }
    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }
}
