import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsUUID, IsEnum, IsNotEmpty, MaxLength, IsArray, IsObject,
} from 'class-validator';

export enum ConversationStatus  { OPEN = 'open', PENDING = 'pending', CLOSED = 'closed', SPAM = 'spam' }
export enum ConversationChannel {
  INTERNAL = 'internal',
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  TELEGRAM = 'telegram',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  TIKTOK = 'tiktok',
  SMS = 'sms',
  CUSTOM = 'custom',
}
export enum MessageSenderType  { USER = 'user', CONTACT = 'contact', SYSTEM = 'system', AI = 'ai' }
export enum ConversationServiceStatus {
  NEW = 'nova',
  WAITING_ATTENDANCE = 'aguardando_atendimento',
  IN_ATTENDANCE = 'em_atendimento',
  WAITING_CUSTOMER = 'aguardando_cliente',
  RESOLVED = 'resolvida',
  ARCHIVED = 'arquivada',
}
export enum ConversationDistributionMode {
  MANUAL = 'manual',
  ROUND_ROBIN = 'round_robin',
  LEAST_LOAD = 'least_load',
}

export class CreateConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()   contact_id?: string;
  @ApiProperty()         @IsString()  @MaxLength(500) subject:    string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationChannel) channel?: ConversationChannel;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() queue_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sector_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationServiceStatus) service_status?: ConversationServiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
}

export class UpdateConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationStatus)  status?:      ConversationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)  subject?:     string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationChannel) channel?:     ConversationChannel;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?:   string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() queue_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sector_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationServiceStatus) service_status?: ConversationServiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
  @ApiPropertyOptional() @IsOptional() @IsObject() metadata?: Record<string, unknown>;
  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}

export class QueryConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationStatus)  status?:      ConversationStatus;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationChannel) channel?:     ConversationChannel;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?:   string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() queue_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sector_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() tag_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationServiceStatus) service_status?: ConversationServiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() sla_state?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() search?:         string;
  @ApiPropertyOptional() @IsOptional() limit?:  number;
  @ApiPropertyOptional() @IsOptional() offset?: number;
}

export class CreateMessageDto {
  @ApiProperty()         @IsString() @IsNotEmpty() @MaxLength(50000) body: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() attachments?: unknown[];
}

export class CreateNoteDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(10000) body: string;
}

export class AssignConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() assignee_id?: string | null;
}

export class TransferConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() queue_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sector_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() assignee_id?: string | null;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reason?: string;
  /** Concorrência otimista (Task M) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}

export class CloseConversationDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(1000) reason: string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationServiceStatus) service_status?: ConversationServiceStatus;
  @ApiPropertyOptional() @IsOptional() @IsObject() crm_actions?: Record<string, unknown>;
}

export class ReopenConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}

export class CreateQuickReplyDto {
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) title: string;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(5000) body: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() sector_id?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray() tags?: string[];
}

export class CreateChannelAccountDto {
  @ApiProperty() @IsEnum(ConversationChannel) channel: ConversationChannel;
  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(120) name: string;
  @ApiPropertyOptional() @IsOptional() @IsObject() credentials?: Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsObject() settings?: Record<string, unknown>;
}
