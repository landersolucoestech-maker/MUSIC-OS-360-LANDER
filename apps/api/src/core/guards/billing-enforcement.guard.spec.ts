import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingEnforcementGuard } from './billing-enforcement.guard';
import { BillingEnforcementService } from '../../modules/billing/billing-enforcement.service';

function context(method: string, url: string): ExecutionContext {
  const request = {
    method,
    originalUrl: url,
    url,
    tenant: { id: 'tenant-1' },
  };
  return {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  } as unknown as ExecutionContext;
}

function setup(status: string | null) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(false),
  } as unknown as Reflector;
  const billing = {
    getState: jest.fn().mockResolvedValue(status ? { status } : null),
  } as unknown as BillingEnforcementService;
  return {
    guard: new BillingEnforcementGuard(reflector, billing),
    billing,
  };
}

describe('BillingEnforcementGuard', () => {
  it('bloqueia rota tenant-scoped quando tenant esta suspended', async () => {
    const { guard } = setup('suspended');
    await expect(guard.canActivate(context('GET', '/api/v1/artists'))).rejects.toThrow(ForbiddenException);
  });

  it('permite /billing mesmo quando tenant esta suspended', async () => {
    const { guard } = setup('suspended');
    await expect(guard.canActivate(context('POST', '/api/v1/billing/portal'))).resolves.toBe(true);
  });

  it('permite leitura em read_only', async () => {
    const { guard } = setup('read_only');
    await expect(guard.canActivate(context('GET', '/api/v1/contracts'))).resolves.toBe(true);
  });

  it('bloqueia mutacao em read_only', async () => {
    const { guard } = setup('read_only');
    await expect(guard.canActivate(context('POST', '/api/v1/contracts'))).rejects.toThrow(ForbiddenException);
  });
});
