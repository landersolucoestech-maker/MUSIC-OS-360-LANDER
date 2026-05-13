import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto, QueryCampaignDto } from './dto/campaigns.dto';

@ApiTags('Campaigns') @ApiBearerAuth() @Controller('campaigns')
export class CampaignsController {
  constructor(private readonly svc: CampaignsService) {}

  @Get()    @RequireRole('viewer')  @ApiOperation({ summary: 'Listar campanhas' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryCampaignDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('viewer') @ApiOperation({ summary: 'Obter campanha' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('editor') @Audit('campaign.created') @ApiOperation({ summary: 'Criar campanha' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Body() dto: CreateCampaignDto) { return this.svc.create(t.id, dto); }

  @Patch(':id') @RequireRole('editor') @Audit('campaign.updated') @ApiOperation({ summary: 'Actualizar campanha' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCampaignDto) { return this.svc.update(t.id, id, dto); }

  @Delete(':id') @RequireRole('manager') @Audit('campaign.deleted') @ApiOperation({ summary: 'Cancelar campanha' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
