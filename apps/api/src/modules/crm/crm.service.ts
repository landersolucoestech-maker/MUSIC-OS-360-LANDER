import { Injectable, Inject, NotFoundException, ConflictException } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.module';
import {
  CrmContactEntity, CrmCompanyEntity, CrmTagEntity,
  CrmContactTagEntity, CrmTaskEntity, CrmTimelineEventEntity,
} from '../../database/entities';
import { EncryptionService } from '../../core/security/encryption.service';
import { EventsService, DOMAIN_EVENTS } from '../../core/events/events.service';
import type {
  CreateContactDto, UpdateContactDto, QueryContactDto,
  CreateCompanyDto, UpdateCompanyDto, QueryCompanyDto,
  CreateTagDto, CreateCrmTaskDto, UpdateCrmTaskDto, QueryCrmTaskDto,
} from './dto/crm.dto';

@Injectable()
export class CrmService {
  private contacts!:  Repository<CrmContactEntity>;
  private companies!: Repository<CrmCompanyEntity>;
  private tags!:      Repository<CrmTagEntity>;
  private ctags!:     Repository<CrmContactTagEntity>;
  private tasks!:     Repository<CrmTaskEntity>;
  private timeline!:  Repository<CrmTimelineEventEntity>;

  constructor(
    @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    private readonly enc:    EncryptionService,
    private readonly events: EventsService,
  ) {
    if (ds) {
      this.contacts  = ds.getRepository(CrmContactEntity);
      this.companies = ds.getRepository(CrmCompanyEntity);
      this.tags      = ds.getRepository(CrmTagEntity);
      this.ctags     = ds.getRepository(CrmContactTagEntity);
      this.tasks     = ds.getRepository(CrmTaskEntity);
      this.timeline  = ds.getRepository(CrmTimelineEventEntity);
    }
  }

  // ── Company operations ─────────────────────────────────────────────────────

