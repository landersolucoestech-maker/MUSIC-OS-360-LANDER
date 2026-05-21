import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { JwtAuth } from '../guards/auth.guard';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): JwtAuth | undefined =>
    ctx.switchToHttp().getRequest<Request & { auth?: JwtAuth }>().auth,
);
