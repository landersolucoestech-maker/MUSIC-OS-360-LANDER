import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronAuthGuard } from './cron-auth.guard';

function makeContext(authorizationHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization: authorizationHeader } }),
    }),
  } as unknown as ExecutionContext;
}

function makeConfig(secret: string | undefined): ConfigService {
  return { get: jest.fn(() => secret) } as unknown as ConfigService;
}

describe('CronAuthGuard', () => {
  it('nega (fail-closed) quando CRON_SECRET não está configurado, mesmo com header correto', () => {
    const guard = new CronAuthGuard(makeConfig(undefined));
    expect(() => guard.canActivate(makeContext('Bearer anything'))).toThrow(UnauthorizedException);
  });

  it('nega quando o header Authorization está ausente', () => {
    const guard = new CronAuthGuard(makeConfig('s3cr3t'));
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException);
  });

  it('nega quando o header Authorization não bate com o secret configurado', () => {
    const guard = new CronAuthGuard(makeConfig('s3cr3t'));
    expect(() => guard.canActivate(makeContext('Bearer wrong-value'))).toThrow(UnauthorizedException);
  });

  it('nega quando falta o prefixo "Bearer "', () => {
    const guard = new CronAuthGuard(makeConfig('s3cr3t'));
    expect(() => guard.canActivate(makeContext('s3cr3t'))).toThrow(UnauthorizedException);
  });

  it('permite quando o header Authorization é exatamente "Bearer <CRON_SECRET>"', () => {
    const guard = new CronAuthGuard(makeConfig('s3cr3t'));
    expect(guard.canActivate(makeContext('Bearer s3cr3t'))).toBe(true);
  });
});
