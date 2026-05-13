import { PartialType } from '@nestjs/swagger';
import { CreateContractTemplateDto } from './create-contract-template.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn } from 'class-validator';

export class UpdateContractTemplateDto extends PartialType(CreateContractTemplateDto) {
  @ApiPropertyOptional({ enum: ['active', 'archived'] })
  @IsOptional() @IsIn(['active', 'archived'])
  status?: string;
}
