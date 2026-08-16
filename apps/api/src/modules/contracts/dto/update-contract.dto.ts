import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateContractDto } from './create-contract.dto';

export class UpdateContractDto extends PartialType(CreateContractDto) {
  /** Concorrência otimista (Task K) — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional() @IsOptional() @IsString() expectedUpdatedAt?: string;
}
