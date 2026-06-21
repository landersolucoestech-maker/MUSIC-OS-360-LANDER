import { getMetadataArgsStorage } from 'typeorm';
import { ALL_ENTITIES, UserEntity } from './entities';
import { CreateUsersProjection20260614000000 } from './migrations/20260614000000_CreateUsersProjection';

describe('CreateUsersProjection20260614000000', () => {
  it('creates only the empty, locked-down public.users projection', async () => {
    const query = jest.fn(async (_sql: string) => undefined);

    await new CreateUsersProjection20260614000000().up({ query } as never);

    const sql = query.mock.calls.map(([statement]) => String(statement)).join('\n');
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.users');
    expect(sql).toContain('id            UUID        PRIMARY KEY');
    expect(sql).toContain('auth_user_id  TEXT        NOT NULL');
    expect(sql).toContain('CONSTRAINT uq_users_auth_user_id UNIQUE (auth_user_id)');
    expect(sql).toContain('REVOKE ALL PRIVILEGES ON TABLE public.users FROM PUBLIC');
    expect(sql).toContain('ALTER TABLE public.users ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('ALTER TABLE public.users FORCE ROW LEVEL SECURITY');
    expect(sql).not.toMatch(/\b(?:INSERT|UPDATE|DELETE)\b\s+(?:INTO|FROM)?\s*org_members/i);
    expect(sql).not.toMatch(/CREATE POLICY/i);
  });

  it('rolls back only the projection table', async () => {
    const query = jest.fn(async (_sql: string) => undefined);

    await new CreateUsersProjection20260614000000().down({ query } as never);

    expect(query).toHaveBeenCalledTimes(1);
    expect(String(query.mock.calls[0]?.[0])).toBe('DROP TABLE IF EXISTS public.users');
  });

  it('registers entity metadata without identity generation or auth fields', () => {
    const storage = getMetadataArgsStorage();
    const table = storage.tables.find((entry) => entry.target === UserEntity);
    const columns = storage.columns.filter((entry) => entry.target === UserEntity);
    const columnNames = columns.map((entry) => entry.propertyName);
    const id = columns.find((entry) => entry.propertyName === 'id');

    expect(table?.name).toBe('users');
    expect(table?.schema).toBe('public');
    expect(columnNames).toEqual([
      'id',
      'auth_user_id',
      'email',
      'display_name',
      'created_at',
      'updated_at',
    ]);
    expect(id?.options.primary).toBe(true);
    expect(id?.options.generated).toBeFalsy();
    expect(columnNames).not.toContain('password');
    expect(ALL_ENTITIES).toContain(UserEntity);
  });
});
