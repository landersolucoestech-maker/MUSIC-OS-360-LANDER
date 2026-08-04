import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconciles RBAC decision-log partition ACLs after discovering that database
 * default privileges can grant UPDATE/DELETE to a newly created partition.
 * The hardening helper now always revokes every application-role privilege
 * before restoring the intended append/read-only SELECT + INSERT contract.
 */
export class FixRbacDecisionLogPartitionAcl20260804000003
  implements MigrationInterface
{
  name = 'FixRbacDecisionLogPartitionAcl20260804000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.harden_rbac_decision_log_partition(
        target_table regclass
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $fn$
      DECLARE
        target_schema text;
        target_name text;
        parent_table regclass := to_regclass('public.rbac_decision_logs');
        is_target boolean;
      BEGIN
        IF parent_table IS NULL THEN
          RETURN;
        END IF;

        SELECT
          namespace.nspname,
          relation.relname,
          relation.oid = parent_table OR EXISTS (
            SELECT 1
            FROM pg_inherits inheritance
            WHERE inheritance.inhparent = parent_table
              AND inheritance.inhrelid = relation.oid
          )
        INTO target_schema, target_name, is_target
        FROM pg_class relation
        JOIN pg_namespace namespace ON namespace.oid = relation.relnamespace
        WHERE relation.oid = target_table;

        IF target_name IS NULL OR NOT is_target THEN
          RAISE EXCEPTION
            '% is not public.rbac_decision_logs or one of its partitions',
            target_table;
        END IF;

        EXECUTE format(
          'ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY',
          target_schema,
          target_name
        );
        EXECUTE format(
          'ALTER TABLE %I.%I FORCE ROW LEVEL SECURITY',
          target_schema,
          target_name
        );

        EXECUTE format(
          'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC',
          target_schema,
          target_name
        );
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
          EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM anon',
            target_schema,
            target_name
          );
        END IF;
        IF EXISTS (
          SELECT 1 FROM pg_roles WHERE rolname = 'authenticated'
        ) THEN
          EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM authenticated',
            target_schema,
            target_name
          );
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
          EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM musicos_app',
            target_schema,
            target_name
          );
          EXECUTE format(
            'GRANT SELECT, INSERT ON TABLE %I.%I TO musicos_app',
            target_schema,
            target_name
          );
        END IF;

        EXECUTE format(
          'DROP POLICY IF EXISTS tenant_isolation ON %I.%I',
          target_schema,
          target_name
        );
        EXECUTE format(
          'CREATE POLICY tenant_isolation ON %I.%I
             FOR ALL TO authenticated
             USING (tenant_id = private_get_tenant_id())
             WITH CHECK (tenant_id = private_get_tenant_id())',
          target_schema,
          target_name
        );

        EXECUTE format(
          'DROP POLICY IF EXISTS super_admin_full_access ON %I.%I',
          target_schema,
          target_name
        );
        EXECUTE format(
          'CREATE POLICY super_admin_full_access ON %I.%I
             FOR ALL TO authenticated
             USING (app_is_super_admin())
             WITH CHECK (app_is_super_admin())',
          target_schema,
          target_name
        );
      END;
      $fn$
    `);

    await queryRunner.query(`
      SELECT public.ensure_rbac_decision_log_partitions(current_date, 2)
    `);
  }

  /** Security hardening is intentionally irreversible. */
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
