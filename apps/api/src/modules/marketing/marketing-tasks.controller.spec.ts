import 'reflect-metadata';
import { PERMISSIONS_KEY } from '../../core/decorators/permissions.decorator';
import { ROLES_KEY } from '../../core/decorators/roles.decorator';
import { MarketingTasksController } from './marketing-tasks.controller';

describe('MarketingTasksController authorization', () => {
  it.each([
    ['list', 'viewer', 'marketing:read'],
    ['find', 'viewer', 'marketing:read'],
    ['create', 'editor', 'marketing:create'],
    ['update', 'editor', 'marketing:update'],
    ['remove', 'manager', 'marketing:delete'],
  ] as const)('%s requires the expected role and permission', (method, role, permission) => {
    const handler = MarketingTasksController.prototype[method];
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toContain(role);
    expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toContain(permission);
  });
});
