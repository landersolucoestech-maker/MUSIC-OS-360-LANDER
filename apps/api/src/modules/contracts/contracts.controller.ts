import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { RequireRole }     from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import type { JwtAuth }    from '../../core/guards/clerk-auth.guard';
import { ContractsService }        from './contracts.service';
import { CreateContractDto }       from './dto/create-contract.dto';
import { UpdateContractDto }       from './dto/update-contract.dto';
import { QueryContractDto }        from './dto/query-contract.dto';

@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar contratos do tenant' })
  list(@CurrentTenant() tenant: { id: string }, @Query() query: QueryContractDto) {
    return this.service.list(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter contrato por ID' })
  findById(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findById(tenant.id, id, user?.orgRole ?? undefined);
  }

  @Post()
  @RequireRole('editor')
  @Audit('contract.created')
  @ApiOperation({ summary: 'Criar contrato' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   JwtAuth,
    @Body()          dto:    CreateContractDto,
  ) {
    return this.service.create(tenant.id, user.userId, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('contract.updated')
  @ApiOperation({ summary: 'Actualizar contrato' })
  update(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body()          dto:    UpdateContractDto,
  ) {
    return this.service.update(tenant.id, user.userId, id, dto, user?.orgRole ?? undefined);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('contract.cancelled')
  @ApiOperation({ summary: 'Cancelar contrato (soft delete)' })
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.softDelete(tenant.id, id);
  }
}
