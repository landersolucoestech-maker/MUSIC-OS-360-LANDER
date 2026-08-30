/**
 * governance/integration-capability.registry.ts
 *
 * CAPACIDADE TÉCNICA — a única parte da governança que continua em código, e
 * deliberadamente: implementação técnica É código. Um admin não pode "ligar" um
 * adapter que não existe, então isto não é editável por painel.
 *
 * O que É editável pelo admin vive no banco (platform_integrations):
 * publicação e audiência VIEW/USE. O erro que este arquivo corrige é o oposto —
 * antes um catálogo .ts decidia QUEM ENXERGA o quê, que é governança e exigia
 * deploy para mudar.
 *
 * Regra de ouro do resolver: publicar nunca cria capacidade. Um provedor
 * publicado sem adapter continua NOT_IMPLEMENTED e o USE nunca é liberado.
 */

export enum IntegrationTechnicalCapability {
  /** Existe adapter real e ligado ao módulo. */
  IMPLEMENTED     = 'implemented',
  /** Não existe adapter no backend — nenhuma credencial resolve isto. */
  NOT_IMPLEMENTED = 'not_implemented',
}

/**
 * Cada entrada aponta para a evidência no código. Ao adicionar um provedor,
 * cite o adapter real — se não houver arquivo a citar, é NOT_IMPLEMENTED.
 */
const CAPABILITY: Record<string, { capability: IntegrationTechnicalCapability; evidence: string }> = {
  autentique:    { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations/autentique/autentique.service.ts' },
  docusign:      { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations/docusign/docusign.service.ts' },
  clicksign:     { capability: IntegrationTechnicalCapability.NOT_IMPLEMENTED, evidence: 'sem adapter em apps/api/src; useClicksign é stub desligado' },
  abramus:       { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations/abramus/abramus.service.ts' },
  ubc:           { capability: IntegrationTechnicalCapability.NOT_IMPLEMENTED, evidence: 'sem adapter em apps/api/src; useUbc lança UBC_UNAVAILABLE' },
  ecad:          { capability: IntegrationTechnicalCapability.NOT_IMPLEMENTED, evidence: 'sem adapter em apps/api/src' },
  nfe:           { capability: IntegrationTechnicalCapability.NOT_IMPLEMENTED, evidence: 'sem adapter em apps/api/src' },
  acrcloud:      { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations/acrcloud/acrcloud.service.ts' },
  soundcharts:   { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations/soundcharts/soundcharts.service.ts' },
  google_ads:    { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations/google-ads/google-ads.service.ts' },
  meta_business: { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations.controller.ts — OAuth Meta (META_APP_ID/SECRET)' },
  stripe:        { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'modules/billing — Stripe SDK + webhook' },
  resend:        { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'core/mail/mail.service.ts (RESEND_API_KEY)' },
  whatsapp:      { capability: IntegrationTechnicalCapability.IMPLEMENTED,     evidence: 'integrations/whatsapp/whatsapp-cloud.provider.ts' },
};

/** Fail-closed: provedor desconhecido nunca é tratado como implementado. */
export function technicalCapabilityOf(providerKey: string): IntegrationTechnicalCapability {
  return CAPABILITY[providerKey]?.capability ?? IntegrationTechnicalCapability.NOT_IMPLEMENTED;
}

export function capabilityEvidenceOf(providerKey: string): string | null {
  return CAPABILITY[providerKey]?.evidence ?? null;
}
