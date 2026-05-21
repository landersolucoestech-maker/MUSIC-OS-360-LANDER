import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsUUID, IsEnum, IsNotEmpty, MaxLength, IsArray,
} from 'class-validator';

export enum ConversationStatus  { OPEN = 'open', PENDING = 'pending', CLOSED = 'closed', SPAM = 'spam' }
export enum ConversationChannel { INTERNAL = 'internal', EMAIL = 'email', WHATSAPP = 'whatsapp', TELEGRAM = 'telegram', INSTAGRAM = 'instagram', SMS = 'sms' }
export enum MessageSenderType  { USER = 'user', CONTACT = 'contact', SYSTEM = 'system', AI = 'ai' }

export class CreateConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID()   contact_id?: string;
  @ApiProperty()         @IsString()  @MaxLength(500) subject:    string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationChannel) channel?: ConversationChannel;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?: string;
}

export class UpdateConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationStatus)  status?:      ConversationStatus;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(500)  subject?:     string;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationChannel) channel?:     ConversationChannel;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?:   string;
}

export class QueryConversationDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationStatus)  status?:      ConversationStatus;
  @ApiPropertyOptional() @IsOptional() @IsEnum(ConversationChannel) channel?:     ConversationChannel;
  @ApiPropertyOptional() @IsOptional() @IsString() assigned_to?:   string;
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
