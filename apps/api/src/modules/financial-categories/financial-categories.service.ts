import {
  BadRequestException, ConflictException, ForbiddenException, Inject, Injectable,
  NotFoundException, Optional, ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource, IsNull, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../database/database.tokens';
import {
  FinancialCategoryAuditLogEntity,
  FinancialCategoryCenterEntity,
  FinancialCategoryEntity,
  FinancialCategoryFavoriteEntity,
  FinancialCategoryLinkEntity,
  FinancialCategoryRuleEntity,
  FinancialCategoryRuleRunEntity,
  TransactionEntity,
} from '../../database/entities';
import { EventsService } from '../../core/events/events.service';
import type {
  CategoryRuleDto,
  CreateFinancialCategoryDto,
  ExecuteRulesDto,
  MergeFinancialCategoryDto,
  MoveFinancialCategoryDto,
  QueryFinancialCategoryDto,
  ReorderFinancialCategoryDto,
  SuggestFinancialCategoryDto,
  UpdateCategoryRuleDto,
  UpdateFinancialCategoryDto,
} from './dto/financial-categories.dto';

type AnyRecord = Record<string, unknown>;

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 255) || 'categoria';
}

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

@Injectable()
export class FinancialCategoriesService {
  private readonly categoryRepo: Repository<FinancialCategoryEntity> | null;
  private readonly ruleRepo: Repository<FinancialCategoryRuleEntity> | null;
  private readonly linkRepo: Repository<FinancialCategoryLinkEntity> | null;
  private readonly centerRepo: Repository<FinancialCategoryCenterEntity> | null;
  private readonly auditRepo: Repository<FinancialCategoryAuditLogEntity> | null;
  private readonly favoriteRepo: Repository<FinancialCategoryFavoriteEntity> | null;
  private readonly runRepo: Repository<FinancialCategoryRuleRunEntity> | null;
  private readonly transactionRepo: Repository<TransactionEntity> | null;

  constructor(
    @Inject(DATA_SOURCE) private readonly ds: DataSource | null,
    @Optional() private readonly events?: EventsService,
  ) {
    this.categoryRepo = ds?.getRepository(FinancialCategoryEntity) ?? null;
    this.ruleRepo = ds?.getRepository(FinancialCategoryRuleEntity) ?? null;
    this.linkRepo = ds?.getRepository(FinancialCategoryLinkEntity) ?? null;
    this.centerRepo = ds?.getRepository(FinancialCategoryCenterEntity) ?? null;
    this.auditRepo = ds?.getRepository(FinancialCategoryAuditLogEntity) ?? null;
    this.favoriteRepo = ds?.getRepository(FinancialCategoryFavoriteEntity) ?? null;
    this.runRepo = ds?.getRepository(FinancialCategoryRuleRunEntity) ?? null;
    this.transactionRepo = ds?.getRepository(TransactionEntity) ?? null;
  }

  private get db(): DataSource {
    if (!this.ds) throw new ServiceUnavailableException('Database unavailable for financial categories');
    return this.ds;
  }

  private get categories(): Repository<FinancialCategoryEntity> {
    if (!this.categoryRepo) throw new ServiceUnavailableException('Financial category repository unavailable');
    return this.categoryRepo;
  }

