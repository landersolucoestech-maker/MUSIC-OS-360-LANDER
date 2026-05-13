import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ClerkAuthGuard }              from '../../core/guards/clerk-auth.guard';
import { TenantGuard }                 from '../../core/guards/tenant.guard';
import { CurrentTenant }               from '../../core/decorators/current-tenant.decorator';
import { ContentDetectionsService }    from './content-detections.service';
import { CreateContentDetectionDto }   from './dto/create-content-detection.dto';
import { UpdateContentDetectionDto }   from './dto/update-content-detection.dto';

@UseGuards(ClerkAuthGuard, TenantGuard)
@Controller('content-detections')
export class ContentDetectionsController {
  constructor(private readonly svc: ContentDetectionsService) {}

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
    @Body() dto: CreateContentDetectionDto,
  ) {
    return this.svc.create(tenant.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContentDetectionDto,
  ) {
    return this.svc.update(tenant.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.softDelete(tenant.id, id);
  }
}
