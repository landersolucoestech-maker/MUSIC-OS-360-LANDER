import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export const CurrentTenant = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Record<string, unknown> | undefined =>
    ctx.switchToHttp().getRequest<Request>().tenant,
);
