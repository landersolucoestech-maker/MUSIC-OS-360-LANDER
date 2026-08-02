import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { ClientEntity } from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import type { CreateClientDto, UpdateClientDto, QueryClientDto } from './dto/clients.dto';

@Injectable()
export class ClientsService {
  private readonly repo: Repository<ClientEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly enc: EncryptionService,
  ) {
    if (ds) this.repo = ds.getRepository(ClientEntity);
  }

  private mapClient(c: ClientEntity) {
    return {
      ...c,
      name:               c.nome,
      type:               c.tipo_pessoa,
      category:           c.categoria,
      address:            c.endereco_completo,
      email:              this.enc.decryptNullable(c.email_encrypted),
      phone:              this.enc.decryptNullable(c.telefone_encrypted),
      document:           this.enc.decryptNullable(c.cpf_cnpj_encrypted),
      email_encrypted:    undefined,
      telefone_encrypted: undefined,
      cpf_cnpj_encrypted: undefined,
    };
  }

  async list(tenantId: string, query: QueryClientDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (q['status'])   qb.andWhere('c.status = :status',      { status:   q['status'] });
    if (q['type'])     qb.andWhere('c.tipo_pessoa = :type',   { type:     q['type'] });
    if (q['category']) qb.andWhere('c.categoria = :category', { category: q['category'] });

    qb.orderBy('c.created_at', q['ascending'] ? 'ASC' : 'DESC')
      .skip(typeof q['offset'] === 'number' ? q['offset'] : 0)
      .take(typeof q['limit']  === 'number' ? q['limit']  : 50);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((c) => this.mapClient(c)),
      meta: { total, offset: typeof q['offset'] === 'number' ? q['offset'] : 0, limit: typeof q['limit'] === 'number' ? q['limit'] : 50 },
    };
  }

  async findById(tenantId: string, id: string) {
    const result = await this.repo!
      .createQueryBuilder('c')
      .where('c.id = :id AND c.tenant_id = :tenantId AND c.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Cliente não encontrado');
    return this.mapClient(result);
  }

  async create(tenantId: string, userId: string, dto: CreateClientDto) {
    const { email, phone, document, ...rest } = dto as unknown as Record<string, unknown>;
    const client = this.normalizeClientPayload(rest, true);
    const entity = this.repo!.create({
      tenant_id:          tenantId,
      ...(client as Partial<ClientEntity>),
      email_encrypted:    this.enc.encryptNullable(email as string | undefined),
      telefone_encrypted: this.enc.encryptNullable(phone as string | undefined),
      cpf_cnpj_encrypted: this.enc.encryptNullable(document as string | undefined),
      created_by:         userId,
      updated_by:         userId,
    } as Partial<ClientEntity>);
    const saved = await this.repo!.save(entity as ClientEntity);
    return this.mapClient(saved as ClientEntity);
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateClientDto) {
    await this.findById(tenantId, id);
    const { email, phone, document, ...rest } = dto as Record<string, unknown>;
    const updates: Record<string, unknown> = {
      ...this.normalizeClientPayload(rest),
      updated_at: new Date(),
      updated_by: userId,
    };
    if (email    !== undefined) updates['email_encrypted']    = this.enc.encryptNullable(email as string | null);
    if (phone    !== undefined) updates['telefone_encrypted']  = this.enc.encryptNullable(phone as string | null);
    if (document !== undefined) updates['cpf_cnpj_encrypted'] = this.enc.encryptNullable(document as string | null);
    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }

  /** categoria/perfil são NOT NULL na tabela física; a DTO pública não expõe
   * `perfil` e trata `category` como opcional — mantemos o contrato aceitando
   * ambos ausentes, com fallback explícito em vez de deixar o INSERT falhar
   * por violação de NOT NULL. */
  private static readonly DEFAULT_CATEGORIA = 'CORPORATE_CLIENT';
  private static readonly DEFAULT_PERFIL = 'outros';

  private normalizeClientPayload(input: Record<string, unknown>, isCreate = false) {
    const {
      name, type, category, address, avatarUrl: _avatarUrl,
      city, state, instagram, zipCode, responsible, notes,
      ...rest
    } = input;
    void _avatarUrl;
    const mapped: Record<string, unknown> = { ...rest };
    if (name !== undefined) mapped['nome'] = name;
    if (type !== undefined) mapped['tipo_pessoa'] = type === 'company' ? 'pessoa_juridica' : type === 'person' ? 'pessoa_fisica' : type;
    if (category !== undefined) mapped['categoria'] = category;
    else if (isCreate) mapped['categoria'] = ClientsService.DEFAULT_CATEGORIA;
    if (isCreate) mapped['perfil'] = ClientsService.DEFAULT_PERFIL;
    if (address !== undefined) mapped['endereco_completo'] = typeof address === 'string' ? address : JSON.stringify(address);
    if (city !== undefined) mapped['cidade'] = city;
    if (state !== undefined) mapped['estado'] = state;
    if (instagram !== undefined) mapped['instagram'] = instagram;
    if (zipCode !== undefined) mapped['cep'] = zipCode;
    if (responsible !== undefined) mapped['responsavel_nome'] = responsible;
    if (notes !== undefined) mapped['observacoes'] = notes;
    return mapped;
  }
}
