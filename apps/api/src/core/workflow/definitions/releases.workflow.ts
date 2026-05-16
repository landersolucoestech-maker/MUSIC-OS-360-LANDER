/**
 * releases.workflow.ts
 *
 * Workflow de ciclo de vida para Lançamentos (Releases).
 * Estados: planejamento → em_preparacao → analise → aprovado → agendado → distribuido → publicado → arquivado / cancelado
 */

import { ReleaseStatus } from '@music-os-360/types';
import { WorkflowDefinition } from '../workflow.types';

export const RELEASES_WORKFLOW: WorkflowDefinition<string> = {
  name:         'releases',
  entityType:   'release',
  initialState: ReleaseStatus.PLANEJAMENTO,
  states: Object.values(ReleaseStatus),
  transitions: [
    {
      from:  ReleaseStatus.PLANEJAMENTO,
      to:    ReleaseStatus.EM_PREPARACAO,
      label: 'Iniciar Preparação',
      roles: ['super_admin','tenant_owner','owner','admin','editor','manager','produtor','marketing_manager'],
    },
    {
      from:  ReleaseStatus.EM_PREPARACAO,
      to:    ReleaseStatus.ANALISE,
      label: 'Enviar para Análise',
      roles: ['super_admin','tenant_owner','owner','admin','editor','manager','produtor','marketing_manager'],
      guard: async (ctx) => {
        const entity = ctx.entity;
        if (!entity['capa_url'] && !entity['coverUrl']) {
          return { allowed: false, reason: 'Lançamento precisa de capa (cover art) antes de ir para análise' };
        }
        return { allowed: true };
      },
    },
    {
      from:  [ReleaseStatus.ANALISE, ReleaseStatus.EM_ANALISE],
      to:    ReleaseStatus.APROVADO,
      label: 'Aprovar',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager'],
    },
    {
      from:  [ReleaseStatus.ANALISE, ReleaseStatus.EM_ANALISE],
      to:    ReleaseStatus.EM_PREPARACAO,
      label: 'Solicitar Revisão',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager'],
    },
    {
      from:  ReleaseStatus.APROVADO,
      to:    ReleaseStatus.AGENDADO,
      label: 'Agendar Distribuição',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager'],
    },
    {
      from:  ReleaseStatus.AGENDADO,
      to:    ReleaseStatus.DISTRIBUIDO,
      label: 'Confirmar Distribuição',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  ReleaseStatus.DISTRIBUIDO,
      to:    ReleaseStatus.PUBLICADO,
      label: 'Publicado nas Plataformas',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  [
        ReleaseStatus.PLANEJAMENTO,
        ReleaseStatus.EM_PREPARACAO,
        ReleaseStatus.ANALISE,
        ReleaseStatus.EM_ANALISE,
        ReleaseStatus.APROVADO,
        ReleaseStatus.AGENDADO,
      ],
      to:    ReleaseStatus.CANCELADO,
      label: 'Cancelar',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  ReleaseStatus.PUBLICADO,
      to:    ReleaseStatus.ARQUIVADO,
      label: 'Arquivar',
      roles: ['super_admin','tenant_owner','owner','admin'],
    },
  ],
};
