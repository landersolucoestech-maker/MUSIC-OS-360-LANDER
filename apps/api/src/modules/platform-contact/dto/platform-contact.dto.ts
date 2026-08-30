import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class PlatformContactDto {
  @ApiProperty() @IsString() @MaxLength(255) name!: string;

  @ApiProperty() @IsEmail() @MaxLength(255) email!: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) company?: string;

  @ApiProperty() @IsString() @MaxLength(4000) message!: string;

  @ApiPropertyOptional({ description: 'Honeypot; must remain empty' })
  @IsOptional() @IsString() @MaxLength(255)
  website?: string;
}
