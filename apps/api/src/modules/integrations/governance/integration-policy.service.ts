/**
 * governance/integration-policy.service.ts
 *
 * POLICY RESOLVER — a composição final:
 *
 *   ADMIN GOVERNANCE (banco: publicação + audiência VIEW/USE)
 * + TECHNICAL CAPABILITY (código: existe adapter?)
 * + AUDIENCE POLICY (plano/tenant do cliente)
 * + TENANT CONNECTION (credenciais/OAuth — permanece SEPARADO)
 * = RESOLVED CLIENT INTEGRATION
 *
 * Cada fator é independente e nenhum substitui o outro:
 *   - publicar não cria capacidade técnica;
 *   - capacidade técnica não concede audiência;
 *   - audiência não conecta o tenant;
 *   - estar conectado não autoriza uso se o admin revogou a audiência.
 *
 * É esta função que o guard de enforcement consulta — por isso mudar a
 * governança no banco muda o comportamento do cliente SEM deploy.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource, Repository } from 'typeorm';
import { DATA_SOURCE } from '../../../database/database.module';
import {
  IntegrationEntity,
  OAuthConnectionEntity,
  PlatformIntegrationEntity,
  IntegrationCategoryEntity,
  BillingPlanEntity,
  type IntegrationAudience,
} from '../../../database/entities';
import {
  ExternalProviderStatus,
  IntegrationStatus,
  IntegrationClassification,
  IntegrationTechnicalState,
  IntegrationPublicationState,
  IntegrationReasonCode,
  CUSTOMER_FACING_CLASSIFICATIONS,
  OPERATIONAL_TECHNICAL_STATES,
  PLAN_INTEGRATIONS_FEATURE_KEY,
} from '@music-os-360/types';
import {
  IntegrationTechnicalCapability,
  technicalCapabilityOf,
  capabilityEvidenceOf,
} from './integration-capability.registry';

export interface ResolvedIntegration {
  providerKey: string;
  name: string;
  category: string | null;
  connectionKind: PlatformIntegrationEntity['connection_kind'];
  /** Rollout comercial — separado de técnico/entitlement/conexão. */
  publicationState: IntegrationPublicationState;
  /** Estado operacional do adapter — separado da capability em código. */
  technicalState: IntegrationTechnicalState;
  /** Classificação arquitetural — comercial / interna / billing. */
  classification: IntegrationClassification;
  /** O plano do tenant inclui este slug (billing_plans.integrations)? */
  entitled: boolean;
  /** Código estável para o frontend ramificar — nunca texto humano. */
  reasonCode: IntegrationReasonCode;
  /** Aparece no catálogo (pode estar bloqueada por plano). */
  canDiscover: boolean;
  /** Pode iniciar conexão/OAuth — NÃO exige estar conectado. */
  canConnect: boolean;
  technicalCapability: IntegrationTechnicalCapability;
  capabilityEvidence: string | null;
  /** Cliente pode ENXERGAR a integração. */
  canView: boolean;
  /** Cliente pode USAR (chamar endpoints). O guard depende disto. */
  canUse: boolean;
  /** Por que USE foi negado — para diagnóstico honesto, nunca para o cliente adivinhar. */
  denyReason: string | null;
  /** Conexão do tenant — dimensão SEPARADA da autorização. */
  connectionStatus: ExternalProviderStatus;
  missingRequirements: string[];
  lastErrorAt: string | null;
  lastErrorReason: string | null;
}

export interface TenantPolicyContext {
  tenantId: string;
  userId: string;
  /**
   * Plano do tenant. A coluna real é `tenants.plan` (TenantPlan) — NÃO
   * `plan_slug`. Ler o nome errado fazia `mode:'plans'` negar para todo mundo,
   * em silêncio e fail-closed (reproduzido em runtime antes desta correção).
   */
  planSlug?: string | null;
  /** Overrides por tenant (`tenants.features`), quando já carregados. */
  tenantFeatures?: Record<string, unknown> | null;
}

@Injectable()
export class IntegrationPolicyService {
  private readonly platformRepo: Repository<PlatformIntegrationEntity> | null = null;
  private readonly categoryRepo: Repository<IntegrationCategoryEntity> | null = null;
  private readonly integRepo:    Repository<IntegrationEntity>         | null = null;
  private readonly oauthRepo:    Repository<OAuthConnectionEntity>     | null = null;
  /** Planos — fonte dos entitlements (billing_plans.integrations). */
  private readonly planRepo: Repository<BillingPlanEntity> | null = null;

