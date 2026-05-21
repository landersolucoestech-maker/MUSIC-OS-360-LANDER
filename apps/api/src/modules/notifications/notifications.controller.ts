import {
  Controller, Get, Post, Patch,
  Body, Param, Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentTenant }   from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }     from '../../core/decorators/current-user.decorator';
import { RequireRole }     from '../../core/decorators/roles.decorator';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PaginationDto }         from '../../common/dto/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar notificações do utilizador autenticado' })
  list(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
    @Query()         query:  PaginationDto,
  ) {
    return this.service.list(tenant.id, user.userId, query);
  }

  @Get('unread-count')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Contar notificações não lidas' })
  async countUnread(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
  ) {
    const count = await this.service.countUnread(tenant.id, user.userId);
    return { count };
  }

  @Post()
  @RequireRole('manager')
  @ApiOperation({ summary: 'Criar e enfileirar notificação' })
  enqueue(
    @CurrentTenant() tenant: { id: string },
    @Body()          dto:    CreateNotificationDto,
  ) {
    return this.service.enqueue(tenant.id, dto);
  }

  @Patch(':id/read')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  markRead(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.markRead(tenant.id, id);
  }

  @Patch('read-all')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  markAllRead(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   { userId: string },
  ) {
    return this.service.markAllRead(tenant.id, user.userId);
  }
}
