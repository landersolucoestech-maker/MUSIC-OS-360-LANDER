import { Injectable, Inject, NotFoundException, Optional } from '@nestjs/common';
import { DataSource, Repository, FindOptionsWhere } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { ADMIN_DATA_SOURCE, DATA_SOURCE } from '../../database/database.module';
import { DatabaseContextService } from '../../database/database-context.service';
import { LeadEntity } from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import type {
  CreateLeadDto,
  UpdateLeadDto,
  QueryLeadDto,
  PublicArtistApplicationDto,
} from './dto/leads.dto';
import { LeadStatus } from '@music-os-360/types';
import { WorkflowService } from '../../core/workflow/workflow.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

@Injectable()
export class LeadsService {
  private readonly ds:   DataSource | null = null;
  private readonly repo: Repository<LeadEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    @Optional() @Inject(ADMIN_DATA_SOURCE) private readonly adminDs: DataSource | null,
    private readonly dbContext: DatabaseContextService,
    private readonly workflowService: WorkflowService,
    private readonly events: EventsService,
    private readonly enc: EncryptionService,
    @Optional() private readonly activityLogs?: ActivityLogsService,
  ) {
    if (ds) {
      this.ds   = ds;
      this.repo = ds.getRepository(LeadEntity);
    }
  }

  private mapLead<T extends LeadEntity>(l: T): T & { email: string | null; phone: string | null } {
    const metadata = (l.metadata ?? {}) as Record<string, unknown>;
    return {
      ...l,
      name:               l.nome,
      source:             l.fonte,
      notes:              metadata['notes'] ?? null,
      assignedTo:         metadata['assignedTo'] ?? null,
      value:              metadata['value'] ?? null,
      email:              this.enc.decryptNullable(l.email_encrypted),
      phone:              this.enc.decryptNullable(l.telefone_encrypted),
      email_encrypted:    undefined as unknown as string,
      telefone_encrypted: undefined as unknown as string,
    };
  }

  async list(tenantId: string, query: QueryLeadDto) {
    const q = query as Record<string, unknown>;
    const qb = this.repo!
      .createQueryBuilder('l')
      .where('l.tenant_id = :tenantId', { tenantId })
      .andWhere('l.deleted_at IS NULL');

    if (q['status'])         qb.andWhere('l.status = :status',                 { status:       q['status'] });
    if (q['search'])         qb.andWhere('(l.nome ILIKE :search OR l.empresa ILIKE :search)', { search: `%${q['search']}%` });

    qb.orderBy('l.created_at', q['ascending'] ? 'ASC' : 'DESC')
      .skip(typeof q['offset'] === 'number' ? q['offset'] : 0)
      .take(typeof q['limit']  === 'number' ? q['limit']  : 50);

    const [rows, total] = await qb.getManyAndCount();
    return {
      data: rows.map((l) => this.mapLead(l)),
      meta: {
        total,
        offset: typeof q['offset'] === 'number' ? q['offset'] : 0,
        limit:  typeof q['limit']  === 'number' ? q['limit']  : 50,
      },
    };
  }

  async findById(
    tenantId: string,
    id: string,
    actorRole?: string,
  ): Promise<LeadEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const result = await this.repo!
      .createQueryBuilder('l')
      .where('l.id = :id AND l.tenant_id = :tenantId AND l.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!result) throw new NotFoundException('Lead não encontrado');
    const allowed_transitions = this.workflowService.getAllowedTransitions('lead', result.status, actorRole);
    return { ...this.mapLead(result), allowed_transitions };
  }

  async create(tenantId: string, userId: string, dto: CreateLeadDto): Promise<ReturnType<typeof this.mapLead>> {
    const { status: _clientStatus, email, phone, ...rest } = dto as unknown as Record<string, unknown>;
    void _clientStatus;
    const lead = this.normalizeLeadPayload(rest);
    const entity = this.repo!.create({
      tenant_id:          tenantId,
      ...(lead as Record<string, unknown>),
      email_encrypted:    this.enc.encryptNullable(email as string | undefined),
      telefone_encrypted: this.enc.encryptNullable(phone as string | undefined),
      status:             LeadStatus.NOVO,
      created_by:         userId,
      updated_by:         userId,
    } as Partial<LeadEntity>);
    const saved = await this.repo!.save(entity as LeadEntity);
    await this.recordActivity(tenantId, userId, saved.id, 'created', `Lead "${saved.nome}" criado`, {
      nome: saved.nome,
      fonte: saved.fonte,
    });
    return this.mapLead(saved);
  }

  async resolvePublicTenant(slug: string): Promise<{ name: string; slug: string }> {
    const rows = await (this.adminDs ?? this.ds)!.query(
      `SELECT "name", "slug"
         FROM "tenants"
        WHERE lower("slug") = lower($1)
          AND "active" = true
          AND "deleted_at" IS NULL
        LIMIT 1`,
      [slug.trim()],
    ) as Array<{ name: string; slug: string }>;
    if (!rows[0]) throw new NotFoundException('Organização não encontrada ou inativa');
    return rows[0];
  }

  async submitPublicArtistApplication(
    slug: string,
    dto: PublicArtistApplicationDto,
  ): Promise<{ id: string | null; protocol: string; accepted: true }> {
    if (dto.companyWebsite) {
      return { id: null, protocol: 'ACCEPTED', accepted: true };
    }

    const tenants = await (this.adminDs ?? this.ds)!.query(
      `SELECT "id", "org_id"
         FROM "tenants"
        WHERE lower("slug") = lower($1)
          AND "active" = true
          AND "deleted_at" IS NULL
        LIMIT 1`,
      [slug.trim()],
    ) as Array<{ id: string; org_id: string }>;
    const tenant = tenants[0];
    if (!tenant) throw new NotFoundException('Organização não encontrada ou inativa');

    const saved = await this.dbContext.runInTenantContext(
      { tenantId: tenant.id, orgId: tenant.org_id, role: 'system' },
      async () => {
        const entity = this.repo!.create({
          tenant_id: tenant.id,
          nome: dto.artisticName.trim(),
          nome_artistico: dto.artisticName.trim(),
          nome_completo: dto.fullName.trim(),
          email_encrypted: this.enc.encryptNullable(dto.email.trim().toLowerCase()),
          telefone_encrypted: this.enc.encryptNullable(dto.phone.trim()),
          whatsapp: dto.phone.trim(),
          cidade: dto.city?.trim() || null,
          estado: dto.state?.trim() || null,
          fonte: 'public_artist_application',
          origemLead: 'public_artist_application',
          status: LeadStatus.NOVO,
          tags: ['artist_application', 'public_form'],
          metadata: {
            musicalGenre: dto.musicalGenre,
            objective: dto.objective ?? null,
            message: dto.message ?? null,
            socialLinks: dto.socialLinks ?? {},
            additionalData: dto.additionalData ?? {},
            acceptedTerms: dto.acceptedTerms,
            submittedAt: new Date().toISOString(),
          },
          created_by: 'system:public-artist-application',
          updated_by: 'system:public-artist-application',
        } as Partial<LeadEntity>);
        return this.repo!.save(entity);
      },
    );
    const protocol = saved.id.replace(/-/g, '').slice(-8).toUpperCase();

    this.events.emitTyped(DOMAIN_EVENTS.LEAD_CREATED, {
      tenantId: tenant.id,
      userId: 'system:public-artist-application',
      aggregateType: 'lead',
      aggregateId: saved.id,
      payload: {
        tenantId: tenant.id,
        leadId: saved.id,
        nome: saved.nome,
        origem: 'public_artist_application',
      },
    });

    return { id: saved.id, protocol, accepted: true };
  }

  async update(
    tenantId: string,
    userId: string,
    id: string,
    dto: UpdateLeadDto,
    actorRole?: string,
  ): Promise<LeadEntity & { allowed_transitions: { to: string; label?: string }[] }> {
    const current = await this.findById(tenantId, id, actorRole);
    const dtoMap  = dto as Record<string, unknown>;
    const statusChanging = dtoMap['status'] != null && dtoMap['status'] !== current.status;
    const toStatus = dtoMap['status'] as string | undefined;

    const { status: _s, email, phone, ...restFields } = dtoMap;
    void _s;

    const nonStatusUpdates: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by: userId,
      ...this.normalizeLeadPayload(restFields, current.metadata ?? {}),
    };
    if (email !== undefined) nonStatusUpdates['email_encrypted']    = this.enc.encryptNullable(email as string | null);
    if (phone !== undefined) nonStatusUpdates['telefone_encrypted']  = this.enc.encryptNullable(phone as string | null);

    if (statusChanging) {
      const req = {
        entityType: 'lead' as const,
        entityId:   id,
        tenantId,
        actorId:    userId,
        actorRole,
        fromStatus: current.status,
        toStatus:   toStatus as string,
        entity:     current as unknown as Record<string, unknown>,
      };
      await this.ds!.transaction(async (em) => {
        await this.workflowService.transitionInTx(req, em);
        await em.update(LeadEntity, { id, tenant_id: tenantId }, {
          ...nonStatusUpdates,
          status: toStatus as LeadStatus,
        });
      });

      // Emit WORKFLOW_TRANSITIONED for every lead status change
      this.events.emitTyped(DOMAIN_EVENTS.WORKFLOW_TRANSITIONED, {
        tenantId,
        userId,
        aggregateType: 'lead',
        aggregateId:   id,
        payload: {
          entityType:     'lead',
          entityId:       id,
          tenantId,
          fromStatus:     current.status,
          toStatus:       toStatus as string,
          actorId:        userId,
          actorRole,
          reason:         null,
          transitionedAt: new Date().toISOString(),
        },
      });

      // Emit LEAD_CONVERTED when lead is won/closed (FECHADO)
      if (toStatus === LeadStatus.FECHADO) {
        this.events.emitTyped(DOMAIN_EVENTS.LEAD_CONVERTED, {
          tenantId,
          userId,
          aggregateType: 'lead',
          aggregateId:   id,
          payload: {
            leadId:      id,
            tenantId,
            nome:        current.nome,
            empresa:     current.empresa ?? null,
            convertedBy: userId,
            convertedAt: new Date().toISOString(),
          },
        });
      }
    } else {
      await this.repo!.update(
        { id, tenant_id: tenantId } as FindOptionsWhere<LeadEntity>,
        nonStatusUpdates as QueryDeepPartialEntity<LeadEntity>,
      );
    }

    return this.findById(tenantId, id, actorRole);
  }

  async remove(tenantId: string, id: string) {
    await this.findById(tenantId, id);
    await this.repo!.update(
      { id, tenant_id: tenantId } as FindOptionsWhere<LeadEntity>,
      { deleted_at: new Date() } as QueryDeepPartialEntity<LeadEntity>,
    );
    return { deleted: true };
  }

  private normalizeLeadPayload(input: Record<string, unknown>, existingMetadata: Record<string, unknown> = {}) {
    const { name, source, notes, assignedTo, value, metadata, ...rest } = input;
    const mapped: Record<string, unknown> = { ...rest };
    if (name !== undefined) mapped['nome'] = name;
    if (source !== undefined) mapped['fonte'] = source;

    const mergedMetadata = {
      ...existingMetadata,
      ...((metadata ?? {}) as Record<string, unknown>),
    };
    if (notes !== undefined) mergedMetadata['notes'] = notes;
    if (assignedTo !== undefined) mergedMetadata['assignedTo'] = assignedTo;
    if (value !== undefined) mergedMetadata['value'] = value;
    if (
      metadata !== undefined ||
      notes !== undefined ||
      assignedTo !== undefined ||
      value !== undefined
    ) {
      mapped['metadata'] = mergedMetadata;
    }
    return mapped;
  }

  private async recordActivity(
    tenantId: string,
    userId: string,
    entityId: string,
    action: string,
    description: string,
    metadata: Record<string, unknown>,
  ) {
    if (!this.activityLogs) return;
    try {
      await this.activityLogs.create(tenantId, userId || 'system', {
        entity_type: 'lead',
        entity_id:   entityId,
        action,
        description,
        metadata,
      });
    } catch {
      // Activity feed failures are caught by runtime validation; CRUD persistence remains authoritative.
    }
  }
}