  async list(tenantId: string, query: QueryFinancialCategoryDto, userId?: string) {
    const qb = this.categories.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId', { tenantId })
      .andWhere('c.deleted_at IS NULL');

    if (query.parent_id) qb.andWhere('c.parent_id = :parentId', { parentId: query.parent_id });
    if (query.active !== undefined) qb.andWhere('c.active = :active', { active: query.active });
    if (query.archived !== undefined) qb.andWhere('c.archived = :archived', { archived: query.archived });
    if (query.category_kind) qb.andWhere('c.category_kind = :kind', { kind: query.category_kind });
    if (query.transaction_type) qb.andWhere(':type = ANY(c.transaction_types)', { type: query.transaction_type });
    if (query.search) {
      qb.andWhere('(c.name ILIKE :search OR c.code ILIKE :search OR c.path ILIKE :search)', { search: `%${query.search}%` });
    }
    if (query.entity_type || query.entity_id) {
      qb.innerJoin(FinancialCategoryLinkEntity, 'l', 'l.category_id = c.id AND l.tenant_id = c.tenant_id AND l.deleted_at IS NULL');
      if (query.entity_type) qb.andWhere('l.entity_type = :entityType', { entityType: query.entity_type });
      if (query.entity_id) qb.andWhere('l.entity_id = :entityId', { entityId: query.entity_id });
    }
    if (query.favorite && userId) {
      qb.innerJoin(FinancialCategoryFavoriteEntity, 'f', 'f.category_id = c.id AND f.tenant_id = c.tenant_id AND f.user_id = :userId', { userId });
    }

    qb.orderBy('c.path', 'ASC')
      .addOrderBy('c.tree_order', 'ASC')
      .skip(query.offset ?? 0)
      .take(query.limit ?? 100);

    const [data, total] = await qb.getManyAndCount();
    return { data, meta: { total, offset: query.offset ?? 0, limit: query.limit ?? 100 } };
  }

  async getTree(tenantId: string, query: QueryFinancialCategoryDto) {
    const parentFilter = query.parent_id
      ? 'AND c.parent_id = $2'
      : 'AND c.parent_id IS NULL';
    const params = query.parent_id ? [tenantId, query.parent_id] : [tenantId];
    const data = await this.db.query(`
      SELECT c.*,
        (SELECT COUNT(*)::int FROM financial_categories child WHERE child.tenant_id = c.tenant_id AND child.parent_id = c.id AND child.deleted_at IS NULL) AS children_count,
        (SELECT COUNT(*)::int FROM financial_category_links l WHERE l.tenant_id = c.tenant_id AND l.category_id = c.id AND l.deleted_at IS NULL) AS links_count
      FROM financial_categories c
      WHERE c.tenant_id = $1 AND c.deleted_at IS NULL ${parentFilter}
      ORDER BY c.tree_order ASC, c.name ASC
    `, params);
    return { data };
  }

  async findById(tenantId: string, id: string) {
    const item = await this.categories.findOne({ where: { id, tenant_id: tenantId, deleted_at: IsNull() } as never });
    if (!item) throw new NotFoundException('Categoria financeira não encontrada');
    const [links, centers, rules, audit] = await Promise.all([
      this.linkRepo?.find({ where: { tenant_id: tenantId, category_id: id, deleted_at: IsNull() } as never, take: 50 }) ?? [],
      this.centerRepo?.find({ where: { tenant_id: tenantId, category_id: id } as never, take: 50 }) ?? [],
      this.ruleRepo?.find({ where: { tenant_id: tenantId, category_id: id, deleted_at: IsNull() } as never, order: { priority: 'ASC' } as never, take: 20 }) ?? [],
      this.auditRepo?.find({ where: { tenant_id: tenantId, category_id: id } as never, order: { timestamp: 'DESC' } as never, take: 20 }) ?? [],
    ]);
    return { ...item, links, centers, rules, audit };
  }

