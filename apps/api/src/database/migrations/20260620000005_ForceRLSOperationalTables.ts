import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extends the fail-closed RLS posture of ForceRLSFailClosed20260522000002 to the
 * newer tenant-scoped operational tables (audiovisual, marketing, conversation
 * sub-tables, society/rights, musicchat automation, assets, workflow executions).
 *
 * These tables already have RLS ENABLED with tenant policies, but were missing
 * FORCE ROW LEVEL SECURITY, so the table-owner/admin connection (DATABASE_URL)
 * could read/write tenant data without a resolved tenant context. Adding FORCE
 * makes the owner role fail-closed — superusers still bypass RLS by PostgreSQL
 * design, and the NOBYPASSRLS application role (APP_DATABASE_URL) is unaffected
 * because RLS already applies to it.
 *
 * Every target table was verified to have >=1 RLS policy, so FORCE cannot cause a
 * deny-all lockout. `rbac_decision_logs` is intentionally excluded: it is an
 * owner-written append-only shadow log, not user-facing tenant data.
 *
 * Idempotent: guarded by to_regclass; FORCE is a no-op if already set.
 */
export class ForceRLSOperationalTables20260620000005 implements MigrationInterface {
  name = 'ForceRLSOperationalTables20260620000005';

  private readonly TABLES = [
    'artist_platform_profiles',
    'asset_usage_logs',
    'asset_versions',
    'assets',
    'audiovisual_approvals',
    'audiovisual_assets',
    'audiovisual_briefings',
    'audiovisual_deliverables',
    'audiovisual_production_days',
    'audiovisual_projects',
    'audiovisual_shots',
    'audiovisual_tasks',
    'audiovisual_team_members',
    'conversation_audit_events',
    'conversation_auto_messages',
    'conversation_business_hours',
    'conversation_channel_accounts',
    'conversation_closures',
    'conversation_protocol_settings',
    'conversation_queues',
    'conversation_quick_replies',
    'conversation_sectors',
    'conversation_service_statuses',
    'conversation_sla_policies',
    'conversation_tags',
    'conversation_transfers',
    'external_identifiers',
    'marketing_asset_approvals',
    'marketing_asset_versions',
    'marketing_assets',
    'marketing_content_posts',
    'marketing_projects',
    'marketing_strategies',
    'marketing_strategy_actions',
    'marketing_strategy_initiatives',
    'marketing_strategy_objectives',
    'marketing_tasks',
    'musicchat_automation_events',
    'musicchat_automation_notifications',
    'musicchat_automation_settings',
    'notification_settings',
    'project_assets',
    'rights_holders',
    'skill_runs',
    'society_accounts',
    'society_payload_snapshots',
    'society_submission_events',
    'society_submissions',
    'society_sync_jobs',
    'society_validation_errors',
    'task_assets',
    'workflow_executions',
  ] as const;

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY';
            EXECUTE 'ALTER TABLE public.${table} FORCE ROW LEVEL SECURITY';
          END IF;
        END $$;
      `);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.TABLES) {
      await queryRunner.query(`
        DO $$
        BEGIN
          IF to_regclass('public.${table}') IS NOT NULL THEN
            EXECUTE 'ALTER TABLE public.${table} NO FORCE ROW LEVEL SECURITY';
          END IF;
        END $$;
      `);
    }
  }
}
