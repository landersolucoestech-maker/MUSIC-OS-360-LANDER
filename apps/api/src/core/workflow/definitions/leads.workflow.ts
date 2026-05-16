/**
 * leads.workflow.ts
 *
 * Workflow de ciclo de vida para Leads (CRM).
 * Estados: novo → contato → qualificado → proposta → fechado / perdido
 */

import { LeadStatus } from '@music-os-360/types';
import { WorkflowDefinition } from '../workflow.types';

export const LEADS_WORKFLOW: WorkflowDefinition<LeadStatus> = {
  name:         'leads',
  entityType:   'lead',
  initialState: LeadStatus.NOVO,
  states: Object.values(LeadStatus),
  transitions: [
    {
      from:  LeadStatus.NOVO,
      to:    LeadStatus.CONTATO,
      label: 'Iniciar Contato',
      roles: ['super_admin','tenant_owner','owner','admin','manager','comercial'],
    },
    {
      from:  [LeadStatus.NOVO, LeadStatus.CONTATO],
      to:    LeadStatus.EM_CONTATO,
      label: 'Em Contato',
      roles: ['super_admin','tenant_owner','owner','admin','manager','comercial'],
    },
    {
      from:  [LeadStatus.CONTATO, LeadStatus.EM_CONTATO],
      to:    LeadStatus.QUALIFICADO,
      label: 'Qualificar Lead',
      roles: ['super_admin','tenant_owner','owner','admin','manager','comercial'],
    },
    {
      from:  LeadStatus.QUALIFICADO,
      to:    LeadStatus.PROPOSTA,
      label: 'Enviar Proposta',
      roles: ['super_admin','tenant_owner','owner','admin','manager','comercial'],
    },
    {
      from:  LeadStatus.PROPOSTA,
      to:    LeadStatus.NEGOCIACAO,
      label: 'Em Negociação',
      roles: ['super_admin','tenant_owner','owner','admin','manager','comercial'],
    },
    {
      from:  [LeadStatus.PROPOSTA, LeadStatus.NEGOCIACAO],
      to:    LeadStatus.FECHADO,
      label: 'Fechar Negócio',
      roles: ['super_admin','tenant_owner','owner','admin','manager','comercial'],
    },
    {
      from:  [
        LeadStatus.NOVO,
        LeadStatus.CONTATO,
        LeadStatus.EM_CONTATO,
        LeadStatus.QUALIFICADO,
        LeadStatus.PROPOSTA,
        LeadStatus.NEGOCIACAO,
      ],
      to:    LeadStatus.PERDIDO,
      label: 'Marcar como Perdido',
      roles: ['super_admin','tenant_owner','owner','admin','manager','comercial'],
    },
    {
      from:  [LeadStatus.PERDIDO, LeadStatus.INATIVO],
      to:    LeadStatus.NOVO,
      label: 'Reativar Lead',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  [LeadStatus.FECHADO, LeadStatus.PERDIDO],
      to:    LeadStatus.INATIVO,
      label: 'Arquivar',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
  ],
};
