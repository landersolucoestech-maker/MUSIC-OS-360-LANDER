import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query,
  ParseUUIDPipe,
  HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from '@nestjs/swagger';
import { CurrentTenant }  from '../../core/decorators/current-tenant.decorator';
import { CurrentUser }    from '../../core/decorators/current-user.decorator';
import { RequireRole }    from '../../core/decorators/roles.decorator';
import { Audit }          from '../../core/interceptors/audit.interceptor';
import { ConversationsService } from './conversations.service';
import type { JwtAuth }   from '../../core/guards/auth.guard';
import {
  CreateConversationDto,
  UpdateConversationDto,
  QueryConversationDto,
  CreateMessageDto,
  CreateNoteDto,
} from './dto/conversations.dto';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  // ── Conversations ──────────────────────────────────────────────────────────

  @Get()
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar conversas do tenant' })
  list(
    @CurrentTenant() tenant: { id: string },
    @Query() query: QueryConversationDto,
  ) {
    return this.service.listConversations(tenant.id, query);
  }

  @Get(':id')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Obter conversa por ID' })
  findById(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.findConversationById(tenant.id, id);
  }

  @Post()
  @RequireRole('editor')
  @Audit('conversation.created')
  @ApiOperation({ summary: 'Criar conversa' })
  create(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   JwtAuth,
    @Body()          dto:    CreateConversationDto,
  ) {
    return this.service.createConversation(tenant.id, user.userId, dto);
  }

  @Patch(':id')
  @RequireRole('editor')
  @Audit('conversation.updated')
  @ApiOperation({ summary: 'Actualizar conversa (status, canal, assignee)' })
  update(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.service.updateConversation(tenant.id, id, dto);
  }

  @Delete(':id')
  @RequireRole('manager')
  @Audit('conversation.deleted')
  @ApiOperation({ summary: 'Arquivar conversa (soft delete)' })
  remove(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.softDeleteConversation(tenant.id, id);
  }

  // ── Assignment ────────────────────────────────────────────────────────────

  @Patch(':id/assign')
  @RequireRole('editor')
  @Audit('conversation.assigned')
  @ApiOperation({ summary: 'Atribuir conversa a um membro da equipe' })
  assign(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Body('assignee_id') assigneeId: string | null,
  ) {
    return this.service.assign(tenant.id, id, assigneeId);
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  @Get(':id/messages')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar mensagens da conversa' })
  @ApiParam({ name: 'id', description: 'ID da conversa' })
  listMessages(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit')  limit?:  number,
    @Query('offset') offset?: number,
  ) {
    return this.service.listMessages(tenant.id, id, limit ?? 50, offset ?? 0);
  }

  @Post(':id/messages')
  @RequireRole('editor')
  @Audit('conversation.message_sent')
  @ApiOperation({ summary: 'Enviar mensagem na conversa' })
  addMessage(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.service.addMessage(tenant.id, user.userId, id, dto);
  }

  // ── Notes ─────────────────────────────────────────────────────────────────

  @Get(':id/notes')
  @RequireRole('viewer')
  @ApiOperation({ summary: 'Listar notas internas da conversa' })
  listNotes(
    @CurrentTenant() tenant: { id: string },
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.service.listNotes(tenant.id, id);
  }

  @Post(':id/notes')
  @RequireRole('editor')
  @Audit('conversation.note_added')
  @ApiOperation({ summary: 'Adicionar nota interna' })
  addNote(
    @CurrentTenant() tenant: { id: string },
    @CurrentUser()   user:   JwtAuth,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.service.addNote(tenant.id, user.userId, id, dto);
  }
}
