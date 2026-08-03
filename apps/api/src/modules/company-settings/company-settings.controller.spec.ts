import { CompanySettingsController } from './company-settings.controller';
import type { CompanySettingsService } from './company-settings.service';

describe('CompanySettingsController', () => {
  let controller: CompanySettingsController;
  let svc: Record<string, jest.Mock>;
  const tenant = { id: 'tenant-1', org_id: 'org-1' };

  beforeEach(() => {
    svc = {
      get: jest.fn().mockResolvedValue({ legalName: 'Empresa' }),
      update: jest.fn().mockResolvedValue({ legalName: 'Nova Empresa' }),
    };
    controller = new CompanySettingsController(svc as unknown as CompanySettingsService);
  });

  it('get() deriva tenantId/orgId do tenant da sessão, nunca do cliente', async () => {
    await controller.get(tenant);
    expect(svc.get).toHaveBeenCalledWith('tenant-1', 'org-1');
  });

  it('update() deriva tenantId/orgId/userId da sessão e repassa o dto', async () => {
    const user = { userId: 'user-1', orgRole: 'owner' } as never;
    const dto = { legalName: 'Nova Empresa' };
    await controller.update(user, tenant, dto as never);
    expect(svc.update).toHaveBeenCalledWith('tenant-1', 'org-1', 'user-1', 'owner', dto);
  });
});
