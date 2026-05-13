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
import { PhonogramsService }       from './phonograms.service';
import { CreatePhonogramDto }      from './dto/create-phonogram.dto';
import { UpdatePhonogramDto }      from './dto/update-phonogram.dto';
import { QueryPhonogramDto }       from './dto/query-phonogram.dto';

@ApiTags('Phonograms')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('phonograms')
export class PhonogramsController {
  constructor(private readonly service: PhonogramsService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar fonogramas do tenant' })
  list(@CurrentTenant() tenant: { id: string }, @Query() query: QueryPhonogramDto) {
    return this.service.list(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter fonograma por ID' })
  findById(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('phonogram.created')
  @ApiOperation({ summary: 'Criar fonograma' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Body()          dto:    CreatePhonogramDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('phonogram.updated')
  @ApiOperation({ summary: 'Actualizar fonograma' })
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body()          dto:    UpdatePhonogramDto,
  ) {
    return this.service.update(tenant.id, user.userId, id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('phonogram.deleted')
  @ApiOperation({ summary: 'Remover fonograma (soft delete)' })
  remove(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.softDelete(tenant.id, id);
  }
}
