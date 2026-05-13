import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { ContractTemplatesService }    from './contract-templates.service';
import { CreateContractTemplateDto }   from './dto/create-contract-template.dto';
import { UpdateContractTemplateDto }   from './dto/update-contract-template.dto';
import { QueryContractTemplateDto }    from './dto/query-contract-template.dto';

@ApiTags('Contract Templates')
@ApiBearerAuth()
@Controller('contract-templates')
export class ContractTemplatesController {
  constructor(private readonly svc: ContractTemplatesService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar templates de contrato' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryContractTemplateDto) {
    return this.svc.list(t.id, q);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter template por ID' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findById(t.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('contract_template.created')
  @ApiOperation({ summary: 'Criar template' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Body() dto: CreateContractTemplateDto) {
    return this.svc.create(t.id, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('contract_template.updated')
  @ApiOperation({ summary: 'Actualizar template' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateContractTemplateDto) {
    return this.svc.update(t.id, id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('contract_template.deleted')
  @ApiOperation({ summary: 'Arquivar template' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.remove(t.id, id);
  }
}
