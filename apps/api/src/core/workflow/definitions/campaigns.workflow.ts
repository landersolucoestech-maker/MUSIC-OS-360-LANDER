/**
 * campaigns.workflow.ts
 *
 * Workflow de ciclo de vida para Campanhas de Marketing.
 * Estados: rascunho → planejamento → ativa → pausada → concluida / cancelada
 */

import { CampaignStatus } from '@music-os-360/types';
import { WorkflowDefinition } from '../workflow.types';

export const CAMPAIGNS_WORKFLOW: WorkflowDefinition<string> = {
  name:         'campaigns',
  entityType:   'campaign',
  initialState: CampaignStatus.RASCUNHO,
  states: Object.values(CampaignStatus),
  transitions: [
    {
      from:  CampaignStatus.RASCUNHO,
      to:    CampaignStatus.PLANEJAMENTO,
      label: 'Iniciar Planejamento',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager','marketing'],
    },
    {
      from:  CampaignStatus.PLANEJAMENTO,
      to:    CampaignStatus.ATIVA,
      label: 'Ativar Campanha',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager'],
    },
    {
      from:  CampaignStatus.ATIVA,
      to:    CampaignStatus.PAUSADA,
      label: 'Pausar Campanha',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager'],
    },
    {
      from:  CampaignStatus.PAUSADA,
      to:    CampaignStatus.ATIVA,
      label: 'Retomar Campanha',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager'],
    },
    {
      from:  [CampaignStatus.ATIVA, CampaignStatus.PAUSADA],
      to:    CampaignStatus.CONCLUIDA,
      label: 'Concluir Campanha',
      roles: ['super_admin','tenant_owner','owner','admin','manager','marketing_manager'],
    },
    {
      from:  [
        CampaignStatus.RASCUNHO,
        CampaignStatus.PLANEJAMENTO,
        CampaignStatus.ATIVA,
        CampaignStatus.PAUSADA,
      ],
      to:    CampaignStatus.CANCELADA,
      label: 'Cancelar Campanha',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
  ],
};
