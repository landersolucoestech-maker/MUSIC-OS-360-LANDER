/**
 * forms/forms.service.ts
 *
 * Formulários de captação com sync automático para CRM (LeadEntity).
 * Toda submissão pode criar/actualizar um lead e dispara automações.
 */

import { Injectable, Inject, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE }           from '../../database/database.module';
import { FormEntity, FormSubmissionEntity, LeadEntity } from '../../database/entities';
import { EventsService, DOMAIN_EVENTS }                 from '../../core/events/events.service';
import type { CreateFormDto, UpdateFormDto, QueryFormDto, SubmitFormDto } from './dto/forms.dto';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  private readonly formRepo:  Repository<FormEntity>           | null = null;
  private readonly subRepo:   Repository<FormSubmissionEntity> | null = null;
  private readonly leadRepo:  Repository<LeadEntity>           | null = null;

  constructor(
    @Inject(DATA_SOURCE) ds: DataSource | null,
    private readonly events: EventsService,
  ) {
    if (ds) {
      this.formRepo = ds.getRepository(FormEntity);
      this.subRepo  = ds.getRepository(FormSubmissionEntity);
      this.leadRepo = ds.getRepository(LeadEntity);
    }
  }

  // ── Forms CRUD ─────────────────────────────────────────────────────────────

  async list(tenantId: string, query: QueryFormDto) {
    const qb = this.formRepo!
      .createQueryBuilder('f')
      .where('f.tenant_id = :tenantId', { tenantId })
      .andWhere('f.deleted_at IS NULL');

    if (query.status) qb.andWhere('f.status = :status', { status: query.status });
    if (query.search) qb.andWhere('f.name ILIKE :search', { search: `%${query.search}%` });

    qb.orderBy('f.created_at', 'DESC').skip(query.offset ?? 0).take(query.limit ?? 50);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 50 } };
  }

  async findById(tenantId: string, id: string): Promise<FormEntity> {
    const form = await this.formRepo!
      .createQueryBuilder('f')
      .where('f.id = :id AND f.tenant_id = :tenantId AND f.deleted_at IS NULL', { id, tenantId })
      .getOne();
    if (!form) throw new NotFoundException('Formulário não encontrado');
    return form;
  }

  async create(tenantId: string, userId: string, dto: CreateFormDto): Promise<FormEntity> {
    const form = this.formRepo!.create({
      tenant_id:   tenantId,
      name:        dto.name,
      description: dto.description ?? null,
      fields:      dto.fields      ?? [],
      settings:    dto.settings    ?? {},
      status:      'draft',
      created_by:  userId,
    });
    return this.formRepo!.save(form);
  }

  async update(tenantId: string, id: string, dto: UpdateFormDto): Promise<FormEntity> {
    await this.findById(tenantId, id);
    const updates: Record<string, unknown> = { updated_at: new Date() };

    if (dto.name        != null) updates['name']        = dto.name;
    if (dto.description != null) updates['description'] = dto.description;
    if (dto.fields      != null) updates['fields']      = dto.fields;
    if (dto.settings    != null) updates['settings']    = dto.settings;
    if (dto.status      != null) updates['status']      = dto.status;

    await this.formRepo!.update({ id, tenant_id: tenantId } as any, updates as any);
    return this.findById(tenantId, id);
  }

  async softDelete(tenantId: string, id: string): Promise<{ deleted: boolean }> {
    await this.findById(tenantId, id);
    await this.formRepo!.update({ id, tenant_id: tenantId } as any, { deleted_at: new Date() } as any);
    return { deleted: true };
  }

  // ── Submissions ───────────────────────────────────────────────────────────

  async submit(
    tenantId: string,
    formId:   string,
    dto:      SubmitFormDto,
    ip?:      string,
  ): Promise<FormSubmissionEntity> {
    const form = await this.findById(tenantId, formId);

    if (form.status !== 'active') {
      throw new BadRequestException('Formulário não está activo');
    }

    // ── CRM sync: find or create lead from email ─────────────────────────────
    let leadId: string | null = null;
    const email = dto.data['email'] as string | undefined;
    const name  = (dto.data['name'] ?? dto.data['nome']) as string | undefined;

    if (email && this.leadRepo) {
      const existing = await this.leadRepo
        .createQueryBuilder('l')
        .where('l.tenant_id = :tenantId AND l.email_encrypted ILIKE :email AND l.deleted_at IS NULL', {
          tenantId,
          email: `%${email}%`,
        })
        .getOne();

      if (existing) {
        leadId = existing.id;
      } else if (name) {
        const lead = this.leadRepo.create({
          tenant_id: tenantId,
          nome:      name,
          email_encrypted: email,
          origem:    dto.origin ? `form:${formId}:${dto.origin}` : `form:${formId}`,
          status:    'novo' as any,
          metadata:  { form_id: formId, source: 'form_submission' },
        } as any);
        const saved = await this.leadRepo.save(lead as any);
        leadId = (saved as any).id;

        this.events.emitTyped(DOMAIN_EVENTS.LEAD_CREATED, {
          tenantId,
          userId:        'system:form',
          aggregateType: 'lead',
          aggregateId:   leadId!,
          payload: {
            tenantId,
            leadId:  leadId!,
            nome:    name,
            origem:  `form:${formId}`,
          },
        });

        this.logger.log(`FormsService: lead criado via form ${formId} — lead=${leadId}`);
      }
    }

    // ── Persist submission ────────────────────────────────────────────────────
    const submission = this.subRepo!.create({
      form_id:   formId,
      tenant_id: tenantId,
      lead_id:   leadId,
      data:      dto.data,
      origin:    dto.origin ?? null,
      ip:        ip ?? null,
      metadata:  { form_name: form.name },
    });
    const saved = await this.subRepo!.save(submission);

    // Increment submission_count
    await this.formRepo!
      .createQueryBuilder()
      .update()
      .set({ submission_count: () => 'submission_count + 1', updated_at: new Date() } as any)
      .where('id = :id', { id: formId })
      .execute();

    this.events.emitTyped(DOMAIN_EVENTS.LEAD_UPDATED, {
      tenantId,
      userId:        'system:form',
      aggregateType: 'form_submission',
      aggregateId:   saved.id,
      payload: {
        tenantId,
        aggregateType: 'form_submission',
        aggregateId:   saved.id,
        action:        'submitted',
      },
    });

    return saved;
  }

  async listSubmissions(tenantId: string, formId: string, limit = 50, offset = 0) {
    await this.findById(tenantId, formId);

    const [data, total] = await this.subRepo!
      .createQueryBuilder('s')
      .where('s.form_id = :formId AND s.tenant_id = :tenantId', { formId, tenantId })
      .orderBy('s.created_at', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { data, meta: { total, offset, limit } };
  }
}
