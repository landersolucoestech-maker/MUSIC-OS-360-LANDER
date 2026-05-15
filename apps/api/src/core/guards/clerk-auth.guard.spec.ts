import 'reflect-metadata';
import { JwtAuthGuard, ClerkAuthGuard, IS_PUBLIC_KEY } from './clerk-auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';

/** Generates a minimal unsigned JWT token for testing. */
function makeJwt(payload: Record<string, unknown>): string {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body    = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

function makeGuard(isPublic = false): JwtAuthGuard {
  const config = {
    get: jest.fn(),
  } as unknown as ConfigService;

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;

  return new JwtAuthGuard(config, reflector);
}

function makeContext(opts: {
  isPublic?: boolean;
  authHeader?: string;
  cookie?: string;
} = {}) {
  const request: Record<string, unknown> = { headers: {}, cookies: {} };

  if (opts.authHeader) {
    (request.headers as Record<string, string>)['authorization'] = opts.authHeader;
  }
  if (opts.cookie) {
    (request.cookies as Record<string, string>)['musicos360_rt'] = opts.cookie;
  }

  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('JwtAuthGuard (ClerkAuthGuard alias)', () => {
  afterEach(() => jest.clearAllMocks());

  it('ClerkAuthGuard é um alias de JwtAuthGuard', () => {
    expect(ClerkAuthGuard).toBe(JwtAuthGuard);
  });

  it('rota @Public() retorna true sem verificar token', async () => {
    const guard  = makeGuard(true);
    const ctx    = makeContext();
    const result = await guard.canActivate(ctx);
    expect(result).toBe(true);
  });

  it('ausência de token lança UnauthorizedException', async () => {
    const guard = makeGuard(false);
    const ctx   = makeContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token JWT malformado lança UnauthorizedException', async () => {
    const guard = makeGuard(false);
    const ctx   = makeContext({ authHeader: 'Bearer not-a-jwt' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token expirado lança UnauthorizedException', async () => {
    const expired = makeJwt({ sub: 'user_1', exp: Math.floor(Date.now() / 1000) - 3600 });
    const guard   = makeGuard(false);
    const ctx     = makeContext({ authHeader: `Bearer ${expired}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token Bearer válido define request.auth e retorna true', async () => {
    const token = makeJwt({
      sub:      'user_abc123',
      sid:      'sess_xyz',
      org_id:   'org_tenant1',
      org_role: 'admin',
      exp:      Math.floor(Date.now() / 1000) + 3600,
    });

    const guard  = makeGuard(false);
    const ctx    = makeContext({ authHeader: `Bearer ${token}` });
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

  it('token via cookie musicos360_rt é aceite quando sem Authorization header', async () => {
    const token = makeJwt({
      sub: 'user_cookie',
      sid: 'sess_cookie',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    const guard  = makeGuard(false);
    const ctx    = makeContext({ cookie: token });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.auth.userId).toBe('user_cookie');
  });

  it('IS_PUBLIC_KEY é exportado', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
