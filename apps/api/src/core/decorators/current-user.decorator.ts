import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ClerkAuth } from '../guards/clerk-auth.guard';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): ClerkAuth | undefined =>
    ctx.switchToHttp().getRequest<Request & { auth?: ClerkAuth }>().auth,
);
