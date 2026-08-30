/**
 * governance/integration-admin.service.ts
 *
 * CRUD administrativo da governança de integrações (Portal Admin → Configurações
 * → Integrações). Só escreve o que é REALMENTE governança: categoria, publicação
 * e audiência VIEW/USE.
 *
 * Deliberadamente NÃO editável por aqui:
 *   - capacidade técnica  → é código (integration-capability.registry.ts)
 *   - conexão do tenant   → é credencial do cliente (integrations/oauth_connections)
 * Permitir "ligar" um adapter inexistente por painel seria fabricar capacidade.
 */

import { Injectable, Inject, Optional, NotFoundException, BadRequestException } from '@nestjs/common';
import { IntegrationClassification } from '@music-os-360/types';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import {
  PlatformIntegrationEntity,
  IntegrationCategoryEntity,
  BillingPlanEntity,
  type IntegrationAudience,
} from '../../../database/entities';
import {
  technicalCapabilityOf,
  capabilityEvidenceOf,
  IntegrationTechnicalCapability,
} from './integration-capability.registry';

const AUDIENCE_MODES = ['none', 'all', 'plans', 'tenants'] as const;
const PUBLICATION_STATES = ['hidden', 'coming_soon', 'beta', 'available', 'temporarily_unavailable'] as const;
const TECHNICAL_STATES = [
  'planned', 'in_development', 'configuring', 'awaiting_provider',
  'homologating', 'ready', 'degraded', 'disabled', 'retired',
] as const;

export interface AdminIntegrationView {
  id: string;
  providerKey: string;
  name: string;
  categorySlug: string | null;
  categoryName: string | null;
  connectionKind: string;
  requiredEnv: string[];
  publicationState: string;
  technicalState: string;
  classification: string;
  /** Planos que incluem este slug — read-only aqui; edição vive em Admin Plans. */
  includedInPlans: string[];
  viewAudience: IntegrationAudience;
  useAudience: IntegrationAudience;
  isCore: boolean;
  notes: string | null;
  /** Somente leitura — vem do código, não do banco. */
  technicalCapability: IntegrationTechnicalCapability;
  capabilityEvidence: string | null;
  /** Publicado mas sem adapter: o admin precisa ver essa contradição. */
  publishedWithoutCapability: boolean;
}

@Injectable()
export class IntegrationAdminService {
  private readonly platformRepo: Repository<PlatformIntegrationEntity> | null = null;
  private readonly categoryRepo: Repository<IntegrationCategoryEntity> | null = null;
  private readonly planRepo: Repository<BillingPlanEntity> | null = null;

  constructor(@Inject(DATA_SOURCE) @Optional() ds: DataSource | null) {

    if (ds) {
      this.platformRepo = ds.getRepository(PlatformIntegrationEntity);
      this.categoryRepo = ds.getRepository(IntegrationCategoryEntity);
      this.planRepo     = ds.getRepository(BillingPlanEntity);
    }
  }

  private assertRepos(): void {
    if (!this.platformRepo || !this.categoryRepo) {
      throw new BadRequestException('Integration governance persistence unavailable');
    }
  }


