import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService }    from './users.service';
import { UserEventsHandler } from './handlers/user-events.handler';
import { MembershipRoleResolverService } from './membership-role-resolver.service';
import { RbacModule } from '../../core/rbac/rbac.module';
import { RbacAdminController } from './rbac-admin.controller';
import { RbacAdminService } from './rbac-admin.service';

@Module({
  imports:     [RbacModule],
  controllers: [UsersController, RbacAdminController],
  providers:   [UsersService, UserEventsHandler, MembershipRoleResolverService, RbacAdminService],
  exports:     [UsersService, MembershipRoleResolverService],
})
export class UsersModule {}
