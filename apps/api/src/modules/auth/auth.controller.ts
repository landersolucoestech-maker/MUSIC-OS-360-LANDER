import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentMember } from '../../core/decorators/current-member.decorator';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import type { JwtAuth } from '../../core/guards/auth.guard';
import { AuthContextService } from './auth-context.service';

@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  constructor(private readonly context: AuthContextService) {}

  @Get('context')
  @ApiOperation({ summary: 'Obter contexto SaaS do utilizador autenticado' })
  getContext(
    @CurrentUser() user: JwtAuth,
    @CurrentTenant() tenant: Record<string, unknown>,
    @CurrentMember() member: Record<string, unknown>,
  ) {
    return this.context.build(user, tenant, member);
  }
}
