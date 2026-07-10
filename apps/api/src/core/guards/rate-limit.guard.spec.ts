import type { ExecutionContext } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';
import type { RateLimitService } from '../security/rate-limit.service';

function makeContext(path: string, method = 'GET') {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        path,
        headers: {},
        ip: '127.0.0.1',
      }),
    }),
  } as unknown as ExecutionContext;
}

describe('RateLimitGuard categories', () => {
  it.each([
    ['/api/v1/auth/login', 'auth'],
    ['/api/v1/dev-auth/token', 'auth'],
    ['/api/v1/ai/complete', 'ai'],
    ['/api/v1/uploads/presign', 'upload'],
    ['/api/v1/billing/webhook/stripe', 'webhook'],
    ['/api/v1/artists', 'api'],
  ])('aplica categoria %s -> %s', async (path, category) => {
    const service = { check: jest.fn().mockResolvedValue(undefined) };
    const guard = new RateLimitGuard(service as unknown as RateLimitService);

    await expect(guard.canActivate(makeContext(path))).resolves.toBe(true);

    expect(service.check).toHaveBeenCalledWith(
      category,
      expect.stringContaining(`GET:${path}`),
    );
  });
});