  async create(tenantId: string, userId: string, dto: CreateFinancialCategoryDto, ip?: string) {
    const parent = dto.parent_id ? await this.findCategoryEntity(tenantId, dto.parent_id) : null;
    const slug = dto.slug ? slugify(dto.slug) : slugify(dto.name);
    const code = dto.code ?? await this.nextCode(tenantId, dto.name);
    await this.assertUnique(tenantId, slug, code);

    const entity = this.categories.create({
      tenant_id: tenantId,
      parent_id: parent?.id ?? null,
      path: `${parent?.path ?? ''}/${slug}`,
      depth_level: parent ? parent.depth_level + 1 : 0,
      tree_order: dto.tree_order ?? 0,
      name: dto.name,
      slug,
      code,
      description: dto.description ?? null,
      color: dto.color ?? null,
      icon: dto.icon ?? null,
      transaction_types: dto.transaction_types,
      category_kind: dto.category_kind ?? 'operational',
      allow_manual_usage: dto.allow_manual_usage ?? true,
      allow_ai_suggestions: dto.allow_ai_suggestions ?? true,
      sort_order: dto.sort_order ?? dto.tree_order ?? 0,
      metadata: dto.metadata ?? {},
      created_by: userId,
      updated_by: userId,
    } as Partial<FinancialCategoryEntity>);

    const saved = await this.categories.save(entity as FinancialCategoryEntity);
    await this.audit(tenantId, saved.id, 'category.created', userId, {}, saved as unknown as AnyRecord, ip);
    this.emit('category.created', tenantId, userId, saved.id, { category: saved });
    return saved;
  }

  async update(tenantId: string, userId: string, id: string, dto: UpdateFinancialCategoryDto, ip?: string) {
    const current = await this.findCategoryEntity(tenantId, id);
    if (current.protected && (dto.slug || dto.code || dto.parent_id)) {
      throw new ForbiddenException('Categorias protegidas não permitem alterações estruturais');
    }

    const slug = dto.slug ? slugify(dto.slug) : current.slug;
    const code = dto.code ?? current.code;
    if (slug !== current.slug || code !== current.code) await this.assertUnique(tenantId, slug, code, id);

    let parent = current.parent_id ? await this.findCategoryEntity(tenantId, current.parent_id) : null;
    if (dto.parent_id !== undefined && dto.parent_id !== current.parent_id) {
      parent = dto.parent_id ? await this.findCategoryEntity(tenantId, dto.parent_id) : null;
    }

    const patch: Partial<FinancialCategoryEntity> = {
      ...dto,
      slug,
      code,
      parent_id: parent?.id ?? null,
      path: `${parent?.path ?? ''}/${slug}`,
      depth_level: parent ? parent.depth_level + 1 : 0,
      updated_by: userId,
      updated_at: new Date(),
    } as Partial<FinancialCategoryEntity>;

    await this.categories.update({ id, tenant_id: tenantId } as never, patch as never);
    const updated = await this.findCategoryEntity(tenantId, id);
    if (updated.path !== current.path) await this.repathDescendants(tenantId, current.path, updated.path, updated.depth_level - current.depth_level);
    await this.audit(tenantId, id, 'category.updated', userId, current as unknown as AnyRecord, updated as unknown as AnyRecord, ip);
    this.emit('category.updated', tenantId, userId, id, { before: current, after: updated });
    return updated;
  }

  async move(tenantId: string, userId: string, id: string, dto: MoveFinancialCategoryDto, ip?: string) {
    const current = await this.findCategoryEntity(tenantId, id);
    if (current.protected) throw new ForbiddenException('Categoria protegida não pode ser movida');
    const parent = dto.parent_id ? await this.findCategoryEntity(tenantId, dto.parent_id) : null;
    if (parent && parent.path.startsWith(`${current.path}/`)) throw new BadRequestException('Não é permitido mover uma categoria para dentro da própria subárvore');
    const before = { ...current };
    const newPath = `${parent?.path ?? ''}/${current.slug}`;
    const depthDelta = (parent ? parent.depth_level + 1 : 0) - current.depth_level;

    await this.db.transaction(async (manager) => {
      await manager.update(FinancialCategoryEntity, { id, tenant_id: tenantId } as never, {
        parent_id: parent?.id ?? null,
        path: newPath,
        depth_level: parent ? parent.depth_level + 1 : 0,
        tree_order: dto.tree_order ?? current.tree_order,
        updated_by: userId,
        updated_at: new Date(),
      } as never);
      await manager.query(
        `UPDATE financial_categories
         SET path = regexp_replace(path, $3, $4),
             depth_level = depth_level + $5,
             updated_by = $6,
             updated_at = NOW()
         WHERE tenant_id = $1 AND path LIKE $2 AND id <> $7`,
        [tenantId, `${current.path}/%`, `^${current.path}`, newPath, depthDelta, userId, id],
      );
    });

    const updated = await this.findCategoryEntity(tenantId, id);
    await this.audit(tenantId, id, 'category.moved', userId, before as AnyRecord, updated as unknown as AnyRecord, ip);
    this.emit('category.moved', tenantId, userId, id, { before, after: updated });
    return updated;
  }

