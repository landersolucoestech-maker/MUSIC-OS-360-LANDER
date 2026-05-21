import 'reflect-metadata';
import { generateKeyPairSync } from 'crypto';

const mockPublicKey = { value: '' };

jest.mock('jwks-rsa', () => {
  return jest.fn(() => ({
    getSigningKey: jest.fn((_kid: string, cb: (err: Error | null, key?: { getPublicKey: () => string }) => void) => {
      cb(null, { getPublicKey: () => mockPublicKey.value });
    }),
  }));
});

import { JwtAuthGuard, IS_PUBLIC_KEY } from './auth.guard';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

let privateKey: string;

beforeAll(() => {
  const pair = generateKeyPairSync('ec', { namedCurve: 'P-256' });
  privateKey = pair.privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();
  mockPublicKey.value = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
});

function makeGuard(isPublic = false): JwtAuthGuard {
  const config = {
    get: jest.fn((key: string) => ({
      SUPABASE_URL: 'https://test.supabase.co',
      NODE_ENV: 'test',
    }[key])),
  } as unknown as ConfigService;

  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(isPublic),
  } as unknown as Reflector;

  const guard = new JwtAuthGuard(config, reflector);
  guard.onModuleInit();
  return guard;
}

function makeToken(payload: Record<string, unknown>, expiresIn = '1h'): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'ES256',
    expiresIn,
    keyid: 'test-kid',
  } as jwt.SignOptions);
}

function makeContext(opts: { authHeader?: string } = {}) {
  const request: Record<string, unknown> = { headers: {} };
  if (opts.authHeader) {
    (request.headers as Record<string, string>)['authorization'] = opts.authHeader;
  }
  return {
    getHandler:   jest.fn(),
    getClass:     jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as any;
}

describe('JwtAuthGuard', () => {
  afterEach(() => jest.clearAllMocks());

  it('rota @Public() retorna true sem verificar token', async () => {
    const guard = makeGuard(true);
    await expect(guard.canActivate(makeContext())).resolves.toBe(true);
  });

  it('ausencia de token lanca UnauthorizedException', async () => {
    const guard = makeGuard(false);
    await expect(guard.canActivate(makeContext())).rejects.toThrow(UnauthorizedException);
  });

  it('token JWT malformado lanca UnauthorizedException', async () => {
    const guard = makeGuard(false);
    await expect(
      guard.canActivate(makeContext({ authHeader: 'Bearer not-a-jwt' })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('token expirado lanca UnauthorizedException', async () => {
    const expired = jwt.sign(
      { sub: 'user_1', iat: Math.floor(Date.now() / 1000) - 7200, exp: Math.floor(Date.now() / 1000) - 3600 },
      privateKey,
      { algorithm: 'ES256', keyid: 'test-kid' } as jwt.SignOptions,
    );
    const guard = makeGuard(false);
    await expect(
      guard.canActivate(makeContext({ authHeader: `Bearer ${expired}` })),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('token Bearer valido com app_metadata define request.auth e retorna true', async () => {
    const token = makeToken({
      sub: 'user-abc123',
      session_id: 'sess-xyz',
      app_metadata: { org_id: 'org-tenant1', role: 'admin' },
    });

    const guard = makeGuard(false);
    const ctx = makeContext({ authHeader: `Bearer ${token}` });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    const request = ctx.switchToHttp().getRequest();
    expect(request.auth).toMatchObject({
      userId: 'user-abc123',
      orgId: 'org-tenant1',
      orgRole: 'admin',
    });
    expect(request.auth.sessionId).toBe('sess-xyz');
  });

  it('token sem app_metadata resulta em orgId null', async () => {
    const token = makeToken({ sub: 'user-no-org' });
    const guard = makeGuard(false);
    const ctx = makeContext({ authHeader: `Bearer ${token}` });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);

    const request = ctx.switchToHttp().getRequest();
    expect(request.auth.orgId).toBeNull();
    expect(request.auth.orgRole).toBeNull();
  });

  it('IS_PUBLIC_KEY e exportado', () => {
    expect(IS_PUBLIC_KEY).toBe('isPublic');
  });
});
