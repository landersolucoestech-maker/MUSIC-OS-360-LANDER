import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import type { JwtAuth }  from '../../core/guards/auth.guard';
import { FinancialRulesService } from './financial-rules.service';
import { CreateFinancialRuleDto, UpdateFinancialRuleDto, QueryFinancialRuleDto } from './dto/financial-rules.dto';

@ApiTags('Financial Rules') @ApiBearerAuth() @Controller('financial-rules')
export class FinancialRulesController {
  constructor(private readonly svc: FinancialRulesService) {}

  @Get() @RequireRole('viewer') @ApiOperation({ summary: 'Listar regras financeiras' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryFinancialRuleDto) {
    return this.svc.list(t.id, q);
  }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter regra financeira' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findById(t.id, id);
  }

  @Post() @RequireRole('manager') @Audit('financial_rule.created') @ApiOperation({ summary: 'Criar regra financeira' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Body() dto: CreateFinancialRuleDto) {
    return this.svc.create(t.id, u?.userId ?? '', dto);
  }

  @Patch(':id') @RequireRole('manager') @Audit('financial_rule.updated') @ApiOperation({ summary: 'Atualizar regra financeira' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinancialRuleDto) {
    return this.svc.update(t.id, u?.userId ?? '', id, dto);
  }

  @Delete(':id') @RequireRole('admin') @Audit('financial_rule.deleted') @ApiOperation({ summary: 'Remover regra financeira' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.softDelete(t.id, id);
  }
}
