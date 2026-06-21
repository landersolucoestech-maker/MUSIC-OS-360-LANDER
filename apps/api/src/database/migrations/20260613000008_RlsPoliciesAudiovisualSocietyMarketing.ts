import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 3D — Lote 3C-A: habilita RLS e cria a policy padrão portável nas 19
 * tabelas aprovadas pela auditoria 3C (tenantizadas, tenant_id NOT NULL uuid,
 * indexado, grant ao app role, sem RLS e sem policy).
 *
 *   Audiovisual (9): audiovisual_projects, _briefings, _shots, _production_days,
 *                    _team_members, _deliverables, _approvals, _tasks, _assets
 *   Society (8):     rights_holders, external_identifiers, society_accounts,
 *                    society_submissions, society_submission_events,
 *                    society_payload_snapshots, society_validation_errors,
 *                    society_sync_jobs
 *   Outros (2):      marketing_content_posts, artist_platform_profiles
 *
 * Aplica APENAS:  ENABLE ROW LEVEL SECURITY  +  policy padrão
 *   USING      (tenant_id = private_get_tenant_id())
 *   WITH CHECK (tenant_id = private_get_tenant_id())
 *
 * NÃO ativa FORCE RLS (estado esperado: RLS=ON, FORCE=OFF). Idempotente:
 * ENABLE RLS é no-op se já ativo; a policy só é criada se ainda não existir.
 * Não remove nem altera policies existentes. Mesmo padrão das migrations
 * 20260613000006 e 20260613000007.
 */
export class RlsPoliciesAudiovisualSocietyMarketing20260613000008 implements MigrationInterface {
  name = 'RlsPoliciesAudiovisualSocietyMarketing20260613000008';

  private static readonly TABLES = [
    'audiovisual_projects', 'audiovisual_briefings', 'audiovisual_shots',
    'audiovisual_production_days', 'audiovisual_team_members', 'audiovisual_deliverables',
    'audiovisual_approvals', 'audiovisual_tasks', 'audiovisual_assets',
    'rights_holders', 'external_identifiers', 'society_accounts', 'society_submissions',
    'society_submission_events', 'society_payload_snapshots', 'society_validation_errors',
    'society_sync_jobs',
    'marketing_content_posts', 'artist_platform_profiles',
  ] as const;
  private static readonly POLICY = 'tenant_isolation';

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of RlsPoliciesAudiovisualSocietyMarketing20260613000008.TABLES) {
      await queryRunner.query(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`);
      await queryRunner.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_policy
            WHERE polname = '${RlsPoliciesAudiovisualSocietyMarketing20260613000008.POLICY}'
              AND polrelid = 'public.${table}'::regclass
          ) THEN
            CREATE POLICY "${RlsPoliciesAudiovisualSocietyMarketing20260613000008.POLICY}"
              ON "${table}"
              USING (tenant_id = private_get_tenant_id())
              WITH CHECK (tenant_id = private_get_tenant_id());
          END IF;
        END $$;
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Reverte policy + desabilita RLS (estado original: sem RLS, sem policy).
    for (const table of RlsPoliciesAudiovisualSocietyMarketing20260613000008.TABLES) {
      await queryRunner.query(
        `DROP POLICY IF EXISTS "${RlsPoliciesAudiovisualSocietyMarketing20260613000008.POLICY}" ON "${table}"`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" DISABLE ROW LEVEL SECURITY`);
    }
  }
}
