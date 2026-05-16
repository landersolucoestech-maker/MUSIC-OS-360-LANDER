/**
 * projects.workflow.ts
 *
 * Workflow de ciclo de vida para Projetos musicais.
 * Estados: planejamento → em_andamento → revisao → concluido / cancelado
 */

import { ProjectStatus } from '@music-os-360/types';
import { WorkflowDefinition } from '../workflow.types';

export const PROJECTS_WORKFLOW: WorkflowDefinition<ProjectStatus> = {
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
      from:  ProjectStatus.PLANEJAMENTO,
      to:    ProjectStatus.PRODUCAO,
      label: 'Iniciar Produção',
      roles: ['super_admin','tenant_owner','owner','admin','manager','produtor'],
    },
    {
      from:  [ProjectStatus.EM_ANDAMENTO, ProjectStatus.PRODUCAO],
      to:    ProjectStatus.POS_PRODUCAO,
      label: 'Pós-Produção',
      roles: ['super_admin','tenant_owner','owner','admin','manager','produtor'],
    },
    {
      from:  [ProjectStatus.EM_ANDAMENTO, ProjectStatus.PRODUCAO, ProjectStatus.POS_PRODUCAO],
      to:    ProjectStatus.PAUSADO,
      label: 'Pausar Projeto',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  ProjectStatus.PAUSADO,
      to:    ProjectStatus.EM_ANDAMENTO,
      label: 'Retomar Projeto',
      roles: ['super_admin','tenant_owner','owner','admin','manager','produtor'],
    },
    {
      from:  [ProjectStatus.POS_PRODUCAO, ProjectStatus.EM_ANDAMENTO],
      to:    ProjectStatus.CONCLUIDO,
      label: 'Concluir Projeto',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
    {
      from:  [
        ProjectStatus.PLANEJAMENTO,
        ProjectStatus.EM_ANDAMENTO,
        ProjectStatus.PRODUCAO,
        ProjectStatus.POS_PRODUCAO,
        ProjectStatus.PAUSADO,
      ],
      to:    ProjectStatus.CANCELADO,
      label: 'Cancelar Projeto',
      roles: ['super_admin','tenant_owner','owner','admin','manager'],
    },
  ],
};
