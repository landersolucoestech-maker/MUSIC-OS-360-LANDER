import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../core/guards/auth.guard';
import { MarketingStrategyService } from './marketing-strategy.service';
import {
  CreateMarketingActionDto,
  CreateMarketingInitiativeDto,
  CreateMarketingObjectiveDto,
  CreateMarketingStrategyDto,
} from './dto/marketing-strategy.dto';

@ApiTags('Marketing Strategy')
@ApiBearerAuth()
@Controller('marketing/strategy')
export class MarketingStrategyController {
  constructor(private readonly svc: MarketingStrategyService) {}

  @Get('project/:marketingProjectId')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter planejamento operacional do Marketing Project' })
  getPlan(
    @CurrentTenant() tenant: { id: string },
    @Param('marketingProjectId', ParseUUIDPipe) marketingProjectId: string,
  ) {
    return this.svc.getPlan(tenant.id, marketingProjectId);
  }

  @Post('project/:marketingProjectId/complete')
  @RequireRole('editor')
  @Audit('marketing_plan.completed')
  @ApiOperation({ summary: 'Concluir planejamento e gerar tarefas operacionais' })
  completePlan(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('marketingProjectId', ParseUUIDPipe) marketingProjectId: string,
  ) {
    return this.svc.completePlanAndGenerateTasks(tenant.id, user?.userId ?? '', marketingProjectId);
  }

  @Post('strategies')
  @RequireRole('editor')
  @Audit('marketing_strategy.created')
  @ApiOperation({ summary: 'Criar estrategia de marketing' })
  createStrategy(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: CreateMarketingStrategyDto,
  ) {
    return this.svc.createStrategy(tenant.id, user?.userId ?? '', dto);
  }

  @Post('objectives')
  @RequireRole('editor')
  @Audit('marketing_strategy_objective.created')
  @ApiOperation({ summary: 'Criar objetivo de estrategia' })
  createObjective(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: CreateMarketingObjectiveDto,
  ) {
    return this.svc.createObjective(tenant.id, user?.userId ?? '', dto);
  }

  @Post('initiatives')
  @RequireRole('editor')
  @Audit('marketing_strategy_initiative.created')
  @ApiOperation({ summary: 'Criar iniciativa de objetivo' })
  createInitiative(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: CreateMarketingInitiativeDto,
  ) {
    return this.svc.createInitiative(tenant.id, user?.userId ?? '', dto);
  }

  @Post('actions')
  @RequireRole('editor')
  @Audit('marketing_strategy_action.created')
  @ApiOperation({ summary: 'Criar acao de iniciativa' })
  createAction(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: CreateMarketingActionDto,
  ) {
    return this.svc.createAction(tenant.id, user?.userId ?? '', dto);
  }
}
