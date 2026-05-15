import { Injectable, ForbiddenException } from '@nestjs/common';

export type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'FINANCIAL' | 'MARKETING' | 'ARTIST' | 'RADIO' | 'TV';

const ROLE_HIERARCHY: Record<Role, number> = {
  OWNER: 100, ADMIN: 90, MANAGER: 70,
  FINANCIAL: 60, MARKETING: 50, RADIO: 40, TV: 40, ARTIST: 30,
};

export type Resource = 'artist' | 'catalog' | 'contracts' | 'accounting' | 'crm' | 'marketing' | 'monitoring' | 'releases' | 'projects' | 'events' | 'inventory' | 'rh' | 'settings' | 'licensing' | 'leads' | 'analytics';
export type Action = 'read' | 'create' | 'update' | 'delete' | 'export' | 'approve';

const ROLE_PERMISSIONS: Record<Role, Array<`${Resource}:${Action}`>> = {
  OWNER: ['artist:read','artist:create','artist:update','artist:delete','catalog:read','catalog:create','catalog:update','catalog:delete','contracts:read','contracts:create','contracts:update','contracts:delete','accounting:read','accounting:create','accounting:update','accounting:delete','settings:read','settings:update'],
  ADMIN: ['artist:read','artist:create','artist:update','artist:delete','catalog:read','catalog:create','catalog:update','catalog:delete','contracts:read','contracts:create','contracts:update','contracts:delete','accounting:read','accounting:create','accounting:update','accounting:delete','settings:read','settings:update'],
  MANAGER: ['artist:read','artist:create','artist:update','catalog:read','catalog:create','catalog:update','contracts:read','contracts:create','accounting:read','crm:read','crm:create','crm:update','marketing:read','marketing:create','marketing:update'],
  FINANCIAL: ['accounting:read','accounting:create','accounting:update','accounting:delete','accounting:export','artist:read','contracts:read'],
  MARKETING: ['marketing:read','marketing:create','marketing:update','marketing:delete','analytics:read','releases:read','releases:create','artist:read','catalog:read'],
  ARTIST: ['artist:read','catalog:read','releases:read'],
  RADIO: ['catalog:read','monitoring:read','licensing:read'],
  TV: ['catalog:read','monitoring:read','licensing:read'],
};

@Injectable()
export class RbacService {
  hasRole(userRole: Role, required: Role): boolean {
    return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[required] ?? 0);
  }

  can(role: Role, resource: Resource, action: Action): boolean {
    const perms = ROLE_PERMISSIONS[role] ?? [];
    return perms.includes(`${resource}:${action}`);
  }

  assertCan(role: Role, resource: Resource, action: Action): void {
    if (!this.can(role, resource, action)) {
      throw new ForbiddenException(`Permissão negada: ${role} não pode ${action} em ${resource}`);
    }
  }

  getPermissions(role: Role): string[] {
    return ROLE_PERMISSIONS[role] ?? [];
  }
}
