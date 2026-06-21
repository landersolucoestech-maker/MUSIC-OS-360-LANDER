import { Body, Controller, Get, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '../../core/decorators/current-tenant.decorator';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { RequireRole } from '../../core/decorators/roles.decorator';
import { Audit } from '../../core/interceptors/audit.interceptor';
import type { JwtAuth } from '../../core/guards/auth.guard';
import { MusicChatAutomationService } from './musicchat-automation.service';
import {
  MusicChatInboundMessageDto,
  RunMusicChatEscalationDto,
  SendMusicChatNotificationDto,
  UpdateMusicChatAutomationSettingsDto,
} from './dto/musicchat-automation.dto';

@ApiTags('MusicChat Automation')
@ApiBearerAuth()
@Controller('conversations/musicchat/automation')
export class MusicChatAutomationController {
  constructor(private readonly service: MusicChatAutomationService) {}

  @Get('settings')
  @RequireRole('manager')
  @ApiOperation({ summary: 'Obter configurações de automação do MusicChat' })
  getSettings(@CurrentTenant() tenant: { id: string }) {
    return this.service.getSettings(tenant.id);
  }

  @Patch('settings')
  @RequireRole('manager')
  @Audit('musicchat.automation.settings_updated')
  @ApiOperation({ summary: 'Atualizar configurações de automação do MusicChat' })
  updateSettings(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser() user: JwtAuth,
    @Body() dto: UpdateMusicChatAutomationSettingsDto,
  ) {
    return this.service.updateSettings(tenant.id, user.userId, dto);
  }

  @Post('inbound')
  @RequireRole('editor')
  @Audit('musicchat.automation.inbound')
  @ApiOperation({ summary: 'Processar mensagem recebida e executar triagem automática' })
  inbound(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: MusicChatInboundMessageDto,
  ) {
    return this.service.handleInboundMessage(tenant.id, dto);
  }

  @Post('escalations/run')
  @RequireRole('manager')
  @Audit('musicchat.automation.escalation_run')
  @ApiOperation({ summary: 'Executar verificação de escalonamento de conversas sem resposta' })
  runEscalations(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: RunMusicChatEscalationDto,
  ) {
    return this.service.runEscalation(tenant.id, dto.conversationId);
  }

  @Post('notifications')
  @RequireRole('manager')
  @Audit('musicchat.automation.notification_created')
  @ApiOperation({ summary: 'Criar notificação da automação MusicChat' })
  sendNotification(
    @CurrentTenant() tenant: { id: string },
    @Body() dto: SendMusicChatNotificationDto,
  ) {
    return this.service.sendNotification(tenant.id, dto);
  }

  @Get('events')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar eventos de automação do MusicChat' })
  listEvents(
    @CurrentTenant() tenant: { id: string },
    @Query('conversationId') conversationId?: string,
  ) {
    return this.service.listEvents(tenant.id, conversationId);
  }
}
