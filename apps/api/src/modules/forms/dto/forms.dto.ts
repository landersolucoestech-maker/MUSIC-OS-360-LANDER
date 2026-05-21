import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsOptional, IsArray, IsEnum, MaxLength, IsNotEmpty, IsObject, IsIP,
} from 'class-validator';

export enum FormStatus { DRAFT = 'draft', ACTIVE = 'active', ARCHIVED = 'archived' }

export class CreateFormDto {
  @ApiProperty()         @IsString()  @IsNotEmpty() @MaxLength(500) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString()                   description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray()                    fields?: unknown[];
  @ApiPropertyOptional() @IsOptional() @IsObject()                   settings?: Record<string, unknown>;
}

export class UpdateFormDto {
  @ApiPropertyOptional() @IsOptional() @IsString()  @MaxLength(500) name?:        string;
  @ApiPropertyOptional() @IsOptional() @IsString()                  description?: string;
  @ApiPropertyOptional() @IsOptional() @IsArray()                   fields?:      unknown[];
  @ApiPropertyOptional() @IsOptional() @IsObject()                  settings?:    Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsEnum(FormStatus)          status?:      FormStatus;
}

export class QueryFormDto {
  @ApiPropertyOptional() @IsOptional() @IsEnum(FormStatus) status?: FormStatus;
  @ApiPropertyOptional() @IsOptional() @IsString()         search?: string;
  @ApiPropertyOptional() @IsOptional() limit?:  number;
  @ApiPropertyOptional() @IsOptional() offset?: number;
}

export class SubmitFormDto {
  @ApiProperty()         @IsObject()                  data:     Record<string, unknown>;
  @ApiPropertyOptional() @IsOptional() @IsString()    origin?:  string;
}
