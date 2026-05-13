import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ClerkAuthGuard }    from '../../core/guards/clerk-auth.guard';
import { TenantGuard }       from '../../core/guards/tenant.guard';
import { CurrentTenant }     from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }       from '../../core/decorators/current-user.decorator';
import { ArtistGoalsService } from './artist-goals.service';
import { CreateArtistGoalDto } from './dto/create-artist-goal.dto';
import { UpdateArtistGoalDto } from './dto/update-artist-goal.dto';

@UseGuards(ClerkAuthGuard, TenantGuard)
@Controller('artist-goals')
export class ArtistGoalsController {
  constructor(private readonly svc: ArtistGoalsService) {}

  @Get()
  list(@CurrentTenant() tenant: { id: string }) {
    return this.svc.list(tenant.id);
  }

  @Get(':id')
  findOne(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findById(tenant.id, id);
  }

  @Post()
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateArtistGoalDto,
  ) {
    return this.svc.create(tenant.id, user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateArtistGoalDto,
  ) {
    return this.svc.update(tenant.id, user.sub, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.softDelete(tenant.id, id);
  }
}
