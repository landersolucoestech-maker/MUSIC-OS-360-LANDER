import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
  ParseUUIDPipe, Req, Headers, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Public } from '../../core/decorators/public.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { FormsService } from './forms.service';
import type { Request } from 'express';
import type { JwtAuth } from '../../core/guards/auth.guard';
import {
  CreateFormDto, UpdateFormDto, QueryFormDto, SubmitFormDto,
} from './dto/forms.dto';

function readHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0]?.trim() || null;
  if (typeof value === 'string') return value.trim() || null;
  return null;
}

@ApiTags('Forms')
@ApiBearerAuth()
@Controller('forms')
export class FormsController {
  constructor(private readonly service: FormsService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar formulários do tenant' })
  list(
    @CurrentTenant() tenant: { id: string },
    @Query() query: QueryFormDto,
  ) {
    return this.service.list(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter formulário por ID' })
  findById(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('form.created')
  @ApiOperation({ summary: 'Criar formulário' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: CreateFormDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('form.updated')
  @ApiOperation({ summary: 'Actualizar formulário' })
  update(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFormDto,
  ) {
    return this.service.update(tenant.id, id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('form.deleted')
  @ApiOperation({ summary: 'Arquivar formulário (soft delete)' })
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.softDelete(tenant.id, id);
  }

  @Get(':id/submissions')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar submissões do formulário' })
  listSubmissions(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    return this.service.listSubmissions(tenant.id, id, limit ?? 50, offset ?? 0);
  }

  @Post(':id/submit')
  @Public()
  @ApiOperation({ summary: 'Submeter formulário público usando X-Tenant-ID' })
  submit(
    @Headers('x-tenant-id') tenantHeader: string | string[] | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitFormDto,
    @Req() req: Request,
  ) {
    const tenantId = readHeader(tenantHeader);
    if (!tenantId) {
      throw new BadRequestException('X-Tenant-ID is required for public form submissions');
    }

    const ip = readHeader(req.headers['cf-connecting-ip'])
      ?? readHeader(req.headers['x-real-ip'])
      ?? readHeader(req.headers['x-forwarded-for'])?.split(',')[0]?.trim()
      ?? req.socket.remoteAddress
      ?? null;

    return this.service.submit(tenantId, id, dto, ip ?? undefined);
  }
}
