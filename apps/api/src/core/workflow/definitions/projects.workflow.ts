/**
 * projects.workflow.ts
 *
 * Workflow de ciclo de vida para Projetos musicais.
 * Conforme spec: planejamento → em_andamento → revisao → concluido / cancelado
 */

import { ProjectStatus } from '@music-os-360/types';
import { WorkflowDefinition } from '../workflow.types';

export const PROJECTS_WORKFLOW: WorkflowDefinition<string> = {
  name:         'projects',
  entityType:   'project',
  initialState: ProjectStatus.PLANEJAMENTO,
  states: Object.values(ProjectStatus),
  transitions: [
    {
      from:  ProjectStatus.PLANEJAMENTO,
      to:    ProjectStatus.EM_ANDAMENTO,
      label: 'Iniciar Projeto',
      roles: ['super_admin','tenant_owner','owner','admin','manager','produtor'],
    },
    {
      from:  ProjectStatus.EM_ANDAMENTO,
      to:    ProjectStatus.REVISAO,
      label: 'Enviar para Revisão',
      roles: ['super_admin','tenant_owner','owner','admin','manager','produtor'],
    },
    {
      from:  ProjectStatus.REVISAO,
      to:    ProjectStatus.EM_ANDAMENTO,
      label: 'Solicitar Alterações',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  ProjectStatus.REVISAO,
      to:    ProjectStatus.CONCLUIDO,
      label: 'Concluir Projeto',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  [
        ProjectStatus.PLANEJAMENTO,
        ProjectStatus.EM_ANDAMENTO,
        ProjectStatus.REVISAO,
      ],
      to:    ProjectStatus.CANCELADO,
      label: 'Cancelar Projeto',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
  ],
};