  constructor(
    @Inject(DATA_SOURCE) @Optional() ds: DataSource | null,
    private readonly config: ConfigService,
  ) {
    if (ds) {
      this.planRepo = ds.getRepository(BillingPlanEntity);
      this.platformRepo = ds.getRepository(PlatformIntegrationEntity);
      this.categoryRepo = ds.getRepository(IntegrationCategoryEntity);
      this.integRepo    = ds.getRepository(IntegrationEntity);
      this.oauthRepo    = ds.getRepository(OAuthConnectionEntity);
    }
  }

  /** Audiência: 'none' nega, 'all' concede, 'plans'/'tenants' casam o contexto. */
  private audienceAllows(audience: IntegrationAudience | null, ctx: TenantPolicyContext): boolean {
    if (!audience) return false;
    switch (audience.mode) {
      case 'all':     return true;
      case 'plans':   return !!ctx.planSlug && (audience.plans ?? []).includes(ctx.planSlug);
      case 'tenants': return (audience.tenantIds ?? []).includes(ctx.tenantId);
      case 'none':
      default:        return false;
    }
  }

  private missingEnv(requiredEnv: string[]): string[] {
    return (requiredEnv ?? []).filter((name) => {
      const value = this.config.get<string>(name);
      return !value || value.trim() === '';
    });
  }

  /**
   * Planos que incluem um slug comercial — para o upgrade hint. Descoberto por
   * consulta, nunca hardcoded: nenhum nome de plano decide acesso em código.
   */
  async plansIncluding(providerKey: string): Promise<string[]> {
    if (!this.planRepo) return [];
    try {
      const plans = await this.planRepo.find({ where: { active: true }, order: { amount: 'ASC' } });
      return plans
        .filter((p) => Array.isArray(p.integrations) && p.integrations.includes(providerKey))
        .map((p) => p.slug);
    } catch {
      return [];
    }
  }

