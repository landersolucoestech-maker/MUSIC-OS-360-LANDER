import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, UseInterceptors,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ClerkAuthGuard }  from '../../core/guards/clerk-auth.guard';
import { TenantGuard }     from '../../core/guards/tenant.guard';
import { RolesGuard }      from '../../core/guards/roles.guard';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { RequireRole }     from '../../core/decorators/roles.decorator';
import { AuditInterceptor, Audit } from '../../core/interceptors/audit.interceptor';
import { TransactionsService }     from './transactions.service';
import { CreateTransactionDto }    from './dto/create-transaction.dto';
import { UpdateTransactionDto }    from './dto/update-transaction.dto';
import { QueryTransactionDto }     from './dto/query-transaction.dto';

@ApiTags('Transactions')
@ApiBearerAuth()
@UseGuards(ClerkAuthGuard, TenantGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly service: TransactionsService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar transacções do tenant' })
  list(@CurrentTenant() tenant: { id: string }, @Query() query: QueryTransactionDto) {
    return this.service.list(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter transacção por ID' })
  findById(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('transaction.created')
  @ApiOperation({ summary: 'Criar transacção' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Body()          dto:    CreateTransactionDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('transaction.updated')
  @ApiOperation({ summary: 'Actualizar transacção' })
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body()          dto:    UpdateTransactionDto,
  ) {
    return this.service.update(tenant.id, user.userId, id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('transaction.cancelled')
  @ApiOperation({ summary: 'Cancelar transacção (soft delete)' })
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.softDelete(tenant.id, id);
  }
}
