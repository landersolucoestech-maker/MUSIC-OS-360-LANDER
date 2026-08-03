import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * 20260803000001_CreateClientAttachments
 *
 * Parte 80 — metadata real de anexos para `clients` (a mesma entidade física
 * usada como "Contato" no CRM). Nunca guarda o binário no banco: apenas a
 * chave do objeto no Cloudflare R2 (StorageService já existente e real,
 * apps/api/src/storage/storage.service.ts), permitindo listar/baixar/excluir
 * anexos mesmo quando R2 não está configurado no ambiente (nesse caso o
 * upload real fica bloqueado — BLOCKED_EXTERNAL — sem fabricar sucesso).
 *
 * Segue o mesmo padrão de RLS/grants das migrations RebuildXInCanonicalFormOrder
 * (Parte 78/79): FORCE RLS, tenant_isolation + super_admin_full_access,
 * OWNER musicos_migrator. Os grants para musicos_app vêm automaticamente do
 * ALTER DEFAULT PRIVILEGES já configurado em
 * 20260802000001_GrantMusicosAppOnAllTables (musicos_migrator → musicos_app),
 * confirmado ao vivo nesta mesma Parte (ver relatório).
 */
export class CreateClientAttachments20260803000001 implements MigrationInterface {
  name = 'CreateClientAttachments20260803000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE client_attachments (
        id           uuid NOT NULL DEFAULT gen_random_uuid(),
        tenant_id    uuid NOT NULL,
        client_id    uuid NOT NULL,
        storage_key  varchar(500) NOT NULL,
        filename     varchar(255) NOT NULL,
        mime_type    varchar(150) NOT NULL,
        size_bytes   bigint NOT NULL,
        checksum     varchar(128),
        uploaded_by  varchar(255),
        created_at   timestamp NOT NULL DEFAULT now(),
        deleted_at   timestamp,
        CONSTRAINT client_attachments_pkey PRIMARY KEY (id),
        CONSTRAINT fk_client_attachments_client
          FOREIGN KEY (tenant_id, client_id) REFERENCES clients (tenant_id, id)
      )
    `);

    await queryRunner.query(`CREATE INDEX idx_client_attachments_tenant_id ON client_attachments (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_client_attachments_client_id ON client_attachments (tenant_id, client_id) WHERE (deleted_at IS NULL)`);

    await queryRunner.query(`ALTER TABLE client_attachments ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE client_attachments FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON client_attachments
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON client_attachments
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);

    await queryRunner.query(`ALTER TABLE client_attachments OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON client_attachments TO musicos_migrator`);
    // Explícito por tabela (defesa em profundidade) — ver
    // 20260803000002_FixDefaultPrivilegesCreatorRole para a correção da
    // fonte da verdade (default privileges não protegiam tabelas novas).
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE ON client_attachments TO musicos_app`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS client_attachments`);
  }
}
