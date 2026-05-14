import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ClerkAuthGuard }        from '../../core/guards/clerk-auth.guard';
import { TenantGuard }           from '../../core/guards/tenant.guard';
import { CurrentTenant }         from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }           from '../../core/decorators/current-user.decorator';
import { HrService }             from './hr.service';
import { CreateEmployeeDto }     from './dto/create-employee.dto';
import { UpdateEmployeeDto }     from './dto/update-employee.dto';
import { CreatePayrollEntryDto } from './dto/create-payroll-entry.dto';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';

@UseGuards(ClerkAuthGuard, TenantGuard)
@Controller('hr')
export class HrController {
  constructor(private readonly svc: HrService) {}

  // ── Employees ──────────────────────────────────────────────────────────────

  @Get('employees')
  listEmployees(
    @CurrentTenant() tenant: { id: string },
    @Query('status') status?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listEmployees(tenant.id, {
      status,
      offset: offset ? +offset : undefined,
      limit:  limit  ? +limit  : undefined,
    });
  }

  @Get('employees/:id')
  findEmployee(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findEmployee(tenant.id, id);
  }

  @Post('employees')
  createEmployee(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateEmployeeDto,
  ) {
    return this.svc.createEmployee(tenant.id, user.sub, dto);
  }

  @Patch('employees/:id')
  updateEmployee(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEmployeeDto,
  ) {
    return this.svc.updateEmployee(tenant.id, user.sub, id, dto);
  }

  @Delete('employees/:id')
  removeEmployee(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.softDeleteEmployee(tenant.id, id);
  }

  // ── Payroll ────────────────────────────────────────────────────────────────

  @Get('payroll')
  listPayroll(
    @CurrentTenant() tenant: { id: string },
    @Query('employee_id') employee_id?: string,
    @Query('competencia') competencia?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listPayroll(tenant.id, {
      employee_id,
      competencia,
      offset: offset ? +offset : undefined,
      limit:  limit  ? +limit  : undefined,
    });
  }

  @Post('payroll')
  createPayroll(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: CreatePayrollEntryDto,
  ) {
    return this.svc.createPayroll(tenant.id, dto);
  }

  // ── Leave Requests ─────────────────────────────────────────────────────────

  @Get('leave-requests')
  listLeaveRequests(
    @CurrentTenant() tenant: { id: string },
    @Query('employee_id') employee_id?: string,
    @Query('status') status?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listLeaveRequests(tenant.id, {
      employee_id,
      status,
      offset: offset ? +offset : undefined,
      limit:  limit  ? +limit  : undefined,
    });
  }

  @Post('leave-requests')
  createLeaveRequest(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateLeaveRequestDto,
  ) {
    return this.svc.createLeaveRequest(tenant.id, user.sub, dto);
  }

  @Patch('leave-requests/:id/approve')
  approveLeaveRequest(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: { sub: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.approveLeaveRequest(tenant.id, id, user.sub);
  }
}
