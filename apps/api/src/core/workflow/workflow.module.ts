import { Module, Global } from '@nestjs/common';
import { WorkflowService }   from './workflow.service';
import { WorkflowBootstrap } from './workflow.bootstrap';

@Global()
@Module({
  providers: [WorkflowService, WorkflowBootstrap],
  exports:   [WorkflowService],
})
export class WorkflowModule {}
