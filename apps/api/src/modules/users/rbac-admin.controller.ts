import { Body, Controller, Delete, Get, Param, Patch, Post, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import type { JwtAuth } from '../../core/guards/auth.guard';
import {
  CreateTenantRoleDto,
  DuplicateTenantRoleDto,
  RoleInheritanceDto,
  UpdateTenantRoleDto,
} from './dto/rbac-admin.dto';
import { RbacAdminService } from './rbac-admin.service';

@ApiTags('RBAC Admin')
@ApiBearerAuth()
@RequireRole('owner', 'admin')
@Controller('rbac')
export class RbacAdminController {
  constructor(private readonly service: RbacAdminService) {}

  @Get('roles')
  @ApiOperation({ summary: 'Listar papéis globais e do tenant' })
  roles(
    @CurrentTenant() tenant: { id: string },
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.service.listRoles(tenant.id, includeArchived === 'true');
  }

  @Get('roles/:roleId')
  @ApiOperation({ summary: 'Detalhar papel, herança, permissões efetivas e usuários impactados' })
  roleDetail(
    @CurrentTenant() tenant: { id: string },
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.service.getRoleDetail(tenant.id, roleId);
  }

  @Get('permissions')
  @ApiOperation({ summary: 'Listar catálogo de permissões atribuíveis' })
  permissions() {
    return this.service.listPermissions();
  }

  @Get('grants')
  @ApiOperation({ summary: 'Listar grants dos papéis disponíveis no tenant' })
  grants(@CurrentTenant() tenant: { id: string }) {
    return this.service.listGrants(tenant.id);
  }

  @Post('roles')
  @Audit('role.created')
  createRole(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: CreateTenantRoleDto,
  ) {
    return this.service.createRole(tenant.id, user.userId, user.orgRole ?? 'viewer', dto);
  }

  @Patch('roles/:roleId')
  @Audit('role.updated')
  updateRole(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: UpdateTenantRoleDto,
  ) {
    return this.service.updateRole(tenant.id, user.userId, user.orgRole ?? 'viewer', roleId, dto);
  }

  @Post('roles/:roleId/duplicate')
  @Audit('role.duplicated')
  duplicateRole(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: DuplicateTenantRoleDto,
  ) {
    return this.service.duplicateRole(tenant.id, user.userId, user.orgRole ?? 'viewer', roleId, dto);
  }

  @Post('roles/:roleId/archive')
  @Audit('role.archived')
  archiveRole(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.service.archiveRole(tenant.id, user.userId, user.orgRole ?? 'viewer', roleId);
  }

  @Post('roles/:roleId/restore')
  @Audit('role.restored')
  restoreRole(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
  ) {
    return this.service.restoreRole(tenant.id, user.userId, user.orgRole ?? 'viewer', roleId);
  }

  @Post('roles/:roleId/permissions/:permissionId')
  @Audit('role.permission_granted')
  grant(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.service.grant(
      tenant.id,
      user.userId,
      user.orgRole ?? 'viewer',
      roleId,
      permissionId,
    );
  }

  @Delete('roles/:roleId/permissions/:permissionId')
  @Audit('role.permission_revoked')
  revoke(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
  ) {
    return this.service.revoke(
      tenant.id,
      user.userId,
      user.orgRole ?? 'viewer',
      roleId,
      permissionId,
    );
  }

  @Post('roles/:roleId/inheritance')
  @Audit('role.inheritance_added')
  addInheritance(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: RoleInheritanceDto,
  ) {
    return this.service.addInheritance(tenant.id, user.userId, user.orgRole ?? 'viewer', roleId, dto.parentRoleId);
  }

  @Delete('roles/:roleId/inheritance/:parentRoleId')
  @Audit('role.inheritance_removed')
  removeInheritance(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Param('parentRoleId', ParseUUIDPipe) parentRoleId: string,
  ) {
    return this.service.removeInheritance(tenant.id, user.userId, user.orgRole ?? 'viewer', roleId, parentRoleId);
  }
}
