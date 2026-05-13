import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ClerkAuthGuard }       from '../../core/guards/clerk-auth.guard';
import { TenantGuard }          from '../../core/guards/tenant.guard';
import { CurrentTenant }        from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }          from '../../core/decorators/current-user.decorator';
import { EcadReportsService }   from './ecad-reports.service';
import { CreateEcadReportDto }  from './dto/create-ecad-report.dto';
import { UpdateEcadReportDto }  from './dto/update-ecad-report.dto';

@UseGuards(ClerkAuthGuard, TenantGuard)
@Controller('ecad-reports')
export class EcadReportsController {
  constructor(private readonly svc: EcadReportsService) {}

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
    @Body() dto: CreateEcadReportDto,
  ) {
    return this.svc.create(tenant.id, user.sub, dto);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEcadReportDto,
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
