import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, Query,
  ParseUUIDPipe,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { RequireRole }     from '../../core/decorators/roles.decorator';
import { Audit }           from '../../core/interceptors/audit.interceptor';
import { IdempotencyInterceptor } from '../../core/interceptors/idempotency.interceptor';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { TransactionsService }     from './transactions.service';
import { QueryTransactionDto }     from './dto/query-transaction.dto';
import {
  createTransacaoSchema,
  patchTransacaoSchema,
  type CreateTransacaoDto,
  type PatchTransacaoDto,
} from './validators/transacao.validator';

@ApiTags('Transactions')
@ApiBearerAuth()
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
  @UseInterceptors(IdempotencyInterceptor)
  @ApiOperation({ summary: 'Criar transacção' })
  @ApiHeader({ name: 'X-Idempotency-Key', description: 'UUID único por operação — previne duplicação de transacções', required: false })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Body(new ZodValidationPipe(createTransacaoSchema)) dto: CreateTransacaoDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto);
  }

  @Put(':id')
  @RequireRole('editor')
  @Audit('transaction.updated')
  @ApiOperation({ summary: 'Actualizar transacção (full replace — same rules as create)' })
  replace(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createTransacaoSchema)) dto: CreateTransacaoDto,
  ) {
    return this.service.update(tenant.id, user.userId, id, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('transaction.updated')
  @ApiOperation({ summary: 'Actualizar transacção (partial update)' })
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(patchTransacaoSchema)) dto: PatchTransacaoDto,
  ) {
    return this.service.patch(tenant.id, user.userId, id, dto);
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
