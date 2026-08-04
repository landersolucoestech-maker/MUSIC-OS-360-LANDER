import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hardens the partitioned RBAC decision audit log against direct-child access.
 *
 * PostgreSQL does not propagate a partitioned parent's RLS settings or policies
 * to a child addressed directly. Every current and future partition therefore
 * receives FORCE RLS plus the same tenant/super-admin policies as the parent.
 */
export class HardenRbacDecisionLogPartitions20260804000002
  implements MigrationInterface
{
  name = 'HardenRbacDecisionLogPartitions20260804000002';

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
          RAISE EXCEPTION '% is not public.rbac_decision_logs or one of its partitions', target_table;
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
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
          EXECUTE format(
            'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM authenticated',
            target_schema,
            target_name
          );
        END IF;
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') THEN
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
      CREATE OR REPLACE FUNCTION public.ensure_rbac_decision_log_partitions(
        reference_date date DEFAULT current_date,
        months_ahead integer DEFAULT 2
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      SET search_path = public, pg_catalog
      AS $fn$
      DECLARE
        month_offset integer;
        month_start timestamptz;
        month_end timestamptz;
        partition_name text;
        partition_table regclass;
        existing_partition regclass;
        parent_table regclass := to_regclass('public.rbac_decision_logs');
        default_table regclass := to_regclass('public.rbac_decision_logs_default');
        default_rows bigint;
      BEGIN
        IF parent_table IS NULL THEN
          RETURN;
        END IF;
        IF months_ahead < 0 OR months_ahead > 24 THEN
          RAISE EXCEPTION 'months_ahead must be between 0 and 24';
        END IF;

        PERFORM pg_advisory_xact_lock(hashtext('ensure_rbac_decision_log_partitions'));
        PERFORM public.harden_rbac_decision_log_partition(parent_table);

        -- Harden every partition already attached, including historical months
        -- outside the rolling creation window and the default partition.
        FOR existing_partition IN
          SELECT inheritance.inhrelid::regclass
          FROM pg_inherits inheritance
          WHERE inheritance.inhparent = parent_table
        LOOP
          PERFORM public.harden_rbac_decision_log_partition(existing_partition);
        END LOOP;

        FOR month_offset IN -1..months_ahead LOOP
          month_start := date_trunc('month', reference_date::timestamptz)
            + make_interval(months => month_offset);
          month_end := month_start + interval '1 month';
          partition_name := 'rbac_decision_logs_' || to_char(month_start, 'YYYY_MM');
          partition_table := to_regclass(format('public.%I', partition_name));

          IF partition_table IS NULL THEN
            default_rows := 0;
            IF default_table IS NOT NULL THEN
              EXECUTE format(
                'SELECT count(*) FROM %s WHERE created_at >= $1 AND created_at < $2',
                default_table
              ) INTO default_rows USING month_start, month_end;
            END IF;
            IF default_rows > 0 THEN
              RAISE EXCEPTION
                'cannot create partition %: % matching rows already exist in the default partition',
                partition_name,
                default_rows;
            END IF;

            EXECUTE format(
              'CREATE TABLE public.%I PARTITION OF public.rbac_decision_logs
                 FOR VALUES FROM (%L) TO (%L)',
              partition_name,
              month_start,
              month_end
            );
            partition_table := to_regclass(format('public.%I', partition_name));
          END IF;

          PERFORM public.harden_rbac_decision_log_partition(partition_table);
        END LOOP;
      END;
      $fn$
    `);

    await queryRunner.query(`
      REVOKE ALL ON FUNCTION public.harden_rbac_decision_log_partition(regclass)
        FROM PUBLIC;
      REVOKE ALL ON FUNCTION public.ensure_rbac_decision_log_partitions(date, integer)
        FROM PUBLIC;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_migrator') THEN
          GRANT EXECUTE
            ON FUNCTION public.harden_rbac_decision_log_partition(regclass)
            TO musicos_migrator;
          GRANT EXECUTE
            ON FUNCTION public.ensure_rbac_decision_log_partitions(date, integer)
            TO musicos_migrator;
        END IF;
      END $$
    `);

    await queryRunner.query(`
      SELECT public.ensure_rbac_decision_log_partitions(current_date, 2)
    `);
  }

  /** Security hardening is intentionally irreversible. */
  async down(_queryRunner: QueryRunner): Promise<void> {}
}
