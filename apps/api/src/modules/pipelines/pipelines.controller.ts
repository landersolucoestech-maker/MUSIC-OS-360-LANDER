import {
  Controller, Get, Post, Patch, Delete, Put, Body, Param, Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import type { JwtAuth }  from '../../core/guards/auth.guard';
import { PipelinesService } from './pipelines.service';
import {
  CreatePipelineDto, UpdatePipelineDto,
  CreateStageDto, UpdateStageDto,
  CreateOpportunityDto, UpdateOpportunityDto, MoveOpportunityDto, QueryOpportunityDto,
} from './dto/pipelines.dto';

@ApiTags('Pipelines') @ApiBearerAuth() @Controller('pipelines')
export class PipelinesController {
  constructor(private readonly svc: PipelinesService) {}

  // ── Pipelines ──────────────────────────────────────────────────────────────

  @Get() @RequireRole('viewer') @ApiOperation({ summary: 'Listar pipelines' })
  list(@CurrentTenant() t: { id: string }) {
    return this.svc.listPipelines(t.id);
  }

  @Get(':id') @RequireRole('viewer')
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findPipelineById(t.id, id);
  }

  @Post() @RequireRole('manager') @Audit('pipeline.created')
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Body() dto: CreatePipelineDto) {
    return this.svc.createPipeline(t.id, u?.userId ?? '', dto);
  }

  @Patch(':id') @RequireRole('manager') @Audit('pipeline.updated')
  update(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.svc.updatePipeline(t.id, id, dto);
  }

  @Delete(':id') @RequireRole('manager') @Audit('pipeline.deleted')
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deletePipeline(t.id, id);
  }

  // ── Stages ─────────────────────────────────────────────────────────────────

  @Get(':id/stages') @RequireRole('viewer')
  listStages(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.listStages(t.id, id);
  }

  @Post(':id/stages') @RequireRole('manager') @Audit('pipeline.stage.created')
  createStage(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.svc.createStage(t.id, id, dto);
  }

  @Patch(':id/stages/:stageId') @RequireRole('manager') @Audit('pipeline.stage.updated')
  updateStage(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.svc.updateStage(t.id, id, stageId, dto);
  }

  @Delete(':id/stages/:stageId') @RequireRole('manager') @Audit('pipeline.stage.deleted')
  deleteStage(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.svc.deleteStage(t.id, id, stageId);
  }

  // ── Opportunities ──────────────────────────────────────────────────────────

  @Get(':id/opportunities') @RequireRole('viewer')
  listOpportunities(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query() q: QueryOpportunityDto,
  ) {
    return this.svc.listOpportunities(t.id, id, q);
  }

  @Get(':id/kanban') @RequireRole('viewer') @ApiOperation({ summary: 'Visão Kanban do pipeline' })
  getKanban(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getKanban(t.id, id);
  }

  @Post(':id/opportunities') @RequireRole('editor') @Audit('pipeline.opportunity.created')
  createOpportunity(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateOpportunityDto,
  ) {
    return this.svc.createOpportunity(t.id, id, u?.userId ?? '', dto);
  }

  @Patch(':id/opportunities/:oppId') @RequireRole('editor') @Audit('pipeline.opportunity.updated')
  updateOpportunity(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('oppId', ParseUUIDPipe) oppId: string,
    @Body() dto: UpdateOpportunityDto,
  ) {
    return this.svc.updateOpportunity(t.id, oppId, u?.userId ?? '', dto);
  }

  @Put(':id/opportunities/:oppId/move') @RequireRole('editor') @Audit('pipeline.opportunity.moved')
  moveOpportunity(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('oppId', ParseUUIDPipe) oppId: string,
    @Body() dto: MoveOpportunityDto,
  ) {
    return this.svc.moveOpportunity(t.id, oppId, u?.userId ?? '', dto);
  }

  @Delete(':id/opportunities/:oppId') @RequireRole('editor') @Audit('pipeline.opportunity.deleted')
  deleteOpportunity(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('oppId', ParseUUIDPipe) oppId: string,
  ) {
    return this.svc.deleteOpportunity(t.id, oppId);
  }
}
