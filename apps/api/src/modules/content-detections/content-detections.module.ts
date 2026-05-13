import { Module } from '@nestjs/common';
import { ContentDetectionsController } from './content-detections.controller';
import { ContentDetectionsService }    from './content-detections.service';

@Module({
  controllers: [ContentDetectionsController],
  providers:   [ContentDetectionsService],
  exports:     [ContentDetectionsService],
})
export class ContentDetectionsModule {}
