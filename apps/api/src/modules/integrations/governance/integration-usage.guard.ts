/**
 * governance/integration-usage.guard.ts
 *
 * BACKEND ENFORCEMENT — o requisito que faltava.
 *
 * Esconder um card no frontend não é autorização: quem chamar a API direto
 * (curl, script, token roubado, cliente antigo em cache) passaria. Este guard
 * fecha isso no backend, consultando o MESMO policy resolver que o frontend usa.
 *
 * Uso:
 *   @UseGuards(IntegrationUsageGuard)
 *   @RequiresIntegration('docusign')
 *   createDocument(...) { ... }
 *
 * Fail-closed em todos os caminhos: provedor desconhecido, política ausente,
 * contexto de tenant ausente ou resolver indisponível → 403. Nunca "deixa
 * passar por não conseguir decidir".
 */

import {
  CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IntegrationPolicyService } from './integration-policy.service';

export const REQUIRES_INTEGRATION = 'requires_integration';

/**
 * `use`     — operação real: exige tudo, inclusive conexão válida.
 * `connect` — iniciar OAuth/salvar credencial: exige publicação, capacidade
 *             técnica, audiência e entitlement, mas obviamente NÃO exige que a
 *             conta já esteja conectada (senão conectar seria impossível).
 */
export type IntegrationRequirementMode = 'use' | 'connect';

export interface IntegrationRequirement {
  providerKey: string;
  mode: IntegrationRequirementMode;
}

export const RequiresIntegration = (
  providerKey: string,
  mode: IntegrationRequirementMode = 'use',
) => SetMetadata(REQUIRES_INTEGRATION, { providerKey, mode } as IntegrationRequirement);

/** Mensagens por reason code — honestas, sem expor governança interna. */
const DENY_MESSAGE: Record<string, string> = {
  NOT_CUSTOMER_FACING:     'Esta integração não é uma integração de cliente.',
  HIDDEN:                  'Esta integração não está disponível nesta plataforma.',
  COMING_SOON:             'Esta integração ainda não está disponível.',
  TECHNICAL_NOT_READY:     'Esta integração ainda não está operacional.',
  NOT_IMPLEMENTED:         'Esta integração ainda não está implementada.',
  TEMPORARILY_UNAVAILABLE: 'Esta integração está temporariamente indisponível.',
  AUDIENCE_NOT_ALLOWED:    'Esta integração não está habilitada para a sua conta.',
  PLAN_NOT_INCLUDED:       'O seu plano não inclui esta integração.',
  NOT_CONNECTED:           'Conecte a sua conta antes de usar esta integração.',
  REQUIRES_REAUTH:         'A conexão expirou — reconecte a sua conta.',
  PROVIDER_ERROR:          'A última comunicação com o provedor falhou.',
};

@Injectable()
export class IntegrationUsageGuard implements CanActivate {
  private readonly logger = new Logger(IntegrationUsageGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly policy: IntegrationPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requirement = this.reflector.getAllAndOverride<IntegrationRequirement>(
      REQUIRES_INTEGRATION,
      [context.getHandler(), context.getClass()],
    );
    // Handler não declara exigência → guard não opina.
    if (!requirement?.providerKey) return true;
    const { providerKey, mode } = requirement;

    const req = context.switchToHttp().getRequest();
    const tenantId = req.tenant?.id ?? req.tenantId;
    const userId   = req.auth?.userId ?? req.user?.id ?? req.userId;

    if (!tenantId) {
      this.logger.warn(`[integration-usage] ${providerKey}: sem contexto de tenant — negado (fail-closed)`);
      throw new ForbiddenException('Contexto de tenant ausente para autorizar a integração.');
    }

    const resolved = await this.policy.resolveOne(providerKey, {
      tenantId,
      userId: userId ?? '',
      // tenants.plan é a coluna real (TenantPlan). plan_slug/planSlug NÃO existem —
      // lê-los fazia mode:'plans' negar para todos, em silêncio.
      planSlug: req.tenant?.plan ?? null,
      tenantFeatures: (req.tenant?.features as Record<string, unknown> | undefined) ?? null,
    });

    if (!resolved) {
      this.logger.warn(`[integration-usage] ${providerKey}: sem política registada — negado (fail-closed)`);
      throw new ForbiddenException('Esta integração não está disponível nesta plataforma.');
    }

    const allowed = mode === 'connect' ? resolved.canConnect : resolved.canUse;
    if (!allowed) {
      this.logger.warn(
        `[integration-usage] ${providerKey} (${mode}): negado para tenant=${tenantId} — reason=${resolved.reasonCode}`,
      );
      throw new ForbiddenException(
        DENY_MESSAGE[resolved.reasonCode] ?? 'Uso desta integração não autorizado.',
      );
    }

    return true;
  }
}
