import {
  Controller, Get, Post, Patch, Delete, Body, Param,
  Query, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import type { JwtAuth }  from '../../core/guards/auth.guard';
import { CrmService }    from './crm.service';
import {
  CreateCompanyDto, UpdateCompanyDto, QueryCompanyDto,
  CreateContactDto, UpdateContactDto, QueryContactDto,
  CreateTagDto, CreateCrmTaskDto, UpdateCrmTaskDto, QueryCrmTaskDto,
} from './dto/crm.dto';

// ── Companies ──────────────────────────────────────────────────────────────────

@ApiTags('CRM / Companies') @ApiBearerAuth() @Controller('crm/companies')
export class CrmCompaniesController {
  constructor(private readonly svc: CrmService) {}

  @Get() @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar empresas CRM' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryCompanyDto) {
    return this.svc.listCompanies(t.id, q);
  }

  @Get(':id') @RequireRole('viewer')
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findCompanyById(t.id, id);
  }

  @Post() @RequireRole('editor') @Audit('crm.company.created')
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Body() dto: CreateCompanyDto) {
    return this.svc.createCompany(t.id, u?.userId ?? '', dto);
  }

  @Patch(':id') @RequireRole('editor') @Audit('crm.company.updated')
  update(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ) {
    return this.svc.updateCompany(t.id, id, dto);
  }

  @Delete(':id') @RequireRole('manager') @Audit('crm.company.deleted')
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteCompany(t.id, id);
  }
}

// ── Contacts ──────────────────────────────────────────────────────────────────

@ApiTags('CRM / Contacts') @ApiBearerAuth() @Controller('crm/contacts')
export class CrmContactsController {
  constructor(private readonly svc: CrmService) {}

  @Get() @RequireRole('viewer')
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryContactDto) {
    return this.svc.listContacts(t.id, q);
  }

  @Get(':id') @RequireRole('viewer')
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.findContactById(t.id, id);
  }

  @Post() @RequireRole('editor') @Audit('crm.contact.created')
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Body() dto: CreateContactDto) {
    return this.svc.createContact(t.id, u?.userId ?? '', dto);
  }

  @Patch(':id') @RequireRole('editor') @Audit('crm.contact.updated')
  update(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateContactDto,
  ) {
    return this.svc.updateContact(t.id, id, u?.userId ?? '', dto);
  }

  @Delete(':id') @RequireRole('manager') @Audit('crm.contact.deleted')
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteContact(t.id, id);
  }

  // Tags on contact

  @Get(':id/tags') @RequireRole('viewer')
  getTags(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.getContactTags(t.id, id);
  }

  @Post(':id/tags/:tagId') @RequireRole('editor')
  addTag(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.svc.addTagToContact(t.id, id, tagId);
  }

  @Delete(':id/tags/:tagId') @RequireRole('editor')
  removeTag(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Param('tagId', ParseUUIDPipe) tagId: string,
  ) {
    return this.svc.removeTagFromContact(t.id, id, tagId);
  }

  // Timeline

  @Get(':id/timeline') @RequireRole('viewer')
  getTimeline(
    @CurrentTenant() t: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit')  limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.svc.getTimeline(t.id, id, limit ? +limit : 50, offset ? +offset : 0);
  }
}

// ── Tags ──────────────────────────────────────────────────────────────────────

@ApiTags('CRM / Tags') @ApiBearerAuth() @Controller('crm/tags')
export class CrmTagsController {
  constructor(private readonly svc: CrmService) {}

  @Get() @RequireRole('viewer')
  list(@CurrentTenant() t: { id: string }) {
    return this.svc.listTags(t.id);
  }

  @Post() @RequireRole('editor') @Audit('crm.tag.created')
  create(@CurrentTenant() t: { id: string }, @Body() dto: CreateTagDto) {
    return this.svc.createTag(t.id, dto);
  }

  @Delete(':id') @RequireRole('manager') @Audit('crm.tag.deleted')
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTag(t.id, id);
  }
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

@ApiTags('CRM / Tasks') @ApiBearerAuth() @Controller('crm/tasks')
export class CrmTasksController {
  constructor(private readonly svc: CrmService) {}

  @Get() @RequireRole('viewer')
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryCrmTaskDto) {
    return this.svc.listTasks(t.id, q);
  }

  @Post() @RequireRole('editor') @Audit('crm.task.created')
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: JwtAuth, @Body() dto: CreateCrmTaskDto) {
    return this.svc.createTask(t.id, u?.userId ?? '', dto);
  }

  @Patch(':id') @RequireRole('editor') @Audit('crm.task.updated')
  update(
    @CurrentTenant() t: { id: string },
    @CurrentUser()   u: JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCrmTaskDto,
  ) {
    return this.svc.updateTask(t.id, id, u?.userId ?? '', dto);
  }

  @Delete(':id') @RequireRole('editor') @Audit('crm.task.deleted')
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) {
    return this.svc.deleteTask(t.id, id);
  }
}
