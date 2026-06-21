import { Module, Global } from '@nestjs/common';
import { WorkflowService }           from './workflow.service';
import { WorkflowBootstrap }         from './workflow.bootstrap';
import { WorkflowAutomationService } from './workflow-automation.service';
import { WorkflowExecutionService }  from './workflow-execution.service';

@Global()
@Module({
  providers: [WorkflowService, WorkflowBootstrap, WorkflowAutomationService, WorkflowExecutionService],
  exports:   [WorkflowService, WorkflowAutomationService, WorkflowExecutionService],
})
export class WorkflowModule {}
