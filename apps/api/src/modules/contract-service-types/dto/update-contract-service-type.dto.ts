import { PartialType } from '@nestjs/swagger';
import { CreateContractServiceTypeDto } from './create-contract-service-type.dto';

export class UpdateContractServiceTypeDto extends PartialType(CreateContractServiceTypeDto) {}
