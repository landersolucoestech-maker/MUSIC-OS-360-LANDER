import { Module, Global } from '@nestjs/common';
import { WorkflowService }           from './workflow.service';
import { WorkflowBootstrap }         from './workflow.bootstrap';
import { WorkflowAutomationService } from './workflow-automation.service';

@Global()
@Module({
  providers: [WorkflowService, WorkflowBootstrap, WorkflowAutomationService],
  exports:   [WorkflowService, WorkflowAutomationService],
})
export class WorkflowModule {}