  async reorder(tenantId: string, userId: string, id: string, dto: ReorderFinancialCategoryDto, ip?: string) {
    const current = await this.findCategoryEntity(tenantId, id);
    await this.categories.update({ id, tenant_id: tenantId } as never, { tree_order: dto.tree_order, sort_order: dto.tree_order, updated_by: userId, updated_at: new Date() } as never);
    const updated = await this.findCategoryEntity(tenantId, id);
    await this.audit(tenantId, id, 'category.reordered', userId, current as unknown as AnyRecord, updated as unknown as AnyRecord, ip);
    return updated;
  }

  async archive(tenantId: string, userId: string, id: string, ip?: string) {
    const current = await this.findCategoryEntity(tenantId, id);
    await this.categories.update({ id, tenant_id: tenantId } as never, { archived: true, active: false, allow_manual_usage: false, updated_by: userId, updated_at: new Date() } as never);
    const updated = await this.findCategoryEntity(tenantId, id, true);
    await this.audit(tenantId, id, 'category.archived', userId, current as unknown as AnyRecord, updated as unknown as AnyRecord, ip);
    this.emit('category.archived', tenantId, userId, id, { category: updated });
    return updated;
  }

  async restore(tenantId: string, userId: string, id: string, ip?: string) {
    const current = await this.findCategoryEntity(tenantId, id, true);
    await this.categories.update({ id, tenant_id: tenantId } as never, { archived: false, active: true, allow_manual_usage: true, deleted_at: null, updated_by: userId, updated_at: new Date() } as never);
    const updated = await this.findCategoryEntity(tenantId, id, true);
    await this.audit(tenantId, id, 'category.restored', userId, current as unknown as AnyRecord, updated as unknown as AnyRecord, ip);
    return updated;
  }

  async softDelete(tenantId: string, userId: string, id: string, ip?: string) {
    const current = await this.findCategoryEntity(tenantId, id);
    if (current.protected || current.system_category) throw new ForbiddenException('Categorias do sistema não podem ser excluídas');
    const txCount = await this.transactionRepo?.count({ where: { tenant_id: tenantId, financial_category_id: id } as never }) ?? 0;
    if (txCount > 0) throw new ConflictException('Categoria vinculada a transações não pode ser excluída fisicamente');
    await this.archive(tenantId, userId, id, ip);
    await this.categories.update({ id, tenant_id: tenantId } as never, { deleted_at: new Date(), updated_by: userId } as never);
    await this.audit(tenantId, id, 'category.deleted', userId, current as unknown as AnyRecord, { deleted_at: new Date().toISOString() }, ip);
    this.emit('category.deleted', tenantId, userId, id, { category: current });
    return { deleted: true };
  }

