import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Parte 77 — a série de migrations "RebuildXInCanonicalFormOrder" (2026-07-19,
 * 25 arquivos) recriou dezenas de tabelas do zero (`DROP`/`CREATE`), sempre
 * concedendo grants a `musicos_migrator` (o role que executa migrations),
 * mas NUNCA re-concedendo nada a `musicos_app` (o role usado pelo tráfego
 * normal da aplicação, via APP_DATABASE_URL). O resultado: 114 das ~120
 * tabelas de `public` ficaram com "permission denied" para `musicos_app` —
 * não um problema de RLS (que restringe LINHAS), mas de GRANT ausente (que
 * bloqueia a tabela inteira). Isso explicava tanto o 500 em /auth/context
 * quanto qualquer página de domínio real travando após o login.
 *
 * Fix em duas partes:
 *   1) concede retroativamente o necessário em toda tabela hoje presente;
 *   2) `ALTER DEFAULT PRIVILEGES FOR ROLE musicos_migrator` garante que
 *      TABELAS FUTURAS criadas por rebuilds/migrations já nasçam com o
 *      grant certo — sem isso, a próxima "reconstrução física" repete o
 *      mesmo problema.
 *
 * Tabelas de auditoria/log (nunca editadas nem apagadas pela aplicação)
 * recebem apenas SELECT+INSERT, preservando a mesma politica já usada em
 * `rbac_error_logs` (20260621000001) — GRANT é defesa em profundidade,
 * RLS continua sendo o controle real de linha.
 */

const READ_WRITE_TABLES = [
  'activity_logs', 'ai_jobs', 'artist_goals', 'artist_platform_profiles', 'artists',
  'asset_usage_logs', 'asset_versions', 'assets', 'audiovisual_approvals',
  'audiovisual_assets', 'audiovisual_briefings', 'audiovisual_deliverables',
  'audiovisual_production_days', 'audiovisual_projects', 'audiovisual_shots',
  'audiovisual_tasks', 'audiovisual_team_members', 'billing_plans', 'billing_settings',
  'billing_subscriptions', 'briefings', 'campaign_assets', 'campaign_tasks', 'campaigns',
  'clients', 'content_detections', 'contract_templates', 'contracts',
  'conversation_messages', 'conversation_notes', 'conversations', 'departments',
  'ecad_reports', 'employees', 'events', 'external_identifiers', 'financial_rules',
  'form_submissions', 'forms', 'integrations', 'inventory_items', 'invoices',
  'job_functions', 'lead_interactions', 'leads', 'leave_requests', 'licenses',
  'marketing_asset_approvals', 'marketing_asset_versions', 'marketing_assets',
  'marketing_content_posts', 'marketing_projects', 'marketing_strategies',
  'marketing_strategy_actions', 'marketing_strategy_initiatives',
  'marketing_strategy_objectives', 'marketing_tasks', 'membership_job_functions',
  'musicchat_automation_notifications', 'musicchat_automation_settings',
  'notifications', 'oauth_connections', 'org_members', 'organizations',
  'payroll_entries', 'permission_aliases', 'permission_groups', 'phonograms',
  'pipeline_opportunities', 'pipeline_stages', 'pipelines', 'positions',
  'project_assets', 'project_track_participants', 'project_tracks', 'projects',
  'release_works', 'releases', 'rights_holders', 'shares', 'society_accounts',
  'society_payload_snapshots', 'society_submissions', 'society_sync_jobs',
  'society_validation_errors', 'support_tickets', 'takedowns', 'task_assets',
  'tenant_billing_state', 'tenants', 'transactions', 'uploads', 'users',
  'work_participants', 'workflow_executions', 'workflow_transitions', 'works',
] as const;

/** Log/auditoria — a aplicação só lê e insere, nunca edita nem apaga. */
const APPEND_ONLY_TABLES = [
  'audit_logs', 'financial_category_audit_logs', 'domain_event_log',
  'rbac_decision_logs', 'rbac_decision_logs_2026_06', 'rbac_decision_logs_2026_07',
  'rbac_decision_logs_2026_08', 'rbac_decision_logs_2026_09', 'rbac_decision_logs_default',
  'skill_run_logs', 'society_submission_events', 'musicchat_automation_events',
  'workflow_execution_logs', 'payment_events', 'webhook_events',
] as const;

export class GrantMusicosAppOnAllTables20260802000001 implements MigrationInterface {
  name = 'GrantMusicosAppOnAllTables20260802000001';

  async up(qr: QueryRunner): Promise<void> {
    for (const table of READ_WRITE_TABLES) {
      await qr.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '${table}') THEN
            EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public."${table}" TO musicos_app';
          END IF;
        END $$;
      `);
    }

    for (const table of APPEND_ONLY_TABLES) {
      await qr.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '${table}') THEN
            EXECUTE 'GRANT SELECT, INSERT ON TABLE public."${table}" TO musicos_app';
          END IF;
        END $$;
      `);
    }

    // Sequências: necessárias para colunas serial/identity (a maioria das
    // tabelas usa UUID + gen_random_uuid(), mas conceder é inofensivo onde
    // não se aplica e evita a mesma classe de bug para o que ainda usa serial).
    await qr.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO musicos_app`);

    // Prevenção: qualquer tabela futura criada por musicos_migrator (o role
    // usado por todas as migrations) já nasce com o grant certo — sem isso,
    // a próxima "reconstrução física" reintroduz exatamente este bug.
    await qr.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE musicos_migrator IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO musicos_app
    `);
    await qr.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE musicos_migrator IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO musicos_app
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE musicos_migrator IN SCHEMA public
        REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLES FROM musicos_app
    `);
    await qr.query(`
      ALTER DEFAULT PRIVILEGES FOR ROLE musicos_migrator IN SCHEMA public
        REVOKE USAGE, SELECT ON SEQUENCES FROM musicos_app
    `);

    for (const table of [...READ_WRITE_TABLES, ...APPEND_ONLY_TABLES]) {
      await qr.query(`
        DO $$
        BEGIN
          IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = '${table}') THEN
            EXECUTE 'REVOKE ALL ON TABLE public."${table}" FROM musicos_app';
          END IF;
        END $$;
      `);
    }
  }
}
