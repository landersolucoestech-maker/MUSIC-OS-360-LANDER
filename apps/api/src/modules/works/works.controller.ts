import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard }  from '../../core/guards/clerk-auth.guard';
import { TenantGuard }     from '../../core/guards/tenant.guard';
import { RolesGuard }      from '../../core/guards/roles.guard';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { RequireRole }     from '../../core/decorators/roles.decorator';
import { AuditInterceptor, Audit } from '../../core/interceptors/audit.interceptor';
import { WorksService }    from './works.service';
import { CreateWorkDto }   from './dto/create-work.dto';
import { UpdateWorkDto }   from './dto/update-work.dto';
import { QueryWorkDto }    from './dto/query-work.dto';

@ApiTags('Works')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('works')
export class WorksController {
  constructor(private readonly service: WorksService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar obras do tenant' })
  list(@CurrentTenant() tenant: { id: string }, @Query() query: QueryWorkDto) {
    return this.service.list(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter obra por ID' })
  findById(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('work.created')
  @ApiOperation({ summary: 'Criar obra musical' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Body()          dto:    CreateWorkDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('work.updated')
  @ApiOperation({ summary: 'Actualizar obra' })
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body()          dto:    UpdateWorkDto,
  ) {
    return this.service.update(tenant.id, user.userId, id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('work.deleted')
  @ApiOperation({ summary: 'Remover obra (soft delete)' })
  remove(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(tenant.id, id);
  }
}
