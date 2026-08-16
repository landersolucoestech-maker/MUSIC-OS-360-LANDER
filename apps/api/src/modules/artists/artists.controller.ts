import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant }    from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }      from '../../core/decorators/current-user.decorator';
import { RequireRole }      from '../../core/decorators/roles.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { ArtistsService }   from './artists.service';
import type { JwtAuth }     from '../../core/guards/auth.guard';
import { CreateArtistDto }  from './dto/create-artist.dto';
import { UpdateArtistDto }  from './dto/update-artist.dto';
import { QueryArtistDto }   from './dto/query-artist.dto';
import { ArtistPlatformProfilesService } from './platform-profiles/artist-platform-profiles.service';
import { ArtistExternalProfileSyncService } from './platform-profiles/artist-external-profile-sync.service';
import { isSocialPlatform } from './platform-profiles/social-platform-sync.types';

@ApiTags('Artists')
@ApiBearerAuth()
@Controller('artists')
export class ArtistsController {
  constructor(
    private readonly service: ArtistsService,
    private readonly platformProfiles: ArtistPlatformProfilesService,
    private readonly platformSync: ArtistExternalProfileSyncService,
  ) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('artist:read')
  @ApiOperation({ summary: 'Listar artistas do tenant' })
  @ApiResponse({ status: 200, description: 'Lista paginada de artistas' })
  list(
    @CurrentTenant() tenant: { id: string },
    @Query() query: QueryArtistDto,
  ) {
    return this.service.list(tenant.id, query);
  }

  @Get('stats/vinculo')
  @RequireRole('viewer')
  @RequirePermission('artist:read')
  @ApiOperation({ summary: 'Contagem de artistas por vínculo (exclusivo/parceiro/independente), tenant inteiro' })
  vinculoStats(@CurrentTenant() tenant: { id: string }) {
    return this.service.vinculoStats(tenant.id);
  }

  @Get('stats/generos')
  @RequireRole('viewer')
  @RequirePermission('artist:read')
  @ApiOperation({ summary: 'Gêneros musicais distintos do tenant' })
  distinctGeneros(@CurrentTenant() tenant: { id: string }) {
    return this.service.distinctGeneros(tenant.id);
  }

  @Get(':id/platform-profiles')
  @RequireRole('viewer')
  @RequirePermission('artist:read')
  @ApiOperation({ summary: 'Listar snapshots de perfis externos do artista' })
  async listPlatformProfiles(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.service.findById(tenant.id, id);
    return this.platformProfiles.findByArtist(tenant.id, id);
  }

  @Get(':id/platform-profiles/:platform')
  @RequireRole('viewer')
  @RequirePermission('artist:read')
  @ApiOperation({ summary: 'Obter snapshot de perfil externo do artista por plataforma' })
  async getPlatformProfile(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('platform') platform: string,
  ) {
    if (!isSocialPlatform(platform)) throw new BadRequestException('Plataforma inválida para sync de perfil do artista');
    await this.service.findById(tenant.id, id);
    return this.platformProfiles.findByArtistAndPlatform(tenant.id, id, platform);
  }

  @Post(':id/platform-profiles/:platform/sync')
  @RequireRole('editor')
  @RequirePermission('artist:update')
  @Audit('artist.platform_profile_sync_requested')
  @ApiOperation({ summary: 'Enfileirar sincronização manual de perfil externo do artista' })
  syncPlatformProfile(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('platform') platform: string,
    @Body() body?: { profileUrl?: string; source?: string },
  ) {
    return this.platformSync.enqueueManualSync({
      tenantId: tenant.id,
      artistId: id,
      platform,
      requestedBy: user.userId,
      profileUrl: body?.profileUrl,
    });
  }

  @Get(':id')
  @RequireRole('viewer')
  @RequirePermission('artist:read')
  @ApiOperation({ summary: 'Obter artista por ID' })
  findById(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findByIdForResponse(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @RequirePermission('artist:create')
  @Audit('artist.created')
  @ApiOperation({ summary: 'Criar artista' })
  @ApiResponse({ status: 201, description: 'Artista criado com sucesso' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   JwtAuth,
    @Body()          dto:    CreateArtistDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto, user.orgId ?? undefined);
  }

  @Patch(':id')
  @RequireRole('editor')
  @RequirePermission('artist:update')
  @Audit('artist.updated')
  @ApiOperation({ summary: 'Actualizar artista' })
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body()          dto:    UpdateArtistDto,
  ) {
    return this.service.update(tenant.id, user.userId, id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @RequirePermission('artist:delete')
  @Audit('artist.deleted')
  @ApiOperation({ summary: 'Remover artista (soft delete auditável)' })
  remove(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.softDelete(tenant.id, user.userId, id);
  }
}
