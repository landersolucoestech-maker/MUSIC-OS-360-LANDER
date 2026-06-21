import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { ContactTimelineService } from './contact-timeline.service';

@Controller('contacts/:contactId/timeline')
export class ContactTimelineController {
  constructor(private readonly timelineService: ContactTimelineService) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('contact:read')
  list(@CurrentTenant() tenant: { id: string }, @Param('contactId') contactId: string) {
    return this.timelineService.list(tenant.id, contactId);
  }

  @Post()
  @RequireRole('editor')
  @RequirePermission('contact:update')
  create(@CurrentTenant() tenant: { id: string }, @Param('contactId') contactId: string, @Body() payload: Record<string, unknown>) {
    return this.timelineService.create(tenant.id, contactId, payload);
  }
}
