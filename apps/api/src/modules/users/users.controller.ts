import { Controller, Get, Post, Patch, Delete, Body, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }   from '../../core/decorators/current-user.decorator';
import { RequireRole }   from '../../core/decorators/roles.decorator';
import { Audit }         from '../../core/interceptors/audit.interceptor';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, QueryUserDto } from './dto/users.dto';

@ApiTags('Users') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private readonly svc: UsersService) {}

  @Get()    @RequireRole('manager') @ApiOperation({ summary: 'Listar utilizadores' })
  list(@CurrentTenant() t: { id: string }, @Query() q: QueryUserDto) { return this.svc.list(t.id, q); }

  @Get(':id') @RequireRole('manager') @ApiOperation({ summary: 'Obter utilizador' })
  findById(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.findById(t.id, id); }

  @Post() @RequireRole('owner') @Audit('user.created') @ApiOperation({ summary: 'Criar utilizador' })
  create(@CurrentTenant() t: { id: string }, @CurrentUser() u: { userId: string }, @Body() dto: CreateUserDto) { return this.svc.create(t.id, dto, u.userId); }

  @Patch(':id') @RequireRole('manager') @Audit('user.updated') @ApiOperation({ summary: 'Actualizar utilizador' })
  update(@CurrentTenant() t: { id: string }, @CurrentUser() _u: any, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto) { return this.svc.update(t.id, id, dto); }

  @Delete(':id') @RequireRole('owner') @Audit('user.deleted') @ApiOperation({ summary: 'Desactivar utilizador' })
  remove(@CurrentTenant() t: { id: string }, @Param('id', ParseUUIDPipe) id: string) { return this.svc.remove(t.id, id); }
}
