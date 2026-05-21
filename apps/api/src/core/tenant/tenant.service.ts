import { Injectable, NotFoundException } from '@nestjs/common';

export interface TenantInfo {
  id: string;
  slug: string;
  plan: 'starter' | 'professional' | 'enterprise';
  name: string;
  active: boolean;
}

/**
 * TenantService — resolução e validação de tenant por request.
 * Em produção: consulta banco de dados real.
 * Em mock/test: retorna tenant padrão de desenvolvimento.
 */
@Injectable()
export class TenantService {
  private readonly mockTenant: TenantInfo = {
    id: 'mock-org-000000000000000000000000001',
    slug: 'musicos360',
    plan: 'enterprise',
    name: 'MUSIC OS 360 Demo',
    active: true,
  };

  async resolveBySlug(slug: string): Promise<TenantInfo> {
    // TODO: query database for tenant by slug
    if (slug === this.mockTenant.slug || process.env['NODE_ENV'] === 'development') {
      return this.mockTenant;
    }
    throw new NotFoundException(`Tenant "${slug}" não encontrado`);
  }

  async resolveById(id: string): Promise<TenantInfo> {
    // TODO: query database for tenant by id
    if (id === this.mockTenant.id || process.env['NODE_ENV'] === 'development') {
      return this.mockTenant;
    }
    throw new NotFoundException(`Tenant "${id}" não encontrado`);
  }

  async validateTenantAccess(tenantId: string, resourceTenantId: string): Promise<void> {
    if (tenantId !== resourceTenantId) {
      throw new Error(`Acesso negado: recurso pertence a outro tenant`);
    }
  }

  async isFeatureEnabled(tenantId: string, feature: string): Promise<boolean> {
    const tenant = await this.resolveById(tenantId);
    const planFeatures: Record<string, string[]> = {
      starter: [],
      professional: ['analytics', 'monitoring', 'multiUser', 'advancedReports'],
      enterprise: ['analytics', 'monitoring', 'acrcloud', 'multiUser', 'apiAccess', 'advancedReports', 'sso'],
    };
    return planFeatures[tenant.plan]?.includes(feature) ?? false;
  }
}
