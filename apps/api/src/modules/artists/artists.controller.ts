import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant }    from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }      from '../../core/decorators/current-user.decorator';
import { RequireRole }      from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { ArtistsService }   from './artists.service';
import type { JwtAuth }     from '../../core/guards/auth.guard';
import { CreateArtistDto }  from './dto/create-artist.dto';
import { UpdateArtistDto }  from './dto/update-artist.dto';
import { QueryArtistDto }   from './dto/query-artist.dto';

@ApiTags('Artists')
@ApiBearerAuth()
@Controller('artists')
export class ArtistsController {
  constructor(private readonly service: ArtistsService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar artistas do tenant' })
  @ApiResponse({ status: 200, description: 'Lista paginada de artistas' })
  list(
    @CurrentTenant() tenant: { id: string },
    @Query() query: QueryArtistDto,
  ) {
    return this.service.list(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter artista por ID' })
  findById(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findByIdForResponse(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
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
