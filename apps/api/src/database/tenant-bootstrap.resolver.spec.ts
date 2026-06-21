import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { TenantBootstrapResolver } from './tenant-bootstrap.resolver';

describe('TenantBootstrapResolver', () => {
  const query = jest.fn();
  const dataSource = {
    isInitialized: true,
    query,
  } as unknown as DataSource;

  beforeEach(() => query.mockReset());

  it('resolves tenant by JWT organization identity with a read-only parameterized query', async () => {
    const tenant = {
      id: 'tenant-a',
      org_id: 'org-a',
      external_auth_org_id: null,
      name: 'A',
      slug: 'a',
      plan: 'starter',
      features: {},
      settings: {},
      active: true,
    };
    query.mockResolvedValueOnce([tenant]);

    await expect(new TenantBootstrapResolver(dataSource).resolveTenant('org-a'))
      .resolves.toEqual(tenant);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/^\s*SELECT[\s\S]+FROM tenants[\s\S]+LIMIT 1\s*$/),
      ['org-a'],
    );
    expect(query.mock.calls[0][0]).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/i);
  });

  it('resolves only an active membership for the authenticated subject', async () => {
    const member = {
      id: 'member-a',
      org_id: 'org-a',
      tenant_id: 'tenant-a',
      auth_user_id: 'user-a',
      email: 'a@example.test',
      full_name: 'A',
      role: 'owner',
      role_id: null,
      department_id: null,
      position_id: null,
      is_active: true,
    };
    query.mockResolvedValueOnce([member]);

    await expect(
      new TenantBootstrapResolver(dataSource).resolveMembership('tenant-a', 'user-a'),
    ).resolves.toEqual(member);
    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/^\s*SELECT[\s\S]+FROM org_members[\s\S]+LIMIT 1\s*$/),
      ['tenant-a', 'user-a'],
    );
    expect(query.mock.calls[0][0]).not.toMatch(/\b(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP)\b/i);
  });

  it('fails closed when the bootstrap datasource is unavailable', async () => {
    const resolver = new TenantBootstrapResolver(null);
    await expect(resolver.resolveTenant('org-a')).rejects.toThrow(ServiceUnavailableException);
  });
});
