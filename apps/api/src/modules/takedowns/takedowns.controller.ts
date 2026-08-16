import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { TakedownsService } from './takedowns.service';
import { CreateTakedownDto, UpdateTakedownDto, QueryTakedownDto } from './dto/takedowns.dto';

@ApiTags('Takedowns')
@ApiBearerAuth()
@Controller('takedowns')
export class TakedownsController {
  constructor(private readonly svc: TakedownsService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar takedowns' })
  list(@CurrentTenant() tenant: { id: string }, @Query() query: QueryTakedownDto) {
    return this.svc.list(tenant.id, query);
  }

  @Get('stats')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Contagem por status, sobre o tenant inteiro' })
  stats(@CurrentTenant() tenant: { id: string }) {
    return this.svc.stats(tenant.id);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter takedown' })
  findById(@CurrentTenant() tenant: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('takedown.created')
  @ApiOperation({ summary: 'Criar takedown' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub?: string },
    @Body() dto: CreateTakedownDto,
  ) {
    return this.svc.create(tenant.id, user?.sub ?? '', dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('takedown.updated')
  @ApiOperation({ summary: 'Atualizar takedown' })
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub?: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTakedownDto,
  ) {
    return this.svc.update(tenant.id, user?.sub ?? '', id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('takedown.deleted')
  @ApiOperation({ summary: 'Excluir takedown' })
  remove(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub?: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.remove(tenant.id, user?.sub ?? '', id);
  }
}
