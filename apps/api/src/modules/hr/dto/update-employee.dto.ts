import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateEmployeeDto } from './create-employee.dto';

export class UpdateEmployeeDto extends PartialType(CreateEmployeeDto) {
  @IsOptional() @IsString() expectedUpdatedAt?: string;
}
