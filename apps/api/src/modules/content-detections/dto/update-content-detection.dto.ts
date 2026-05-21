import { PartialType } from '@nestjs/swagger';
import { CreateContentDetectionDto } from './create-content-detection.dto';

export class UpdateContentDetectionDto extends PartialType(CreateContentDetectionDto) {}
