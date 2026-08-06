import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../core/guards/auth.guard';
import {
  CreateFinancialCategoryDto,
  MoveFinancialCategoryDto,
  QueryFinancialCategoryDto,
  ReorderFinancialCategoryDto,
  UpdateFinancialCategoryDto,
} from './dto/financial-categories.dto';
import { FinancialCategoriesService } from './financial-categories.service';

@ApiTags('Financial Categories')
@ApiBearerAuth()
@Controller('financial-categories')
export class FinancialCategoriesController {
  constructor(private readonly service: FinancialCategoriesService) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Listar categorias financeiras' })
  list(
    @CurrentTenant() tenant: { id: string },
    @Query() query: QueryFinancialCategoryDto,
  ) {
    return this.service.list(tenant.id, query);
  }

  @Get('tree')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Obter árvore financeira com lazy loading' })
  tree(
    @CurrentTenant() tenant: { id: string },
    @Query() query: QueryFinancialCategoryDto,
  ) {
    return this.service.getTree(tenant.id, query);
  }

  @Get('search')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Pesquisar categorias financeiras' })
  search(
    @CurrentTenant() tenant: { id: string },
    @Query() query: QueryFinancialCategoryDto,
  ) {
    return this.service.search(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  @ApiOperation({ summary: 'Detalhar categoria financeira' })
  findById(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(tenant.id, id);
  }

  @Get(':id/descendants')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  descendants(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.descendants(tenant.id, id);
  }

  @Get(':id/ancestors')
  @RequireRole('viewer')
  @RequirePermission('financial_category:read')
  ancestors(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.ancestors(tenant.id, id);
  }

  @Post()
  @RequireRole('financial')
  @RequirePermission('financial_category:create')
  @Audit('financial_category.created')
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: CreateFinancialCategoryDto,
  ) {
    return this.service.create(tenant.id, user?.userId ?? '', dto);
  }

  @Patch(':id')
  @RequireRole('financial')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.updated')
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFinancialCategoryDto,
  ) {
    return this.service.update(tenant.id, user?.userId ?? '', id, dto);
  }

  @Patch(':id/move')
  @RequireRole('financial')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.moved')
  move(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveFinancialCategoryDto,
  ) {
    return this.service.move(tenant.id, user?.userId ?? '', id, dto);
  }

  @Patch(':id/reorder')
  @RequireRole('financial')
  @RequirePermission('financial_category:reorder')
  @Audit('financial_category.reordered')
  reorder(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReorderFinancialCategoryDto,
  ) {
    return this.service.reorder(tenant.id, user?.userId ?? '', id, dto);
  }

  @Patch(':id/archive')
  @RequireRole('financial')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.archived')
  archive(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.archive(tenant.id, user?.userId ?? '', id);
  }

  @Patch(':id/restore')
  @RequireRole('manager')
  @RequirePermission('financial_category:update')
  @Audit('financial_category.restored')
  restore(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.restore(tenant.id, user?.userId ?? '', id);
  }

  @Delete(':id')
  @RequireRole('manager')
  @RequirePermission('financial_category:delete')
  @Audit('financial_category.deleted')
  remove(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.remove(tenant.id, user?.userId ?? '', id);
  }
}
