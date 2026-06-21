import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentMember } from '../../core/decorators/current-member.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { JwtAuth } from '../../core/guards/auth.guard';
import { AuthContextService } from './auth-context.service';
import { Audit } from '../../core/interceptors/audit.interceptor';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { OnboardingService } from './onboarding.service';
import { AuthBootstrap } from '../../core/decorators/auth-bootstrap.decorator';
import { ProvisionWorkspaceDto } from './dto/provision-workspace.dto';
import { WorkspaceProvisioningService } from './workspace-provisioning.service';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(
    private readonly context: AuthContextService,
    private readonly onboarding: OnboardingService,
    private readonly provisioning: WorkspaceProvisioningService,
  ) {}

  @Get('context')
  @ApiOperation({ summary: 'Obter contexto SaaS do utilizador autenticado' })
  getContext(
    @CurrentUser() user: JwtAuth,
    @CurrentTenant() tenant: Record<string, unknown>,
    @CurrentMember() member: Record<string, unknown>,
  ) {
    return this.context.build(user, tenant, member);
  }

  @Patch('provision-workspace')
  @AuthBootstrap()
  @ApiOperation({ summary: 'Provisionar o primeiro workspace do usuário autenticado' })
  provisionWorkspace(
    @CurrentUser() user: JwtAuth,
    @Body() dto: ProvisionWorkspaceDto,
  ) {
    return this.provisioning.provision(user, dto);
  }

  @Patch('onboarding')
  @RequireRole('owner')
  @Audit('setting.onboarding_completed')
  @ApiOperation({ summary: 'Concluir onboarding inicial do workspace' })
  completeOnboarding(
    @CurrentUser() user: JwtAuth,
    @CurrentTenant() tenant: Record<string, unknown>,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.onboarding.complete(
      String(tenant['id']),
      String(tenant['org_id']),
      user.userId,
      dto,
    );
  }
}
