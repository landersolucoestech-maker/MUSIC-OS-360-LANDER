/**
 * contracts.workflow.ts
 *
 * Workflow de ciclo de vida para Contratos.
 * Estados: rascunho → em_analise → aguardando_assinatura → assinado → vigente → encerrado / cancelado
 */

import { ContractStatus } from '@music-os-360/types';
import { WorkflowDefinition } from '../workflow.types';

export const CONTRACTS_WORKFLOW: WorkflowDefinition<ContractStatus> = {
  name:         'contracts',
  entityType:   'contract',
  initialState: ContractStatus.RASCUNHO,
  states: Object.values(ContractStatus),
  transitions: [
    {
      from:  ContractStatus.RASCUNHO,
      to:    ContractStatus.EM_ANALISE,
      label: 'Enviar para Análise',
      roles: ['super_admin','tenant_owner','owner','admin','manager','juridico'],
    },
    {
      from:  ContractStatus.EM_ANALISE,
      to:    ContractStatus.RASCUNHO,
      label: 'Retornar para Rascunho',
      roles: ['super_admin','tenant_owner','owner','admin','manager','juridico'],
    },
    {
      from:  ContractStatus.EM_ANALISE,
      to:    ContractStatus.AGUARDANDO_ASSINATURA,
      label: 'Aprovar para Assinatura',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  ContractStatus.AGUARDANDO_ASSINATURA,
      to:    ContractStatus.ASSINADO,
      label: 'Registrar Assinatura',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
      guard: async (ctx) => {
        const entity = ctx.entity;
        if (!entity['arquivo_url']) {
          return { allowed: false, reason: 'Contrato precisa ter o documento anexado antes de ser assinado' };
        }
        return { allowed: true };
      },
    },
    {
      from:  ContractStatus.ASSINADO,
      to:    ContractStatus.VIGENTE,
      label: 'Ativar Contrato',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  ContractStatus.VIGENTE,
      to:    ContractStatus.VENCENDO,
      label: 'Marcar como Vencendo',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  [ContractStatus.VENCENDO, ContractStatus.VIGENTE],
      to:    ContractStatus.VENCIDO,
      label: 'Registrar Vencimento',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  [ContractStatus.VENCIDO, ContractStatus.VIGENTE, ContractStatus.ASSINADO],
      to:    ContractStatus.ENCERRADO,
      label: 'Encerrar Contrato',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  [
        ContractStatus.RASCUNHO,
        ContractStatus.EM_ANALISE,
        ContractStatus.AGUARDANDO_ASSINATURA,
      ],
      to:    ContractStatus.CANCELADO,
      label: 'Cancelar',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
  ],
};
