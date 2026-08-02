import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Payload do endpoint atômico de troca obrigatória de senha (Parte 74).
 * A força da senha é validada no service (password-policy.ts), não aqui —
 * queremos mensagens de violação específicas por regra, não um erro
 * genérico de class-validator.
 */
export class ChangeRequiredPasswordDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) newPassword!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(128) confirmPassword!: string;
}
