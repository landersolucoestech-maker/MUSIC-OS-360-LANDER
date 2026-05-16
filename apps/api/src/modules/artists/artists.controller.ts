import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags, ApiBearerAuth, ApiOperation, ApiResponse,
} from '@nestjs/swagger';
import { CurrentTenant }    from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }      from '../../core/decorators/current-user.decorator';
import { RequireRole }      from '../../core/decorators/roles.decorator';
import { AuditInterceptor, Audit } from '../../core/interceptors/audit.interceptor';
import { ArtistsService }   from './artists.service';
import { CreateArtistDto }  from './dto/create-artist.dto';
import { UpdateArtistDto }  from './dto/update-artist.dto';
import { QueryArtistDto }   from './dto/query-artist.dto';

@ApiTags('Artists')
@ApiBearerAuth()
@UseInterceptors(AuditInterceptor)
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
    return this.service.findById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('artist.created')
  @ApiOperation({ summary: 'Criar artista' })
  @ApiResponse({ status: 201, description: 'Artista criado com sucesso' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Body()          dto:    CreateArtistDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto);
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
  @ApiOperation({ summary: 'Remover artista (soft delete)' })
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.softDelete(tenant.id, id);
  }
}