  async listCompanies(tenantId: string, q: QueryCompanyDto) {
    const qb = this.companies.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND c.deleted_at IS NULL', { tenantId });
    if (q.search)   qb.andWhere('c.name ILIKE :s', { s: `%${q.search}%` });
    if (q.industry) qb.andWhere('c.industry = :i', { i: q.industry });
    qb.orderBy('c.name', 'ASC').skip(q.offset ?? 0).take(q.limit ?? 50);
    const [data, total] = await qb.getManyAndCount();
    return { data: data.map(c => this.mapCompany(c)), meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findCompanyById(tenantId: string, id: string) {
    const c = await this.companies.findOne({ where: { id, tenant_id: tenantId } });
    if (!c || c.deleted_at) throw new NotFoundException('Empresa não encontrada');
    return this.mapCompany(c);
  }

  async createCompany(tenantId: string, userId: string, dto: CreateCompanyDto) {
    const { email, phone, ...rest } = dto;
    const entity = this.companies.create({
      tenant_id: tenantId,
      ...rest,
      email_encrypted: this.enc.encryptNullable(email),
      phone_encrypted: this.enc.encryptNullable(phone),
      created_by: userId,
    });
    return this.mapCompany(await this.companies.save(entity));
  }

  async updateCompany(tenantId: string, id: string, dto: UpdateCompanyDto) {
    const c = await this.findCompanyById(tenantId, id);
    const { email, phone, ...rest } = dto;
    const updates: Record<string, unknown> = { ...rest, updated_at: new Date() };
    if (email !== undefined) updates['email_encrypted'] = this.enc.encryptNullable(email);
    if (phone !== undefined) updates['phone_encrypted'] = this.enc.encryptNullable(phone);
    await this.companies.update({ id, tenant_id: tenantId }, updates);
    return this.findCompanyById(tenantId, c.id);
  }

  async deleteCompany(tenantId: string, id: string) {
    await this.findCompanyById(tenantId, id);
    await this.companies.update({ id, tenant_id: tenantId }, { deleted_at: new Date() });
    return { deleted: true };
  }

  private mapCompany(c: CrmCompanyEntity) {
    return {
      ...c,
      email: this.enc.decryptNullable(c.email_encrypted),
      phone: this.enc.decryptNullable(c.phone_encrypted),
      email_encrypted: undefined,
      phone_encrypted: undefined,
    };
  }

  // ── Contact operations ─────────────────────────────────────────────────────

  async listContacts(tenantId: string, q: QueryContactDto) {
    const qb = this.contacts.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND c.deleted_at IS NULL', { tenantId });
    if (q.search)      qb.andWhere('c.name ILIKE :s OR c.job_title ILIKE :s', { s: `%${q.search}%` });
    if (q.company_id)  qb.andWhere('c.company_id = :cid', { cid: q.company_id });
    if (q.status)      qb.andWhere('c.status = :st', { st: q.status });
    if (q.assigned_to) qb.andWhere('c.assigned_to = :at', { at: q.assigned_to });
    if (q.tag) {
      qb.innerJoin('crm_contact_tags', 'ct', 'ct.contact_id = c.id')
        .innerJoin('crm_tags', 't', 't.id = ct.tag_id AND t.name = :tag', { tag: q.tag });
    }
    qb.orderBy('c.name', 'ASC').skip(q.offset ?? 0).take(q.limit ?? 50);
    const [data, total] = await qb.getManyAndCount();
    return { data: data.map(c => this.mapContact(c)), meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async findContactById(tenantId: string, id: string) {
    const c = await this.contacts.findOne({ where: { id, tenant_id: tenantId } });
    if (!c || c.deleted_at) throw new NotFoundException('Contacto não encontrado');
    return this.mapContact(c);
  }

  async createContact(tenantId: string, userId: string, dto: CreateContactDto) {
    const { email, phone, ...rest } = dto;
    const entity = this.contacts.create({
      tenant_id: tenantId,
      ...rest,
      email_encrypted: this.enc.encryptNullable(email),
      phone_encrypted: this.enc.encryptNullable(phone),
      created_by: userId,
      updated_by: userId,
    });
    const saved = await this.contacts.save(entity);
    if (dto.company_id) {
      await this.companies.increment({ id: dto.company_id, tenant_id: tenantId }, 'contact_count', 1);
    }
    await this.addTimelineEvent(tenantId, saved.id, 'contact.created', 'Contacto criado', {}, userId);
    this.events.emitTyped(DOMAIN_EVENTS.LEAD_CREATED, {
      tenantId,
      userId:        userId,
      aggregateType: 'crm_contact',
      aggregateId:   saved.id,
      payload: {
        tenantId,
        leadId:  saved.id,
        nome:    saved.name,
        origem:  dto.source ?? 'crm',
      },
    });
    return this.mapContact(saved);
  }

  async updateContact(tenantId: string, id: string, userId: string, dto: UpdateContactDto) {
    const current = await this.findContactById(tenantId, id);
    const { email, phone, ...rest } = dto;
    const updates: Record<string, unknown> = { ...rest, updated_by: userId, updated_at: new Date() };
    if (email !== undefined) updates['email_encrypted'] = this.enc.encryptNullable(email);
    if (phone !== undefined) updates['phone_encrypted'] = this.enc.encryptNullable(phone);
    await this.contacts.update({ id, tenant_id: tenantId }, updates);
    if (dto.company_id && dto.company_id !== current.company_id) {
      if (current.company_id) {
        await this.companies.decrement({ id: current.company_id, tenant_id: tenantId }, 'contact_count', 1);
      }
      await this.companies.increment({ id: dto.company_id, tenant_id: tenantId }, 'contact_count', 1);
    }
    return this.findContactById(tenantId, id);
  }

  async deleteContact(tenantId: string, id: string) {
    const c = await this.findContactById(tenantId, id);
    await this.contacts.update({ id, tenant_id: tenantId }, { deleted_at: new Date() });
    if (c.company_id) {
      await this.companies.decrement({ id: c.company_id, tenant_id: tenantId }, 'contact_count', 1);
    }
    return { deleted: true };
  }

  private mapContact(c: CrmContactEntity) {
    return {
      ...c,
      email: this.enc.decryptNullable(c.email_encrypted),
      phone: this.enc.decryptNullable(c.phone_encrypted),
      email_encrypted: undefined,
      phone_encrypted: undefined,
    };
  }

  // ── Tag operations ─────────────────────────────────────────────────────────

  async listTags(tenantId: string) {
    return this.tags.find({ where: { tenant_id: tenantId }, order: { name: 'ASC' } });
  }

  async createTag(tenantId: string, dto: CreateTagDto) {
    const existing = await this.tags.findOne({ where: { tenant_id: tenantId, name: dto.name } });
    if (existing) throw new ConflictException(`Tag '${dto.name}' já existe`);
    return this.tags.save(this.tags.create({ tenant_id: tenantId, name: dto.name, color: dto.color ?? '#6366f1' }));
  }

  async deleteTag(tenantId: string, id: string) {
    await this.tags.delete({ id, tenant_id: tenantId });
    return { deleted: true };
  }

  async addTagToContact(tenantId: string, contactId: string, tagId: string) {
    await this.findContactById(tenantId, contactId);
    const existing = await this.ctags.findOne({ where: { contact_id: contactId, tag_id: tagId } });
    if (existing) return existing;
    return this.ctags.save(this.ctags.create({ tenant_id: tenantId, contact_id: contactId, tag_id: tagId }));
  }

  async removeTagFromContact(tenantId: string, contactId: string, tagId: string) {
    await this.ctags.delete({ contact_id: contactId, tag_id: tagId, tenant_id: tenantId });
    return { removed: true };
  }

  async getContactTags(tenantId: string, contactId: string) {
    return this.ctags.find({
      where: { contact_id: contactId, tenant_id: tenantId },
      relations: ['tag'],
    });
  }

  // ── Task operations ────────────────────────────────────────────────────────

  async listTasks(tenantId: string, q: QueryCrmTaskDto) {
    const qb = this.tasks.createQueryBuilder('t').where('t.tenant_id = :tenantId', { tenantId });
    if (q.contact_id)  qb.andWhere('t.contact_id = :cid', { cid: q.contact_id });
    if (q.status)      qb.andWhere('t.status = :st', { st: q.status });
    if (q.assigned_to) qb.andWhere('t.assigned_to = :at', { at: q.assigned_to });
    qb.orderBy('t.due_date', 'ASC', 'NULLS LAST').skip(q.offset ?? 0).take(q.limit ?? 50);
    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: q.offset ?? 0, limit: q.limit ?? 50 } };
  }

  async createTask(tenantId: string, userId: string, dto: CreateCrmTaskDto) {
    const entity = this.tasks.create({
      tenant_id: tenantId,
      ...dto,
      due_date: dto.due_date ? new Date(dto.due_date) : null,
      created_by: userId,
    });
    const saved = await this.tasks.save(entity);
    if (dto.contact_id) {
      await this.addTimelineEvent(tenantId, dto.contact_id, 'task.created', `Tarefa criada: ${dto.title}`, { task_id: saved.id }, userId);
    }
    return saved;
  }

  async updateTask(tenantId: string, id: string, userId: string, dto: UpdateCrmTaskDto) {
    const task = await this.tasks.findOne({ where: { id, tenant_id: tenantId } });
    if (!task) throw new NotFoundException('Tarefa não encontrada');
    const updates: Record<string, unknown> = { ...dto, updated_at: new Date() };
    if (dto.status === 'done' && !task.completed_at) updates['completed_at'] = new Date();
    if (dto.due_date) updates['due_date'] = new Date(dto.due_date);
    await this.tasks.update({ id, tenant_id: tenantId }, updates);
    return this.tasks.findOne({ where: { id } });
  }

  async deleteTask(tenantId: string, id: string) {
    const t = await this.tasks.findOne({ where: { id, tenant_id: tenantId } });
    if (!t) throw new NotFoundException('Tarefa não encontrada');
    await this.tasks.delete({ id });
    return { deleted: true };
  }

  // ── Timeline ───────────────────────────────────────────────────────────────

  async getTimeline(tenantId: string, contactId: string, limit = 50, offset = 0) {
    await this.findContactById(tenantId, contactId);
    const [data, total] = await this.timeline.findAndCount({
      where: { tenant_id: tenantId, contact_id: contactId },
      order: { occurred_at: 'DESC' },
      skip: offset,
      take: limit,
    });
    return { data, meta: { total, offset, limit } };
  }

  async addTimelineEvent(
    tenantId:   string,
    contactId:  string,
    eventType:  string,
    summary:    string | null,
    payload:    Record<string, unknown>,
    actorId?:   string,
  ) {
    return this.timeline.save(this.timeline.create({
      tenant_id:  tenantId,
      contact_id: contactId,
      event_type: eventType,
      summary,
      payload,
      actor_id:   actorId ?? null,
    }));
  }
}