  /**
   * Slugs comerciais liberados para o tenant.
   *
   * Precedência (documentada porque é semântica, não acidente):
   *   1. `tenants.features.integrations` — override explícito por tenant, quando
   *      presente, VENCE o plano (mecanismo de override já existente).
   *   2. `billing_plans.integrations` do plano ativo do tenant.
   * Falha de leitura NUNCA vira liberação: cai em lista vazia (fail-closed).
   */
  private async resolveEntitledSlugs(ctx: TenantPolicyContext): Promise<string[]> {
    const override = (ctx.tenantFeatures ?? null)?.[PLAN_INTEGRATIONS_FEATURE_KEY];
    if (Array.isArray(override)) {
      return override.filter((s): s is string => typeof s === 'string');
    }

    if (!ctx.planSlug || !this.planRepo) return [];
    try {
      const plan = await this.planRepo.findOne({ where: { slug: ctx.planSlug, active: true } });
      const list = plan?.integrations;
      return Array.isArray(list) ? list.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }

  /**
   * Entitlement = o slug comercial está na lista dinâmica do plano. Estrutura
   * genérica: uma integração comercial nova entra num plano sem schema novo e
   * sem código por provedor.
   */
  private isEntitled(providerKey: string, entitledSlugs: string[]): boolean {
    return entitledSlugs.includes(providerKey);
  }

  async resolveAll(ctx: TenantPolicyContext): Promise<ResolvedIntegration[]> {
    if (!this.platformRepo) return [];

    const [rows, categories] = await Promise.all([
      this.platformRepo.find(),
      this.categoryRepo ? this.categoryRepo.find() : Promise.resolve([] as IntegrationCategoryEntity[]),
    ]);
    if (rows.length === 0) return [];

    const catById = new Map(categories.map((c) => [c.id, c.slug]));
    const keys = rows.map((r) => r.provider_key);

    const [integrations, oauthConns] = await Promise.all([
      this.integRepo
        ? this.integRepo.createQueryBuilder('i')
            .where('i.tenant_id = :tenantId AND i.provider IN (:...keys)', { tenantId: ctx.tenantId, keys })
            .getMany()
        : Promise.resolve([] as IntegrationEntity[]),
      this.oauthRepo
        ? this.oauthRepo.createQueryBuilder('o')
            .where('o.tenant_id = :tenantId AND o.user_id = :userId AND o.provider IN (:...keys)', {
              tenantId: ctx.tenantId, userId: ctx.userId, keys,
            })
            .getMany()
        : Promise.resolve([] as OAuthConnectionEntity[]),
    ]);

    const integByKey = new Map(integrations.map((i) => [i.provider, i]));
    const oauthByKey = new Map(oauthConns.map((o) => [o.provider, o]));
    const features = await this.resolveEntitledSlugs(ctx);

    return rows.map((row) => this.resolveRow(row, catById, integByKey, oauthByKey, ctx, features));
  }

  /** Resolve um único provedor — caminho usado pelo guard de enforcement. */
  async resolveOne(providerKey: string, ctx: TenantPolicyContext): Promise<ResolvedIntegration | null> {
    if (!this.platformRepo) return null;
    const row = await this.platformRepo.findOne({ where: { provider_key: providerKey } });
    if (!row) return null;

    const categories = this.categoryRepo ? await this.categoryRepo.find() : [];
    const catById = new Map(categories.map((c) => [c.id, c.slug]));

    const integ = this.integRepo
      ? await this.integRepo.createQueryBuilder('i')
          .where('i.tenant_id = :tenantId AND i.provider = :key', { tenantId: ctx.tenantId, key: providerKey })
          .getOne()
      : null;
    const oauth = this.oauthRepo
      ? await this.oauthRepo.createQueryBuilder('o')
          .where('o.tenant_id = :tenantId AND o.user_id = :userId AND o.provider = :key', {
            tenantId: ctx.tenantId, userId: ctx.userId, key: providerKey,
          })
          .getOne()
      : null;

    const features = await this.resolveEntitledSlugs(ctx);
    return this.resolveRow(
      row, catById,
      new Map(integ ? [[providerKey, integ]] : []),
      new Map(oauth ? [[providerKey, oauth]] : []),
      ctx,
      features,
    );
  }

  private resolveRow(
    row: PlatformIntegrationEntity,
    catById: Map<string, string>,
    integByKey: Map<string, IntegrationEntity>,
    oauthByKey: Map<string, OAuthConnectionEntity>,
    ctx: TenantPolicyContext,
    features: string[],
  ): ResolvedIntegration {
    const capability = technicalCapabilityOf(row.provider_key);
    const integ = integByKey.get(row.provider_key) ?? null;
    const oauth = oauthByKey.get(row.provider_key) ?? null;

    // Conexão é dimensão SEPARADA e é resolvida antes só para poder compor o
    // reason code — nunca para substituir autorização.
    const connectionStatusPre = this.resolveConnectionStatus(row, integ, oauth);

    const classification = (row.classification as IntegrationClassification)
      ?? IntegrationClassification.COMMERCIAL;
    // Integração interna/billing NUNCA é integração de cliente: a plataforma é
    // que detém a credencial. Fica fora do catálogo comercial mesmo que alguém
    // publique ou abra audiência por engano.
    const customerFacing = CUSTOMER_FACING_CLASSIFICATIONS.includes(classification);
    const entitled = this.isEntitled(row.provider_key, features);

    const technicalState = (row.technical_state as IntegrationTechnicalState)
      ?? IntegrationTechnicalState.PLANNED;
    const publication = (row.publication_state as IntegrationPublicationState)
      ?? IntegrationPublicationState.HIDDEN;

    // Capability em código VETA um technical_state otimista: marcar READY sem
    // adapter no admin não pode criar operação real.
    const technicalReady =
      OPERATIONAL_TECHNICAL_STATES.includes(technicalState)
      && capability === IntegrationTechnicalCapability.IMPLEMENTED;

    // ── DISCOVER: aparece no catálogo? (publication + VIEW) ──────────────────
    // Sem entitlement NÃO some — aparece bloqueada, com upgrade.
    const viewAllowed = this.audienceAllows(row.view_audience, ctx);
    const canDiscover =
      customerFacing
      && publication !== IntegrationPublicationState.HIDDEN
      && viewAllowed;

    // ── CONNECT: pode iniciar OAuth/salvar credencial? ───────────────────────
    // NÃO exige conexão prévia (senão o próprio Connect ficaria impossível).
    const canConnect =
      canDiscover
      && publication !== IntegrationPublicationState.COMING_SOON
      && publication !== IntegrationPublicationState.TEMPORARILY_UNAVAILABLE
      && technicalReady
      && entitled
      && this.audienceAllows(row.use_audience, ctx);

    // ── USE: operar de facto. Precisa de tudo acima + conexão válida. ────────
    let reasonCode: IntegrationReasonCode;
    if (!customerFacing)                                     reasonCode = IntegrationReasonCode.NOT_CUSTOMER_FACING;
    else if (publication === IntegrationPublicationState.HIDDEN)     reasonCode = IntegrationReasonCode.HIDDEN;
    else if (!viewAllowed)                                   reasonCode = IntegrationReasonCode.AUDIENCE_NOT_ALLOWED;
    else if (publication === IntegrationPublicationState.COMING_SOON) reasonCode = IntegrationReasonCode.COMING_SOON;
    else if (publication === IntegrationPublicationState.TEMPORARILY_UNAVAILABLE)
                                                             reasonCode = IntegrationReasonCode.TEMPORARILY_UNAVAILABLE;
    else if (capability === IntegrationTechnicalCapability.NOT_IMPLEMENTED)
                                                             reasonCode = IntegrationReasonCode.NOT_IMPLEMENTED;
    else if (!technicalReady)                                reasonCode = IntegrationReasonCode.TECHNICAL_NOT_READY;
    // Entitlement é avaliado DEPOIS de visibilidade: sem plano a integração
    // continua visível e bloqueada, nunca escondida.
    else if (!entitled)                                      reasonCode = IntegrationReasonCode.PLAN_NOT_INCLUDED;
    else if (!this.audienceAllows(row.use_audience, ctx))    reasonCode = IntegrationReasonCode.AUDIENCE_NOT_ALLOWED;
    else if (connectionStatusPre === ExternalProviderStatus.REQUIRES_REAUTH)
                                                             reasonCode = IntegrationReasonCode.REQUIRES_REAUTH;
    else if (connectionStatusPre === ExternalProviderStatus.PROVIDER_ERROR)
                                                             reasonCode = IntegrationReasonCode.PROVIDER_ERROR;
    else if (connectionStatusPre !== ExternalProviderStatus.CONNECTED)
                                                             reasonCode = IntegrationReasonCode.NOT_CONNECTED;
    else                                                     reasonCode = IntegrationReasonCode.CONNECTED;

    const canUse = reasonCode === IntegrationReasonCode.CONNECTED;
    const canView = canDiscover;
    const denyReason = canUse ? null : reasonCode;

    const connectionStatus = connectionStatusPre;
    const missingRequirements =
      connectionStatus === ExternalProviderStatus.DEPENDENCY_NOT_MET
        ? this.missingEnv(row.required_env)
        : [];
    const isError = connectionStatus === ExternalProviderStatus.PROVIDER_ERROR;

    return {
      providerKey: row.provider_key,
      name: row.name,
      category: row.category_id ? catById.get(row.category_id) ?? null : null,
      connectionKind: row.connection_kind,
      publicationState: publication,
      technicalState,
      classification,
      entitled,
      reasonCode,
      canDiscover,
      canConnect,
      technicalCapability: capability,
      capabilityEvidence: capabilityEvidenceOf(row.provider_key),
      canView,
      canUse,
      denyReason,
      connectionStatus,
      missingRequirements,
      lastErrorAt:     isError ? ((integ?.metadata?.['last_failure_at'] as string) ?? null) : null,
      lastErrorReason: isError ? ((integ?.metadata?.['last_failure_reason'] as string) ?? null) : null,
    };
  }

  /**
   * Conexão do tenant — dimensão independente da autorização. Um provedor pode
   * estar CONNECTED e mesmo assim ter canUse=false (audiência revogada), e é
   * exatamente isso que mantém as duas coisas separadas.
   */
  private resolveConnectionStatus(
    row: PlatformIntegrationEntity,
    integ: IntegrationEntity | null,
    oauth: OAuthConnectionEntity | null,
  ): ExternalProviderStatus {
    if (technicalCapabilityOf(row.provider_key) === IntegrationTechnicalCapability.NOT_IMPLEMENTED) {
      return ExternalProviderStatus.DEPENDENCY_NOT_MET;
    }
    if (this.missingEnv(row.required_env).length > 0) {
      return ExternalProviderStatus.DEPENDENCY_NOT_MET;
    }

    if (row.connection_kind === 'oauth') {
      if (!oauth) return ExternalProviderStatus.AVAILABLE_NOT_CONNECTED;
      if (oauth.metadata?.['needs_reauth'] === true) return ExternalProviderStatus.REQUIRES_REAUTH;
      if (oauth.expires_at && oauth.expires_at.getTime() <= Date.now()) {
        return ExternalProviderStatus.REQUIRES_REAUTH;
      }
      return ExternalProviderStatus.CONNECTED;
    }

    if (row.connection_kind === 'tenant_credentials') {
      if (!integ?.credentials_encrypted) return ExternalProviderStatus.AVAILABLE_NOT_CONNECTED;
      if (integ.status === IntegrationStatus.ERROR || this.hasUnresolvedFailure(integ)) {
        return ExternalProviderStatus.PROVIDER_ERROR;
      }
      return ExternalProviderStatus.CONNECTED;
    }

    if (integ && (integ.status === IntegrationStatus.ERROR || this.hasUnresolvedFailure(integ))) {
      return ExternalProviderStatus.PROVIDER_ERROR;
    }
    return ExternalProviderStatus.CONNECTED;
  }

  /** Falha só conta enquanto não houve sucesso posterior — senão fica presa para sempre. */
  private hasUnresolvedFailure(integ: IntegrationEntity): boolean {
    const failedAt = integ.metadata?.['last_failure_at'] as string | undefined;
    if (!failedAt) return false;
    const succeededAt = integ.metadata?.['last_success_at'] as string | undefined;
    if (!succeededAt) return true;
    return new Date(failedAt).getTime() > new Date(succeededAt).getTime();
  }
}
