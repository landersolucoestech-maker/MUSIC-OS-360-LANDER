import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentMember = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Record<string, unknown> | undefined =>
    ctx.switchToHttp().getRequest<Request>().currentMember,
);
