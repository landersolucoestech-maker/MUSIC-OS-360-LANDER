import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MustChangePasswordGuard } from './must-change-password.guard';

function context(url: string, appMetadata: Record<string, unknown> | undefined): ExecutionContext {
  const request = {
    method: 'GET',
    originalUrl: url,
    url,
    auth: appMetadata !== undefined ? { claims: { app_metadata: appMetadata } } : undefined,
  };
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;
}

function setup(reflectorOverrides: { isPublic?: boolean; isAuthBootstrap?: boolean } = {}) {
  const reflector = {
    getAllAndOverride: jest.fn()
      .mockReturnValueOnce(reflectorOverrides.isPublic ?? false)
      .mockReturnValueOnce(reflectorOverrides.isAuthBootstrap ?? false),
  } as unknown as Reflector;
  return new MustChangePasswordGuard(reflector);
}

describe('MustChangePasswordGuard', () => {
  it('bloqueia rota comum quando must_change_password=true', () => {
    const guard = setup();
    expect(() => guard.canActivate(context('/api/v1/artists', { must_change_password: true }))).toThrow(ForbiddenException);
  });

  it('permite rota allowlisted (/auth/context) mesmo com must_change_password=true', () => {
    const guard = setup();
    expect(guard.canActivate(context('/api/v1/auth/context', { must_change_password: true }))).toBe(true);
  });

  it('permite /auth/change-required-password mesmo com a flag true (única forma de sair do estado)', () => {
    const guard = setup();
    expect(guard.canActivate(context('/api/v1/auth/change-required-password', { must_change_password: true }))).toBe(true);
  });

  it('permite rota comum quando must_change_password é false ou ausente', () => {
    const guard = setup();
    expect(guard.canActivate(context('/api/v1/artists', {}))).toBe(true);
    expect(guard.canActivate(context('/api/v1/artists', undefined))).toBe(true);
  });

  it('rota @Public() ignora a checagem mesmo com must_change_password=true', () => {
    const guard = setup({ isPublic: true });
    expect(guard.canActivate(context('/api/v1/artists', { must_change_password: true }))).toBe(true);
  });

  it('rota @AuthBootstrap() ignora a checagem mesmo com must_change_password=true', () => {
    const guard = setup({ isPublic: false, isAuthBootstrap: true });
    expect(guard.canActivate(context('/api/v1/artists', { must_change_password: true }))).toBe(true);
  });
});
