import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateContractTemplateDto } from './create-contract-template.dto';

export class UpdateContractTemplateDto extends PartialType(CreateContractTemplateDto) {
  /** Concorrência otimista — ver optimistic-update.util.ts. Opcional. */
  @ApiPropertyOptional({ description: 'updated_at lido pelo cliente antes de editar — detecta edição concorrente (409 se divergir)' })
  @IsOptional() @IsString()
  expectedUpdatedAt?: string;
}
