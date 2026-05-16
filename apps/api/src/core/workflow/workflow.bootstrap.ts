/**
 * workflow.bootstrap.ts
 *
 * Registra todos os workflows de domínio no WorkflowService durante o bootstrap da aplicação.
 * Chamado automaticamente via OnModuleInit.
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { RELEASES_WORKFLOW }  from './definitions/releases.workflow';
import { CONTRACTS_WORKFLOW } from './definitions/contracts.workflow';
import { LEADS_WORKFLOW }     from './definitions/leads.workflow';
import { CAMPAIGNS_WORKFLOW } from './definitions/campaigns.workflow';
import { PROJECTS_WORKFLOW }  from './definitions/projects.workflow';
import { TICKETS_WORKFLOW }   from './definitions/tickets.workflow';

@Injectable()
export class WorkflowBootstrap implements OnModuleInit {
  constructor(private readonly workflowService: WorkflowService) {}

  onModuleInit(): void {
    this.workflowService.register(RELEASES_WORKFLOW  as any);
    this.workflowService.register(CONTRACTS_WORKFLOW as any);
    this.workflowService.register(LEADS_WORKFLOW     as any);
    this.workflowService.register(CAMPAIGNS_WORKFLOW as any);
    this.workflowService.register(PROJECTS_WORKFLOW  as any);
    this.workflowService.register(TICKETS_WORKFLOW   as any);
  }
}
