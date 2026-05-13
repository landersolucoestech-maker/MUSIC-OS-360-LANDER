import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/audit-log.dto';

@ApiTags('AuditLog') @ApiBearerAuth() @Controller('audit-log')
export class AuditLogController {
  constructor(private readonly svc: AuditLogService) {}

  @Get() @RequireRole('manager') @ApiOperation({ summary: 'Listar audit log (read-only)' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryAuditLogDto) { return this.svc.list(t.id, q); }
}