  /** provider_key -> planos que o incluem (billing_plans.integrations). */
  private async loadPlanIntegrationMap(): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (!this.planRepo) return map;
    try {
      const plans = await this.planRepo.find({ where: { active: true }, order: { amount: 'ASC' } });
      for (const p of plans) {
        for (const slug of Array.isArray(p.integrations) ? p.integrations : []) {
          if (typeof slug !== 'string') continue;
          map.set(slug, [...(map.get(slug) ?? []), p.slug]);
        }
      }
    } catch { /* sem planos legíveis → mapa vazio, nunca erro de catálogo */ }
    return map;
  }

  /** Slugs comerciais válidos — usado para validar entitlements de plano. */
  async listCommercialSlugs(): Promise<string[]> {
    this.assertRepos();
    const rows = await this.platformRepo!.find();
    return rows
      .filter((r) => r.classification === IntegrationClassification.COMMERCIAL)
      .map((r) => r.provider_key);
  }

  async listCategories(): Promise<IntegrationCategoryEntity[]> {
    this.assertRepos();
    return this.categoryRepo!.find({ order: { display_order: 'ASC' } });
  }

  /**
   * Catálogo administrativo.
   *
   * Por padrão devolve SOMENTE `commercial`: esta tela governa integrações
   * oferecidas aos clientes, e Soundcharts/ACRCloud/Resend/Stripe deixaram de
   * ser isso (a plataforma é dona da credencial). Eles continuam no banco —
   * `includeNonCommercial` existe para inspeção/auditoria, não para o fluxo
   * comercial normal.
   */
  async list(includeNonCommercial = false): Promise<AdminIntegrationView[]> {
    this.assertRepos();
    const [rows, categories, plans] = await Promise.all([
      this.platformRepo!.find({ order: { name: 'ASC' } }),
      this.categoryRepo!.find(),
      this.loadPlanIntegrationMap(),
    ]);
    const byId = new Map(categories.map((c) => [c.id, c]));
    const visible = includeNonCommercial
      ? rows
      : rows.filter((r) => r.classification === IntegrationClassification.COMMERCIAL);

    return visible.map((row) => {
      const cat = row.category_id ? byId.get(row.category_id) ?? null : null;
      const capability = technicalCapabilityOf(row.provider_key);
      return {
        id: row.id,
        providerKey: row.provider_key,
        name: row.name,
        categorySlug: cat?.slug ?? null,
        categoryName: cat?.name ?? null,
        connectionKind: row.connection_kind,
        requiredEnv: row.required_env ?? [],
        publicationState: row.publication_state,
        technicalState: row.technical_state,
        classification: row.classification,
        includedInPlans: plans.get(row.provider_key) ?? [],
        viewAudience: row.view_audience,
        useAudience: row.use_audience,
        isCore: row.is_core,
        notes: row.notes,
        technicalCapability: capability,
        capabilityEvidence: capabilityEvidenceOf(row.provider_key),
        publishedWithoutCapability:
          row.publication_state === 'published'
          && capability === IntegrationTechnicalCapability.NOT_IMPLEMENTED,
      };
    });
  }

  /**
   * Persiste os entitlements de integração de um plano em
   * `billing_plans.integrations` — coluna canônica da tabela de planos.
   *
   * Rejeita silenciosamente (filtra) slugs que não podem ser entitlement:
   * inexistentes, internos e billing. Entitlement comercial para infraestrutura
   * interna não pode existir nem por engano do admin.
   */
  async setPlanIntegrations(planSlug: string, slugs: string[]): Promise<{
    planSlug: string; integrations: string[]; rejected: string[];
  }> {
    if (!this.planRepo) throw new BadRequestException('Persistência de planos indisponível');

    const allowed = new Set(await this.listCommercialSlugs());
    const requested = Array.isArray(slugs) ? slugs.filter((s) => typeof s === 'string') : [];
    const accepted = [...new Set(requested.filter((s) => allowed.has(s)))];
    const rejected = requested.filter((s) => !allowed.has(s));

    const plan = await this.planRepo.findOne({ where: { slug: planSlug } });
    if (!plan) throw new NotFoundException(`Plano não encontrado: ${planSlug}`);

    // Escrita via REPOSITÓRIO: a DataSource tenant-aware filtra UPDATE cru em
    // billing_plans (0 linhas, sem erro) — o repo é o caminho que persiste.
    await this.planRepo.update(
      { id: plan.id } as never,
      { integrations: accepted, updated_at: new Date() } as never,
    );

    return { planSlug, integrations: accepted, rejected };
  }

  async getPlanIntegrations(planSlug: string): Promise<string[]> {
    if (!this.planRepo) return [];
    const plan = await this.planRepo.findOne({ where: { slug: planSlug } });
    const list = plan?.integrations;
    return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
  }

  private validateAudience(audience: unknown, field: string): IntegrationAudience {
    const a = audience as Partial<IntegrationAudience> | undefined;
    if (!a || !AUDIENCE_MODES.includes(a.mode as never)) {
      throw new BadRequestException(`${field}.mode inválido — use: ${AUDIENCE_MODES.join(', ')}`);
    }
    return {
      mode: a.mode as IntegrationAudience['mode'],
      plans: Array.isArray(a.plans) ? a.plans.filter((p) => typeof p === 'string') : [],
      tenantIds: Array.isArray(a.tenantIds) ? a.tenantIds.filter((t) => typeof t === 'string') : [],
    };
  }

  async update(id: string, patch: {
    categoryId?: string | null;
    publicationState?: string;
    technicalState?: string;
    viewAudience?: unknown;
    useAudience?: unknown;
    notes?: string | null;
  }): Promise<AdminIntegrationView> {
    this.assertRepos();
    const row = await this.platformRepo!.findOne({ where: { id } });
    if (!row) throw new NotFoundException('Integração não encontrada');

    const updates: Partial<PlatformIntegrationEntity> = {};

    if (patch.publicationState !== undefined) {
      if (!PUBLICATION_STATES.includes(patch.publicationState as never)) {
        throw new BadRequestException(`publicationState inválido — use: ${PUBLICATION_STATES.join(', ')}`);
      }
      updates.publication_state = patch.publicationState as PlatformIntegrationEntity['publication_state'];
    }
    if (patch.technicalState !== undefined) {
      if (!TECHNICAL_STATES.includes(patch.technicalState as never)) {
        throw new BadRequestException(`technicalState inválido — use: ${TECHNICAL_STATES.join(', ')}`);
      }
      updates.technical_state = patch.technicalState;
    }
    if (patch.viewAudience !== undefined) {
      updates.view_audience = this.validateAudience(patch.viewAudience, 'viewAudience');
    }
    if (patch.useAudience !== undefined) {
      updates.use_audience = this.validateAudience(patch.useAudience, 'useAudience');
    }
    if (patch.categoryId !== undefined) {
      if (patch.categoryId) {
        const cat = await this.categoryRepo!.findOne({ where: { id: patch.categoryId } });
        if (!cat) throw new BadRequestException('Categoria inexistente');
      }
      updates.category_id = patch.categoryId;
    }
    if (patch.notes !== undefined) updates.notes = patch.notes;

    if (Object.keys(updates).length > 0) {
      await this.platformRepo!.update({ id } as never, { ...updates, updated_at: new Date() } as never);
    }

    const refreshed = (await this.list()).find((r) => r.id === id);
    if (!refreshed) throw new NotFoundException('Integração não encontrada após atualização');
    return refreshed;
  }
}