  async merge(tenantId: string, userId: string, id: string, dto: MergeFinancialCategoryDto, ip?: string) {
    if (id === dto.target_category_id) throw new BadRequestException('Categoria origem e destino devem ser diferentes');
    const source = await this.findCategoryEntity(tenantId, id);
    const target = await this.findCategoryEntity(tenantId, dto.target_category_id);
    if (source.protected || source.system_category) throw new ForbiddenException('Categorias do sistema não podem ser mescladas como origem');

    await this.db.transaction(async (manager) => {
      await manager.update(FinancialCategoryLinkEntity, { tenant_id: tenantId, category_id: id } as never, { category_id: target.id } as never);
      await manager.update(FinancialCategoryCenterEntity, { tenant_id: tenantId, category_id: id } as never, { category_id: target.id } as never);
      await manager.update(FinancialCategoryFavoriteEntity, { tenant_id: tenantId, category_id: id } as never, { category_id: target.id } as never);
      await manager.update(FinancialCategoryRuleEntity, { tenant_id: tenantId, category_id: id } as never, { category_id: target.id, updated_by: userId } as never);
      await manager.update(FinancialCategoryEntity, { tenant_id: tenantId, id } as never, {
        archived: true,
        active: false,
        allow_manual_usage: false,
        metadata: { ...(source.metadata ?? {}), merged_into: target.id, merged_at: new Date().toISOString() },
        updated_by: userId,
        updated_at: new Date(),
      } as never);
    });

    const updated = await this.findCategoryEntity(tenantId, id, true);
    await this.audit(tenantId, id, 'category.merged', userId, source as unknown as AnyRecord, { source: updated, target }, ip);
    return { source: updated, target };
  }

  async descendants(tenantId: string, id: string) {
    const root = await this.findCategoryEntity(tenantId, id);
    const data = await this.categories.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND c.deleted_at IS NULL', { tenantId })
      .andWhere('c.path LIKE :path AND c.id <> :id', { path: `${root.path}/%`, id })
      .orderBy('c.path', 'ASC')
      .getMany();
    return { data };
  }

  async ancestors(tenantId: string, id: string) {
    const item = await this.findCategoryEntity(tenantId, id);
    const slugs = item.path.split('/').filter(Boolean);
    const paths = slugs.map((_, index) => `/${slugs.slice(0, index + 1).join('/')}`);
    const data = await this.categories.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND c.deleted_at IS NULL', { tenantId })
      .andWhere('c.path IN (:...paths)', { paths })
      .orderBy('c.depth_level', 'ASC')
      .getMany();
    return { data };
  }

  async search(tenantId: string, query: QueryFinancialCategoryDto) {
    return this.list(tenantId, { ...query, limit: query.limit ?? 25 });
  }

  async suggest(tenantId: string, dto: SuggestFinancialCategoryDto) {
    const ruleMatches = await this.previewRules(tenantId, { context: dto });
    const contextual = await this.categories.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND c.deleted_at IS NULL AND c.active = true AND c.archived = false', { tenantId })
      .andWhere(dto.transaction_type ? ':type = ANY(c.transaction_types)' : '1=1', { type: dto.transaction_type })
      .orderBy('c.usage_count', 'DESC')
      .addOrderBy('c.updated_at', 'DESC')
      .take(8)
      .getMany();

    return {
      data: [
        ...ruleMatches.data.filter((m) => m.matched).map((m) => ({ source: 'rule', confidence: m.confidence, category: m.category, rule: m.rule })),
        ...contextual.map((category) => ({ source: 'usage', confidence: Math.min(0.85, 0.45 + category.usage_count / 100), category })),
      ],
    };
  }

  async createRule(tenantId: string, userId: string, dto: CategoryRuleDto, ip?: string) {
    if (dto.category_id) await this.findCategoryEntity(tenantId, dto.category_id);
    const rule = this.ruleRepo!.create({
      tenant_id: tenantId,
      category_id: dto.category_id ?? null,
      name: dto.name,
      description: dto.description ?? null,
      priority: dto.priority ?? 100,
      active: dto.active ?? true,
      conditions: dto.conditions,
      actions: dto.actions ?? {},
      created_by: userId,
      updated_by: userId,
    } as Partial<FinancialCategoryRuleEntity>);
    const saved = await this.ruleRepo!.save(rule as FinancialCategoryRuleEntity);
    await this.audit(tenantId, saved.category_id, 'category.rule_created', userId, {}, saved as unknown as AnyRecord, ip);
    return saved;
  }

