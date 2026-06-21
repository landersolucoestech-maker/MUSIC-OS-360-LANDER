import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Forces RLS on tenant/org tables so table owners cannot read tenant-scoped data
 * without a resolved tenant context. Superusers still bypass RLS by PostgreSQL
 * design, but normal application/database-owner roles become fail-closed.
 */
export class ForceRLSFailClosed20260522000002 implements MigrationInterface {
  name = 'ForceRLSFailClosed20260522000002';

  private readonly TABLES = [
    'organizations',
    'tenants',
    'billing_subscriptions',
    'org_members',
    'artists',
    'works',
    'phonograms',
    'contracts',
    'contract_templates',
    'transactions',
    'invoices',
    'clients',
    'leads',
    'lead_interactions',
    'campaigns',
    'briefings',
    'events',
    'projects',
    'releases',
    'shares',
    'takedowns',
    'support_tickets',
    'notifications',
    'uploads',
    'integrations',
    'oauth_connections',
    'webhook_events',
    'audit_logs',
    'ai_jobs',
    'artist_goals',
    'content_detections',
    'ecad_reports',
    'employees',
    'payroll_entries',
    'leave_requests',
    'workflow_transitions',
    'domain_event_log',
    'activity_logs',
    'conversations',
    'conversation_messages',
    'conversation_notes',
    'forms',
    'form_submissions',
    'crm_companies',
    'crm_contacts',
    'crm_tags',
    'crm_contact_tags',
    'crm_tasks',
    'crm_timeline_events',
    'campaign_tasks',
    'campaign_assets',
    'ai_usage_logs',
    'inventory_items',
    'licenses',
    'financial_rules',
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
