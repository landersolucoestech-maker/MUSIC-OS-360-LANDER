import { Module } from '@nestjs/common';
import { PhonogramsController } from './phonograms.controller';
import { PhonogramsService }    from './phonograms.service';

@Module({
  controllers: [PhonogramsController],
  providers:   [PhonogramsService],
  exports:     [PhonogramsService],
})
export class PhonogramsModule {}
