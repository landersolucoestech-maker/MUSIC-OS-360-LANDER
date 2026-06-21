import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../core/guards/auth.guard';
import { FinancialCategoriesService } from './financial-categories.service';
import {
  CategoryRuleDto,
  CreateFinancialCategoryDto,
  ExecuteRulesDto,
  MergeFinancialCategoryDto,
  MoveFinancialCategoryDto,
  QueryFinancialCategoryDto,
  ReorderFinancialCategoryDto,
  SuggestFinancialCategoryDto,
  UpdateCategoryRuleDto,
  UpdateFinancialCategoryDto,
} from './dto/financial-categories.dto';

@ApiTags('Financial Categories')
@ApiBearerAuth()
@Controller('financial-categories')
export class FinancialCategoriesController {
  constructor(private readonly service: FinancialCategoriesService) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Listar categorias financeiras' })
  list(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Query() query: QueryFinancialCategoryDto) {
    return this.service.list(tenant.id, query, user?.userId);
  }

  @Get('tree')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Obter árvore financeira com lazy loading' })
  tree(@CurrentTenant() tenant: { id: string }, @Query() query: QueryFinancialCategoryDto) {
    return this.service.getTree(tenant.id, query);
  }

  @Get('search')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Pesquisar categorias financeiras' })
  search(@CurrentTenant() tenant: { id: string }, @Query() query: QueryFinancialCategoryDto) {
    return this.service.search(tenant.id, query);
  }

  @Post('suggest')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Sugerir categoria financeira por contexto' })
  suggest(@CurrentTenant() tenant: { id: string }, @Body() dto: SuggestFinancialCategoryDto) {
    return this.service.suggest(tenant.id, dto);
  }

  @Post('rules')
  @RequireRole('financial')
  @RequirePermission('financial_rule:create')
  @Audit('financial_category.rule_created')
  @ApiOperation({ summary: 'Criar regra automática de categoria financeira' })
  createRule(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Body() dto: CategoryRuleDto, @Req() req: Request) {
    return this.service.createRule(tenant.id, user?.userId ?? '', dto, req.ip);
  }

  @Get('rules')
  @RequireRole('viewer')
  @RequirePermission('financial_rule:read')
  @ApiOperation({ summary: 'Listar regras automáticas de categoria financeira' })
  listRules(@CurrentTenant() tenant: { id: string }) {
    return this.service.listRules(tenant.id);
  }

  @Patch('rules/:ruleId')
  @RequireRole('financial')
  @RequirePermission('financial_rule:update')
  @Audit('financial_category.rule_updated')
  @ApiOperation({ summary: 'Atualizar regra automática de categoria financeira' })
  updateRule(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('ruleId', ParseUUIDPipe) ruleId: string, @Body() dto: UpdateCategoryRuleDto, @Req() req: Request) {
    return this.service.updateRule(tenant.id, user?.userId ?? '', ruleId, dto, req.ip);
  }

  @Delete('rules/:ruleId')
  @RequireRole('financial')
  @RequirePermission('financial_rule:delete')
  @Audit('financial_category.rule_deleted')
  @ApiOperation({ summary: 'Remover regra automática de categoria financeira' })
  removeRule(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('ruleId', ParseUUIDPipe) ruleId: string, @Req() req: Request) {
    return this.service.deleteRule(tenant.id, user?.userId ?? '', ruleId, req.ip);
  }

  @Post('rules/preview')
  @RequireRole('viewer')
  @RequirePermission('financial_rule:read')
  @ApiOperation({ summary: 'Pré-visualizar regras automáticas' })
  previewRules(@CurrentTenant() tenant: { id: string }, @Body() dto: ExecuteRulesDto) {
    return this.service.previewRules(tenant.id, dto);
  }

  @Post('rules/execute')
  @RequireRole('financial')
  @RequirePermission('financial_rule:trigger')
  @Audit('financial_category.rule_triggered')
  @ApiOperation({ summary: 'Executar regras automáticas' })
  executeRules(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Body() dto: ExecuteRulesDto, @Req() req: Request) {
    return this.service.executeRules(tenant.id, user?.userId ?? '', dto, req.ip);
  }

  @Get(':id')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Detalhar categoria financeira' })
  findById(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(tenant.id, id);
  }

  @Get(':id/descendants')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  descendants(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.descendants(tenant.id, id);
  }

  @Get(':id/ancestors')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  ancestors(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.ancestors(tenant.id, id);
  }

  @Post()
  @RequireRole('financial')
  @RequirePermission('financial_category:create')
  @Audit('financial_category.created')
  create(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Body() dto: CreateFinancialCategoryDto, @Req() req: Request) {
    return this.service.create(tenant.id, user?.userId ?? '', dto, req.ip);
  }

  @Patch(':id')
  @RequireRole('financial')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.updated')
  update(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateFinancialCategoryDto, @Req() req: Request) {
    return this.service.update(tenant.id, user?.userId ?? '', id, dto, req.ip);
  }

  @Patch(':id/move')
  @RequireRole('financial')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.moved')
  move(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MoveFinancialCategoryDto, @Req() req: Request) {
    return this.service.move(tenant.id, user?.userId ?? '', id, dto, req.ip);
  }

  @Patch(':id/reorder')
  @RequireRole('financial')
  @RequirePermission('financial_category:reorder')
  @Audit('financial_category.reordered')
  reorder(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReorderFinancialCategoryDto, @Req() req: Request) {
    return this.service.reorder(tenant.id, user?.userId ?? '', id, dto, req.ip);
  }

  @Patch(':id/archive')
  @RequireRole('financial')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.archived')
  archive(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.archive(tenant.id, user?.userId ?? '', id, req.ip);
  }

  @Patch(':id/restore')
  @RequireRole('manager')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.restored')
  restore(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.restore(tenant.id, user?.userId ?? '', id, req.ip);
  }

  @Post(':id/merge')
  @RequireRole('manager')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.merged')
  merge(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Body() dto: MergeFinancialCategoryDto, @Req() req: Request) {
    return this.service.merge(tenant.id, user?.userId ?? '', id, dto, req.ip);
  }

  @Delete(':id')
  @RequireRole('manager')
  @RequirePermission('financial_category:delete')
  @Audit('financial_category.deleted')
  remove(@CurrentTenant() tenant: { id: string }, @CurrentUser() user: JwtAuth, @Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.service.softDelete(tenant.id, user?.userId ?? '', id, req.ip);
  }
}
