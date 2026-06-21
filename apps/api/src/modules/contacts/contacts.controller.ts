import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { ContactsService } from './contacts.service';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('contact:read')
  list(@CurrentTenant() tenant: { id: string }) {
    return this.contactsService.list(tenant.id);
  }

  @Get(':id')
  @RequireRole('viewer')
  @RequirePermission('contact:read')
  getById(@CurrentTenant() tenant: { id: string }, @Param('id') id: string) {
    return this.contactsService.getById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @RequirePermission('contact:create')
  create(@CurrentTenant() tenant: { id: string }, @Body() payload: Record<string, unknown>) {
    return this.contactsService.create(tenant.id, payload);
  }

  @Patch(':id')
  @RequireRole('editor')
  @RequirePermission('contact:update')
  update(@CurrentTenant() tenant: { id: string }, @Param('id') id: string, @Body() payload: Record<string, unknown>) {
    return this.contactsService.update(tenant.id, id, payload);
  }
}