  async listRules(tenantId: string) {
    const data = await this.ruleRepo!.find({
      where: { tenant_id: tenantId, deleted_at: IsNull() } as never,
      order: { priority: 'ASC', updated_at: 'DESC' } as never,
    });
    return { data };
  }

  async updateRule(tenantId: string, userId: string, id: string, dto: UpdateCategoryRuleDto, ip?: string) {
    const current = await this.ruleRepo!.findOne({ where: { id, tenant_id: tenantId, deleted_at: IsNull() } as never });
    if (!current) throw new NotFoundException('Regra financeira não encontrada');
    if (dto.category_id) await this.findCategoryEntity(tenantId, dto.category_id);

    const patch: Partial<FinancialCategoryRuleEntity> = {
      name: dto.name ?? current.name,
      description: dto.description !== undefined ? dto.description : current.description,
      priority: dto.priority ?? current.priority,
      active: dto.active ?? current.active,
      conditions: dto.conditions ?? current.conditions,
      actions: dto.actions ?? current.actions,
      category_id: dto.category_id !== undefined ? dto.category_id : current.category_id,
      updated_by: userId,
    };

    await this.ruleRepo!.update({ id, tenant_id: tenantId } as never, patch as never);
    const updated = await this.ruleRepo!.findOne({ where: { id, tenant_id: tenantId } as never });
    await this.audit(tenantId, updated?.category_id ?? current.category_id, 'category.rule_updated', userId, current as unknown as AnyRecord, updated as unknown as AnyRecord, ip);
    return updated;
  }

  async deleteRule(tenantId: string, userId: string, id: string, ip?: string) {
    const current = await this.ruleRepo!.findOne({ where: { id, tenant_id: tenantId, deleted_at: IsNull() } as never });
    if (!current) throw new NotFoundException('Regra financeira não encontrada');
    await this.ruleRepo!.update({ id, tenant_id: tenantId } as never, { active: false, updated_by: userId, deleted_at: new Date() } as never);
    await this.audit(tenantId, current.category_id, 'category.rule_deleted', userId, current as unknown as AnyRecord, { deleted: true }, ip);
    return { deleted: true };
  }

  async previewRules(tenantId: string, dto: ExecuteRulesDto) {
    const rules = await this.ruleRepo!.find({ where: { tenant_id: tenantId, active: true, deleted_at: IsNull() } as never, order: { priority: 'ASC' } as never });
    const data = [];
    for (const rule of rules) {
      const matched = this.ruleMatches(rule.conditions, dto.context as AnyRecord);
      const categoryId = String((rule.actions?.category_id as string | undefined) ?? rule.category_id ?? '');
      const category = categoryId ? await this.categoryRepo!.findOne({ where: { tenant_id: tenantId, id: categoryId, deleted_at: IsNull() } as never }) : null;
      data.push({ rule, matched, confidence: matched ? Number(rule.actions?.confidence ?? 0.8) : 0, category });
    }
    return { data };
  }

  async executeRules(tenantId: string, userId: string, dto: ExecuteRulesDto, ip?: string) {
    const preview = await this.previewRules(tenantId, dto);
    const matched = preview.data.filter((item) => item.matched);
    for (const item of matched) {
      await this.ruleRepo!.increment({ id: item.rule.id, tenant_id: tenantId } as never, 'trigger_count', 1);
      await this.ruleRepo!.update({ id: item.rule.id, tenant_id: tenantId } as never, { last_triggered_at: new Date() } as never);
      await this.runRepo!.save(this.runRepo!.create({
        tenant_id: tenantId,
        rule_id: item.rule.id,
        category_id: item.category?.id ?? null,
        context: dto.context,
        result: item as unknown as AnyRecord,
        matched: true,
      } as Partial<FinancialCategoryRuleRunEntity>) as FinancialCategoryRuleRunEntity);
      this.emit('category.rule_triggered', tenantId, userId, item.category?.id ?? item.rule.id, { rule: item.rule, category: item.category, context: dto.context });
      await this.audit(tenantId, item.category?.id ?? null, 'category.rule_triggered', userId, {}, item as unknown as AnyRecord, ip);
    }
    return { data: matched };
  }

