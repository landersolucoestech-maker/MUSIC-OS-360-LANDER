/**
 * audit-log/audit-log.controller.ts
 *
 * GET /audit-logs   — lista paginada com filtros (OWNER/ADMIN only)
 * GET /audit-logs/:id — detalhe com diff completo (OWNER/ADMIN only)
 *
 * Append-only — sem POST, PATCH ou DELETE.
 * Isolation garante por tenant_id em todas as queries.
 */

import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation }         from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { AuditLogService } from './audit-log.service';
import { QueryAuditLogDto } from './dto/audit-log.dto';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly svc: AuditLogService) {}

  @Get()
  @RequireRole('owner')
  @ApiOperation({ summary: 'Listar audit trail paginado (OWNER/ADMIN only)' })
  list(
    @CurrentTenant() t: { id: string },
    @Query() q: QueryAuditLogDto,
  ) {
    return this.svc.list(t.id, q);
  }

  @Get(':id')
  @RequireRole('owner')
  @ApiOperation({ summary: 'Detalhe de um audit log (OWNER/ADMIN only)' })
  findById(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.svc.findById(t.id, id);
  }
}
