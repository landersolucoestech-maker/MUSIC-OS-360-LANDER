import { Module } from '@nestjs/common';
import { TakedownsController } from './takedowns.controller';
import { TakedownsService }    from './takedowns.service';

@Module({ controllers: [TakedownsController], providers: [TakedownsService], exports: [TakedownsService] })
export class TakedownsModule {}
