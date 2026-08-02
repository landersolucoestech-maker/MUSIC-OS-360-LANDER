import { getMigrationCategory, isApplicationMigration, listExternalManagedMigrationNames, MigrationCategory } from './migration-classification';
import { ALL_MIGRATIONS } from './migrations/index';

describe('migration-classification', () => {
  it('classifica a migration Realtime como EXTERNAL_MANAGED', () => {
    expect(getMigrationCategory('RealtimeBroadcastAuthorization20260801000001')).toBe(MigrationCategory.EXTERNAL_MANAGED);
    expect(isApplicationMigration('RealtimeBroadcastAuthorization20260801000001')).toBe(false);
  });

  it('classifica a migration do tenant-zero como APPLICATION (default)', () => {
    expect(getMigrationCategory('TenantZeroFormalization20260801000002')).toBe(MigrationCategory.APPLICATION);
    expect(isApplicationMigration('TenantZeroFormalization20260801000002')).toBe(true);
  });

  it('qualquer nome desconhecido é APPLICATION por padrão — nunca EXTERNAL/PRIVILEGED por engano', () => {
    expect(getMigrationCategory('AlgumaMigrationQueNuncaExistiu99999999999999')).toBe(MigrationCategory.APPLICATION);
  });

  it('listExternalManagedMigrationNames expõe exatamente as migrations EXTERNAL_MANAGED conhecidas', () => {
    expect(listExternalManagedMigrationNames()).toEqual(['RealtimeBroadcastAuthorization20260801000001']);
  });

  it('regressão: toda migration real registrada em ALL_MIGRATIONS resolve para uma categoria válida', () => {
    const validCategories = new Set(Object.values(MigrationCategory));
    for (const MigrationClass of ALL_MIGRATIONS) {
      const instance = new MigrationClass();
      expect(validCategories.has(getMigrationCategory(instance.name))).toBe(true);
    }
  });

  it('regressão: exatamente uma migration real é EXTERNAL_MANAGED hoje (a do Realtime) — nenhuma outra foi classificada por engano', () => {
    const externalNames = ALL_MIGRATIONS
      .map((MigrationClass) => new MigrationClass())
      .filter((instance) => getMigrationCategory(instance.name) === MigrationCategory.EXTERNAL_MANAGED)
      .map((instance) => instance.name);
    expect(externalNames).toEqual(['RealtimeBroadcastAuthorization20260801000001']);
  });
});
