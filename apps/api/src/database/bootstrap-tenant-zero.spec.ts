import { bootstrapTenantZero } from './bootstrap-tenant-zero';
import { TENANT_ZERO_ORG_ID, TENANT_ZERO_TENANT_ID, TENANT_ZERO_SLUG, TENANT_ZERO_NAME } from './tenant-zero.constants';

/**
 * Fake DataSource in-memory: modela apenas o suficiente das tabelas
 * organizations/tenants/billing_subscriptions/org_members/audit_logs para
 * exercitar as invariantes do bootstrap sem precisar de um Postgres real —
 * o e2e/CI (verify:tenant-isolation, DB Verify) cobre o comportamento real
 * de RLS/constraints contra um banco de verdade.
 */
function buildFakeDataSource(seed?: { organizations?: any[]; tenants?: any[] }) {
  const state = {
    organizations: seed?.organizations ? [...seed.organizations] : ([] as any[]),
    tenants: seed?.tenants ? [...seed.tenants] : ([] as any[]),
    billing_subscriptions: [] as any[],
    org_members: [] as any[],
    audit_logs: [] as any[],
  };

  const query = jest.fn(async (sql: string, params: unknown[] = []) => {
    const s = sql.replace(/\s+/g, ' ').trim();

    if (s.startsWith('SELECT id FROM organizations WHERE is_system_tenant = true')) {
      const [excludeId] = params as [string];
      return state.organizations.filter((o) => o.is_system_tenant && o.id !== excludeId);
    }
    if (s.startsWith('SELECT id FROM tenants WHERE is_system_tenant = true')) {
      const [excludeId] = params as [string];
      return state.tenants.filter((t) => t.is_system_tenant && t.id !== excludeId);
    }
    if (s.startsWith('SELECT slug, name FROM organizations WHERE id = $1')) {
      const [id] = params as [string];
      return state.organizations.filter((o) => o.id === id);
    }
    if (s.startsWith('SELECT slug, name FROM tenants WHERE id = $1')) {
      const [id] = params as [string];
      return state.tenants.filter((t) => t.id === id);
    }
    if (s.startsWith('INSERT INTO organizations')) {
      const [id, name, slug] = params as [string, string, string];
      const existing = state.organizations.find((o) => o.id === id);
      if (existing) {
        existing.name = name;
        existing.slug = slug;
        existing.is_system_tenant = true;
      } else {
        state.organizations.push({ id, name, slug, is_system_tenant: true });
      }
      return [];
    }
    if (s.startsWith('INSERT INTO tenants')) {
      const [id, orgId, name, slug] = params as [string, string, string, string];
      const existing = state.tenants.find((t) => t.id === id);
      if (existing) {
        existing.name = name;
        existing.slug = slug;
        existing.org_id = orgId;
        existing.is_system_tenant = true;
        existing.active = true;
      } else {
        state.tenants.push({ id, org_id: orgId, name, slug, is_system_tenant: true, active: true });
      }
      return [];
    }
    if (s.startsWith('INSERT INTO billing_subscriptions')) {
      state.billing_subscriptions.push({ params });
      return [];
    }
    if (s.startsWith('INSERT INTO org_members')) {
      state.org_members.push({ params });
      return [];
    }
    if (s.startsWith('INSERT INTO audit_logs')) {
      state.audit_logs.push({ params });
      return [];
    }
    throw new Error(`Query não mapeada no fake DataSource: ${s}`);
  });

  return { query, state } as unknown as { query: jest.Mock; state: typeof state };
}

describe('bootstrapTenantZero', () => {
  afterEach(() => {
    delete process.env['NODE_ENV'];
    delete process.env['TENANT_ZERO_OWNER_AUTH_USER_ID'];
    delete process.env['TENANT_ZERO_OWNER_EMAIL'];
  });

  it('cria a LANDER RECORDS quando ausente (created=true) e registra auditoria de criação', async () => {
    process.env['NODE_ENV'] = 'development';
    const ds = buildFakeDataSource();

    const result = await bootstrapTenantZero(ds as never);

    expect(result).toEqual({ orgId: TENANT_ZERO_ORG_ID, tenantId: TENANT_ZERO_TENANT_ID, created: true });
    expect(ds.state.organizations).toHaveLength(1);
    expect(ds.state.organizations[0]).toMatchObject({ id: TENANT_ZERO_ORG_ID, slug: TENANT_ZERO_SLUG, name: TENANT_ZERO_NAME, is_system_tenant: true });
    expect(ds.state.tenants[0]).toMatchObject({ id: TENANT_ZERO_TENANT_ID, is_system_tenant: true });
    expect(ds.state.audit_logs).toHaveLength(1);
  });

  it('é idempotente: rodar duas vezes não duplica linhas e a segunda execução reporta created=false', async () => {
    process.env['NODE_ENV'] = 'development';
    const ds = buildFakeDataSource();

    const first = await bootstrapTenantZero(ds as never);
    const second = await bootstrapTenantZero(ds as never);

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(ds.state.organizations).toHaveLength(1);
    expect(ds.state.tenants).toHaveLength(1);
  });

  it('rejeita quando outra organização já reivindicou is_system_tenant=true', async () => {
    const ds = buildFakeDataSource({
      organizations: [{ id: 'some-other-org-id', slug: 'outra-org', name: 'Outra Org', is_system_tenant: true }],
    });

    await expect(bootstrapTenantZero(ds as never)).rejects.toThrow(/já está marcado is_system_tenant=true/);
  });

  it('rejeita quando o ID canônico já existe com slug divergente (nunca sobrescreve identidade)', async () => {
    const ds = buildFakeDataSource({
      organizations: [{ id: TENANT_ZERO_ORG_ID, slug: 'nome-errado', name: 'Nome Errado', is_system_tenant: true }],
    });

    await expect(bootstrapTenantZero(ds as never)).rejects.toThrow(/slug divergente|Identidade divergente/);
  });

  it('em produção, exige TENANT_ZERO_OWNER_AUTH_USER_ID e TENANT_ZERO_OWNER_EMAIL — nunca cria owner sintético', async () => {
    process.env['NODE_ENV'] = 'production';
    const ds = buildFakeDataSource();

    await expect(bootstrapTenantZero(ds as never)).rejects.toThrow(/owner real/);
    expect(ds.state.org_members).toHaveLength(0);
  });

  it('em produção com owner real fornecido, cria org_members com os dados fornecidos (não o sintético)', async () => {
    process.env['NODE_ENV'] = 'production';
    process.env['TENANT_ZERO_OWNER_AUTH_USER_ID'] = 'real-owner-auth-id';
    process.env['TENANT_ZERO_OWNER_EMAIL'] = 'real-owner@landerrecords.com';
    const ds = buildFakeDataSource();

    await bootstrapTenantZero(ds as never);

    expect(ds.state.org_members).toHaveLength(1);
    const [, , authUserId, email] = ds.state.org_members[0].params as string[];
    expect(authUserId).toBe('real-owner-auth-id');
    expect(email).toBe('real-owner@landerrecords.com');
  });
});
