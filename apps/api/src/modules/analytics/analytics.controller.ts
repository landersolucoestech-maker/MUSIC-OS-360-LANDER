import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics') @ApiBearerAuth() @Controller('analytics')
export class AnalyticsController {
  constructor(private readonly svc: AnalyticsService) {}

  @Get('dashboard')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Dashboard operacional — contadores por entidade' })
  getDashboard(@CurrentTenant() t: { id: string }) {
    return this.svc.getDashboard(t.id);
  }

  @Get('revenue')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Visão geral de receitas e despesas por mês' })
  @ApiQuery({ name: 'months', required: false, type: Number, description: 'Número de meses (default 6)' })
  getRevenue(@CurrentTenant() t: { id: string }, @Query('months') months?: string) {
    return this.svc.getRevenueOverview(t.id, months ? +months : 6);
  }

  @Get('ai-usage')
  @RequireRole('manager')
  @ApiOperation({ summary: 'Consumo de IA por modelo/feature (governança de custos)' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Janela em dias (default 30)' })
  getAiUsage(@CurrentTenant() t: { id: string }, @Query('days') days?: string) {
    return this.svc.getAiUsageSummary(t.id, days ? +days : 30);
  }
}
