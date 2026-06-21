import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { ContactContractsService } from './contact-contracts.service';

@Controller('contacts/:contactId/contracts')
export class ContactContractsController {
  constructor(private readonly contractsService: ContactContractsService) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('contact:read')
  list(@CurrentTenant() tenant: { id: string }, @Param('contactId') contactId: string) {
    return this.contractsService.list(tenant.id, contactId);
  }

  @Post()
  @RequireRole('editor')
  @RequirePermission('contact:update')
  link(@CurrentTenant() tenant: { id: string }, @Param('contactId') contactId: string, @Body() payload: Record<string, unknown>) {
    return this.contractsService.link(tenant.id, contactId, payload);
  }
}
