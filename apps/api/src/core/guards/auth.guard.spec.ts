import 'reflect-metadata';
import { JwtAuthGuard, IS_PUBLIC_KEY } from './auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

/**
 * Builds a guard wired with a mock JWKS client so jwt.verify() resolves
 * without hitting a real endpoint. The mock getSigningKey always returns a
 * known HS256 secret so we can produce verifiable tokens in tests.
 */
const TEST_SECRET = 'test-secret-only-for-unit-tests';

function makeGuard(isPublic = false): JwtAuthGuard {
  const config = { get: jest.fn() } as unknown as ConfigService;
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;

  const guard = new JwtAuthGuard(config, reflector);

  // Inject a mock JWKS client — bypasses the real JWKS endpoint.
  (guard as any).jwksClient = {
    getSigningKey: jest.fn((_kid: string, cb: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
      cb(null, { getPublicKey: () => TEST_SECRET });
    }),
  };

  return guard;
}

/** Produces a real HS256 JWT (verifiable by the mock JWKS client). */
function makeToken(payload: Record<string, unknown>, expiresIn = '1h'): string {
  return jwt.sign(payload, TEST_SECRET, { algorithm: 'HS256', expiresIn, keyid: 'test-kid' } as jwt.SignOptions);
}

function makeContext(opts: { isPublic?: boolean; authHeader?: string } = {}) {
  const request: Record<string, unknown> = { headers: {} };
  if (opts.authHeader) {
    (request.headers as Record<string, string>)['authorization'] = opts.authHeader;
  }
  return {
    getHandler:    jest.fn(),
    getClass:      jest.fn(),
    switchToHttp:  jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as any;
}

describe('JwtAuthGuard', () => {
  afterEach(() => jest.clearAllMocks());

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
    // Use jwt.sign with a past expiry. jwt.sign doesn't support negative expiresIn,
    // so we set iat/exp manually.
    const expired = jwt.sign(
      { sub: 'user_1', iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 },
      TEST_SECRET,
      { algorithm: 'HS256', keyid: 'test-kid' } as jwt.SignOptions,
    );
    const guard = makeGuard(false);
    const ctx   = makeContext({ authHeader: `Bearer ${expired}` });
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('token Bearer válido com app_metadata define request.auth e retorna true', async () => {
    // JWT structure matches Supabase Custom Access Token Hook output:
    // org_id and role live in app_metadata, not at top level.
    const token = makeToken({
      sub:          'user-abc123',
      session_id:   'sess-xyz',
      app_metadata: { org_id: 'org-tenant1', role: 'admin' },
    });

    const guard  = makeGuard(false);
    const ctx    = makeContext({ authHeader: `Bearer ${token}` });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.auth).toMatchObject({
      userId:  'user-abc123',
      orgId:   'org-tenant1',
      orgRole: 'admin',
    });
    expect(request.auth.sessionId).toBe('sess-xyz');
  });

  it('token sem app_metadata resulta em orgId null', async () => {
    const token  = makeToken({ sub: 'user-no-org' });
    const guard  = makeGuard(false);
    const ctx    = makeContext({ authHeader: `Bearer ${token}` });
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    const request = ctx.switchToHttp().getRequest();
    expect(request.auth.orgId).toBeNull();
    expect(request.auth.orgRole).toBeNull();
  });

  it('IS_PUBLIC_KEY é exportado', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
