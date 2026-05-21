import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService }    from './users.service';
import { UserEventsHandler } from './handlers/user-events.handler';

@Module({
  controllers: [UsersController],
  providers:   [UsersService, UserEventsHandler],
  exports:     [UsersService],
})
export class UsersModule {}
