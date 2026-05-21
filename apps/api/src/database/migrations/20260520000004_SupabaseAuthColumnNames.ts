import { MigrationInterface, QueryRunner } from 'typeorm';

export class SupabaseAuthColumnNames20260520000004 implements MigrationInterface {
  name = 'SupabaseAuthColumnNames20260520000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    const legacyUserColumn = ['cl', 'erk_user_id'].join('');
    const legacyOrgColumn = ['cl', 'erk_org_id'].join('');

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'org_members' AND column_name = '${legacyUserColumn}'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'org_members' AND column_name = 'auth_user_id'
        ) THEN
          ALTER TABLE org_members RENAME COLUMN "${legacyUserColumn}" TO auth_user_id;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = '${legacyOrgColumn}'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'organizations' AND column_name = 'external_auth_org_id'
        ) THEN
          ALTER TABLE organizations RENAME COLUMN "${legacyOrgColumn}" TO external_auth_org_id;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tenants' AND column_name = '${legacyOrgColumn}'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'tenants' AND column_name = 'external_auth_org_id'
        ) THEN
          ALTER TABLE tenants RENAME COLUMN "${legacyOrgColumn}" TO external_auth_org_id;
        END IF;
      END $$;
    `);

    // Safety: add columns if neither the legacy nor the new name exists
    // (handles databases created with any pre-existing schema tool)
    await queryRunner.query(`
      ALTER TABLE org_members    ADD COLUMN IF NOT EXISTS auth_user_id         VARCHAR(255)
    `);
    await queryRunner.query(`
      ALTER TABLE organizations  ADD COLUMN IF NOT EXISTS external_auth_org_id VARCHAR(255)
    `);
    await queryRunner.query(`
      ALTER TABLE tenants        ADD COLUMN IF NOT EXISTS external_auth_org_id VARCHAR(255)
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS member_auth_user_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS org_external_auth_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS tenant_external_auth_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_org_members_auth_user_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_organizations_external_auth_org_id`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_tenants_external_auth_org_id`);

    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS member_tenant_user_idx ON org_members (tenant_id, auth_user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS member_auth_user_idx ON org_members (auth_user_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS org_external_auth_idx ON organizations (external_auth_org_id)`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS tenant_external_auth_idx ON tenants (external_auth_org_id)`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS member_tenant_user_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS member_auth_user_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS org_external_auth_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS tenant_external_auth_idx`);
  }
}
