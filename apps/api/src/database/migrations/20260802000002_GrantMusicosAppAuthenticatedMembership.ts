import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260802000002_GrantMusicosAppAuthenticatedMembership
 *
 * Parte 78 — causa raiz sistêmica descoberta ao reproduzir "criar cliente"
 * via API real (não apenas o export reportado): toda tabela reconstruída
 * pelas migrations "RebuildXInCanonicalFormOrder" (2026-07-19) tem
 * `FORCE ROW LEVEL SECURITY` com policies `tenant_isolation`/
 * `super_admin_full_access` escopadas `TO authenticated` (convenção
 * Supabase). `musicos_app` — o role usado por TODO o tráfego normal da API
 * via APP_DATABASE_URL — nunca foi adicionado como MEMBRO do role
 * `authenticated` neste projeto Supabase (confirmado via
 * pg_auth_members: apenas postgres/authenticator/musicos_migrator são
 * membros).
 *
 * Efeito prático, silencioso, anterior a esta migration: com FORCE RLS e
 * nenhuma policy aplicável ao role conectado, Postgres nega por padrão —
 * SELECT devolve 0 linhas SEM ERRO (parecia "tabela vazia") e INSERT/UPDATE/
 * DELETE falham com "new row violates row-level security policy". Isso
 * afeta TODAS as ~40+ tabelas reconstruídas com este padrão (artists,
 * clients, works, contracts, leads, releases, events, projects, etc.), não
 * apenas `clients` — a exportação de clientes só expôs o sintoma porque foi
 * o primeiro fluxo de escrita/leitura de negócio testado via API real nesta
 * sessão (sessões anteriores validaram login/auth/context, que não passam
 * por estas tabelas).
 *
 * A própria provisão documentada do role (scripts/create-app-db-user.sql,
 * passo 3b) já previa exatamente este GRANT — só não foi aplicado (ou foi
 * perdido) neste projeto Supabase DEV. Esta migration apenas completa essa
 * provisão de forma idempotente e versionada.
 */
export class GrantMusicosAppAuthenticatedMembership20260802000002 implements MigrationInterface {
  name = 'GrantMusicosAppAuthenticatedMembership20260802000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ exists: authenticatedExists }] = await queryRunner.query(`
      SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AS exists
    `);
    if (!authenticatedExists) return; // Postgres vanilla (sem convenção Supabase) — nada a fazer.

    const [{ exists: appRoleExists }] = await queryRunner.query(`
      SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') AS exists
    `);
    if (!appRoleExists) return; // ambiente sem o role app dedicado (ex.: alguns specs) — nada a fazer.

    const [{ is_member: alreadyMember }] = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_auth_members m
        JOIN pg_roles r ON r.oid = m.member
        JOIN pg_roles g ON g.oid = m.roleid
        WHERE r.rolname = 'musicos_app' AND g.rolname = 'authenticated'
      ) AS is_member
    `);
    if (!alreadyMember) {
      await queryRunner.query(`GRANT authenticated TO musicos_app`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ exists: authenticatedExists }] = await queryRunner.query(`
      SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AS exists
    `);
    if (!authenticatedExists) return;
    const [{ exists: appRoleExists }] = await queryRunner.query(`
      SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'musicos_app') AS exists
    `);
    if (!appRoleExists) return;

    await queryRunner.query(`REVOKE authenticated FROM musicos_app`);
  }
}