  private async findCategoryEntity(tenantId: string, id: string, includeDeleted = false) {
    const where: AnyRecord = { id, tenant_id: tenantId };
    if (!includeDeleted) where.deleted_at = IsNull();
    const item = await this.categories.findOne({ where: where as never });
    if (!item) throw new NotFoundException('Categoria financeira não encontrada');
    return item;
  }

  private async assertUnique(tenantId: string, slug: string, code: string, ignoreId?: string) {
    const exists = await this.categories.createQueryBuilder('c')
      .where('c.tenant_id = :tenantId AND c.deleted_at IS NULL', { tenantId })
      .andWhere('(c.slug = :slug OR c.code = :code)', { slug, code })
      .andWhere(ignoreId ? 'c.id <> :ignoreId' : '1=1', { ignoreId })
      .getOne();
    if (exists) throw new ConflictException('Já existe categoria financeira com este slug ou código');
  }

  private async nextCode(tenantId: string, name: string) {
    const prefix = slugify(name).replace(/-/g, '').slice(0, 6).toUpperCase() || 'CAT';
    const count = await this.categories.count({ where: { tenant_id: tenantId } as never });
    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private async repathDescendants(tenantId: string, oldPath: string, newPath: string, depthDelta: number) {
    await this.db.query(
      `UPDATE financial_categories
       SET path = regexp_replace(path, $3, $4),
           depth_level = depth_level + $5,
           updated_at = NOW()
       WHERE tenant_id = $1 AND path LIKE $2`,
      [tenantId, `${oldPath}/%`, `^${oldPath}`, newPath, depthDelta],
    );
  }

  private ruleMatches(conditions: AnyRecord, context: AnyRecord): boolean {
    const description = normalizeText(context.description);
    const entityText = normalizeText(context.entity_text);
    const bankAccount = normalizeText(context.bank_account);
    const value = Number(context.value ?? 0);

    if (Array.isArray(conditions.description_contains)) {
      const values = conditions.description_contains.map(normalizeText);
      if (!values.some((term) => description.includes(term))) return false;
    }
    if (Array.isArray(conditions.entity_text)) {
      const values = conditions.entity_text.map(normalizeText);
      if (!values.some((term) => entityText.includes(term) || description.includes(term))) return false;
    }
    if (typeof conditions.regex === 'string') {
      try {
        if (!new RegExp(conditions.regex, 'i').test(String(context.description ?? ''))) return false;
      } catch {
        return false;
      }
    }
    if (conditions.bank_account && bankAccount !== normalizeText(conditions.bank_account)) return false;
    if (conditions.min_value !== undefined && value < Number(conditions.min_value)) return false;
    if (conditions.max_value !== undefined && value > Number(conditions.max_value)) return false;
    if (conditions.project_id && conditions.project_id !== context.project_id) return false;
    if (conditions.artist_id && conditions.artist_id !== context.artist_id) return false;
    return true;
  }

  private async audit(tenantId: string, categoryId: string | null, action: string, actorId: string, before: AnyRecord, after: AnyRecord, ip?: string) {
    if (!this.auditRepo) return;
    await this.auditRepo.save(this.auditRepo.create({
      tenant_id: tenantId,
      category_id: categoryId,
      action,
      actor_id: actorId,
      actor_type: 'user',
      before,
      after,
      ip: ip ?? null,
    } as Partial<FinancialCategoryAuditLogEntity>) as FinancialCategoryAuditLogEntity);
  }

  private emit(type: string, tenantId: string, userId: string, aggregateId: string, payload: AnyRecord) {
    this.events?.emit({
      type,
      tenantId,
      userId,
      aggregateType: 'financial_category',
      aggregateId,
      payload,
      occurredAt: new Date().toISOString(),
    });
  }
}
