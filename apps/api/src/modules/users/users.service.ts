import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import { OrgMemberEntity } from '../../database/entities';
import type { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto/users.dto';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';

@Injectable()
export class UsersService {
  private readonly repo: Repository<OrgMemberEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly events: EventsService,
  ) {
    if (ds) this.repo = ds.getRepository(OrgMemberEntity);
  }

  async list(tenantId: string, q: QueryUserDto) {
    const qb = this.repo!
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId', { tenantId });

    if (q.role)   qb.andWhere('m.role = :role',       { role:   q.role });
    if (q.search) qb.andWhere('m.email ILIKE :search', { search: `%${q.search}%` });

    qb.orderBy('m.created_at', q.ascending ? 'ASC' : 'DESC')
      .skip(q.offset ?? 0)
      .take(q.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<OrgMemberEntity> {
    const result = await this.repo!
      .createQueryBuilder('m')
      .where('m.id = :id AND m.tenant_id = :tenantId', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Utilizador não encontrado');
    return result;
  }

  async findByUserId(tenantId: string, userId: string): Promise<OrgMemberEntity | null> {
    return this.repo!
      .createQueryBuilder('m')
      .where('m.tenant_id = :tenantId AND m.clerk_user_id = :userId', { tenantId, userId })
      .getOne() ?? null;
  }

  async create(tenantId: string, dto: CreateUserDto, invitedBy?: string): Promise<OrgMemberEntity> {
    const existing = await this.findByUserId(tenantId, dto.userId);
    if (existing) throw new ConflictException('Utilizador já existe neste tenant');

    const anyMember = await this.repo!
      .createQueryBuilder('m')
      .select('m.org_id')
      .where('m.tenant_id = :tenantId', { tenantId })
      .getOne();
    if (!anyMember) throw new NotFoundException('Tenant sem organização associada');

    const entity = this.repo!.create({
      org_id:        anyMember.org_id,
      tenant_id:     tenantId,
      clerk_user_id: dto.userId,
      email:         dto.email,
      full_name:     dto.fullName ?? null,
      role:          dto.role,
      is_active:     true,
    });
    const saved = await this.repo!.save(entity as any) as any;

    this.events.emitTyped(DOMAIN_EVENTS.USER_INVITED, {
      tenantId,
      aggregateType: 'user',
      aggregateId:   saved.id,
      userId:        invitedBy ?? 'system',
      payload: {
        tenantId,
        userId:    dto.userId,
        email:     dto.email,
        role:      dto.role,
        invitedBy: invitedBy ?? 'system',
      },
    });

    return saved;
  }

  async update(tenantId: string, id: string, dto: UpdateUserDto): Promise<OrgMemberEntity> {
    await this.findById(tenantId, id);
    const updates: Record<string, unknown> = { updated_at: new Date() };
    if (dto.fullName != null) updates.full_name = dto.fullName;
    if (dto.role     != null) updates.role      = dto.role;
    if (dto.status   != null) updates.is_active = dto.status === 'active';
    await this.repo!.update({ id, tenant_id: tenantId } as any, updates as any);
    return this.findById(tenantId, id);
  }

  async assignRole(tenantId: string, id: string, role: string): Promise<OrgMemberEntity> {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { role, updated_at: new Date() } as any);
    return this.findById(tenantId, id);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update({ id, tenant_id: tenantId } as any, { is_active: false, updated_at: new Date() } as any);
    return { deleted: true };
  }
}
