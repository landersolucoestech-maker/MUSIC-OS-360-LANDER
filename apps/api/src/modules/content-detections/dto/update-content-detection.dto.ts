import { PartialType } from '@nestjs/mapped-types';
import { CreateContentDetectionDto } from './create-content-detection.dto';

export class UpdateContentDetectionDto extends PartialType(CreateContentDetectionDto) {}
