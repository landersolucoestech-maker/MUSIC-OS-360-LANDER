import { PartialType } from '@nestjs/swagger';
import { CreatePhonogramDto } from './create-phonogram.dto';

export class UpdatePhonogramDto extends PartialType(CreatePhonogramDto) {}
