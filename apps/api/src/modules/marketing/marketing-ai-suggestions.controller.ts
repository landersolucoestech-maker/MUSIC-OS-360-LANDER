import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import type { JwtAuth } from '../../core/guards/auth.guard';
import { MarketingAiSuggestionsService } from './marketing-ai-suggestions.service';

@ApiTags('Marketing AI')
@ApiBearerAuth()
@Controller('marketing/ai-suggestions')
export class MarketingAiSuggestionsController {
  constructor(private readonly service: MarketingAiSuggestionsService) {}

  @Get()
  @RequireRole('viewer')
  @RequirePermission('marketing:read')
  list(@CurrentTenant() tenant: { id: string }) {
    return this.service.list(tenant.id);
  }

  @Post()
  @RequireRole('editor')
  @RequirePermission('marketing:create')
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() suggestion: Record<string, unknown>,
  ) {
    return this.service.create(tenant.id, user?.userId ?? '', suggestion);
  }
}
