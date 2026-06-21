import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { ContactAttachmentsService } from './contact-attachments.service';

@Controller('contacts/:contactId/attachments')
export class ContactAttachmentsController {
  constructor(private readonly attachmentsService: ContactAttachmentsService) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('contact:read')
  list(@CurrentTenant() tenant: { id: string }, @Param('contactId') contactId: string) {
    return this.attachmentsService.list(tenant.id, contactId);
  }

  @Post()
  @RequireRole('editor')
  @RequirePermission('contact:update')
  create(@CurrentTenant() tenant: { id: string }, @Param('contactId') contactId: string, @Body() payload: Record<string, unknown>) {
    return this.attachmentsService.create(tenant.id, contactId, payload);
  }
}
