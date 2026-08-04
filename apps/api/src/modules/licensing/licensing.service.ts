import { Injectable, Inject, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { LicenseEntity } from '../../database/entities';
import type { CreateLicenseDto, UpdateLicenseDto, QueryLicenseDto } from './dto/licensing.dto';

@Injectable()
export class LicensingService {
  private readonly repo: Repository<LicenseEntity> | null;

  constructor(@Inject(DATA_SOURCE) ds: DataSource | null) {
    this.repo = ds?.getRepository(LicenseEntity) ?? null;
  }

  private get repository(): Repository<LicenseEntity> {
    if (!this.repo) throw new ServiceUnavailableException('Database unavailable for licensing');
    return this.repo;
  }

  /**
   * `amount` e `currency` correspondem às colunas físicas legadas valor/moeda.
   * `percentage` é preservado em metadata até existir coluna física canônica.
   * O mapeamento é explícito e simétrico para criar, editar e reler o modal.
   */
  private normalizePayload(
    dto: CreateLicenseDto | UpdateLicenseDto,
    currentMetadata: Record<string, unknown> = {},
  ): Record<string, unknown> {
    const {
      amount,
      currency,
      percentage,
      valor,
      moeda,
      ...rest
    } = dto;

    const metadata = { ...currentMetadata };
    if (percentage !== undefined) metadata['percentage'] = percentage;

    return {
      ...rest,
      ...(amount !== undefined || valor !== undefined ? { valor: amount ?? valor ?? null } : {}),
      ...(currency !== undefined || moeda !== undefined ? { moeda: currency ?? moeda ?? null } : {}),
      ...(percentage !== undefined ? { metadata } : {}),
    };
  }

  private mapLicense(entity: LicenseEntity): Record<string, unknown> {
    const raw = entity as unknown as Record<string, unknown>;
    const metadata = (raw['metadata'] && typeof raw['metadata'] === 'object')
      ? raw['metadata'] as Record<string, unknown>
      : {};
    return {
      ...raw,
      amount: raw['valor'] ?? null,
      currency: raw['moeda'] ?? 'BRL',
      percentage: metadata['percentage'] ?? null,
    };
  }

  async list(tenantId: string, query: QueryLicenseDto) {
    const qb = this.repository.createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.deleted_at IS NULL');

    if (query.status) qb.andWhere('l.status = :status', { status: query.status });
    if (query.tipo) qb.andWhere('l.tipo = :tipo', { tipo: query.tipo });
    if (query.obra_id) qb.andWhere('l.obra_id = :obraId', { obraId: query.obra_id });
    if (query.cliente_id) qb.andWhere('l.cliente_id = :clienteId', { clienteId: query.cliente_id });
    if (query.search) {
      qb.andWhere(
        '(l.titulo ILIKE :search OR l.projeto ILIKE :search OR l.artista ILIKE :search OR l.cliente ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    qb.orderBy('l.created_at', query.ascending ? 'ASC' : 'DESC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 50);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((row) => this.mapLicense(row)),
      meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 },
    };
  }

  async findById(tenantId: string, id: string): Promise<Record<string, unknown>> {
    const item = await this.repository.findOne({
      where: { id, tenant_id: tenantId, deleted_at: null } as never,
    });
    if (!item) throw new NotFoundException('Licença não encontrada');
    return this.mapLicense(item);
  }

  async create(tenantId: string, userId: string, dto: CreateLicenseDto): Promise<Record<string, unknown>> {
    const item = this.repository.create({
      tenant_id: tenantId,
      ...this.normalizePayload(dto),
      created_by: userId,
      updated_by: userId,
    } as Partial<LicenseEntity>);
    const saved = await this.repository.save(item as LicenseEntity);
    return this.mapLicense(saved);
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateLicenseDto,
  ): Promise<Record<string, unknown>> {
    const current = await this.repository.findOne({
      where: { id, tenant_id: tenantId, deleted_at: null } as never,
    });
    if (!current) throw new NotFoundException('Licença não encontrada');

    await this.repository.update(
      { id, tenant_id: tenantId } as never,
      {
        ...this.normalizePayload(dto, current.metadata ?? {}),
        updated_at: new Date(),
        updated_by: userId,
      } as never,
    );
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repository.update(
      { id, tenant_id: tenantId } as never,
      { deleted_at: new Date(), updated_at: new Date() } as never,
    );
    return { deleted: true };
  }
}
