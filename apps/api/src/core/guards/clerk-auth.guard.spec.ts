import 'reflect-metadata';
import { ClerkAuthGuard, IS_PUBLIC_KEY } from './clerk-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

import { verifyToken } from '@clerk/backend';
const mockVerifyToken = verifyToken as jest.Mock;

function makeGuard(isPublic = false, configOverride?: Partial<Record<string, string>>): ClerkAuthGuard {
  const config = {
    get: jest.fn().mockImplementation((key: string) => {
      const cfg: Record<string, string> = {
        CLERK_SECRET_KEY: 'sk_test_placeholder',
        ...configOverride,
      };
      return cfg[key];
    }),
  } as unknown as ConfigService;

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;

  return new ClerkAuthGuard(config, reflector);
}

function makeContext(opts: {
  isPublic?: boolean;
  authHeader?: string;
  sessionCookie?: string;
} = {}) {
  const request: Record<string, unknown> = { headers: {}, cookies: {} };

  if (opts.authHeader) {
    (request.headers as Record<string, string>)['authorization'] = opts.authHeader;
  }
  if (opts.sessionCookie) {
    (request.cookies as Record<string, string>)['__session'] = opts.sessionCookie;
  }

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as any;
}

describe('ClerkAuthGuard', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('rota @Public() retorna true sem verificar token', async () => {
    const guard = makeGuard(true);
    const ctx   = makeContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockVerifyToken).not.toHaveBeenCalled();
  });

  it('ausência de token lança UnauthorizedException', async () => {
    const guard = makeGuard(false);
    const ctx   = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token inválido lança UnauthorizedException', async () => {
    mockVerifyToken.mockRejectedValue(new Error('invalid token'));
    const guard = makeGuard(false);
    const ctx   = makeContext({ authHeader: 'Bearer bad-token' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token Bearer válido define request.auth e retorna true', async () => {
    mockVerifyToken.mockResolvedValue({
      sub: 'user_abc123',
      sid: 'sess_xyz',
      org_id: 'org_tenant1',
      org_role: 'admin',
    });

    const guard = makeGuard(false);
    const ctx   = makeContext({ authHeader: 'Bearer valid-token' });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.auth).toMatchObject({
      userId:    'user_abc123',
      sessionId: 'sess_xyz',
      orgId:     'org_tenant1',
      orgRole:   'admin',
    });
  });

  it('token via cookie __session é aceite quando sem Authorization header', async () => {
    mockVerifyToken.mockResolvedValue({
      sub: 'user_cookie',
      sid: 'sess_cookie',
    });

    const guard = makeGuard(false);
    const ctx   = makeContext({ sessionCookie: 'cookie-token-value' });
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
    expect(mockVerifyToken).toHaveBeenCalledWith('cookie-token-value', expect.any(Object));
  });
});
