import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sincronização formulário ↔ banco: Usuários (Configurações).
 *
 * Achado confirmado (auditoria 2026-07-18): UsuarioFormModal.tsx envia
 * full_name/phone/cargo via useUsuarios() -> storage.update("usuarios", ...)
 * -> PATCH /users/:id -> UpdateUserDto. `phone` nunca teve coluna nem campo
 * de DTO — a atualização de telefone sempre falhava (whitelist) ou era
 * descartada. `full_name` e `cargo` foram corrigidos apenas no
 * hook/DTO (full_name -> fullName já existente; cargo -> role já existente,
 * dual-write de role_id); nenhum dos dois precisa de coluna nova.
 */
export class OrgMembersPhoneColumn20260718000014 implements MigrationInterface {
  name = 'OrgMembersPhoneColumn20260718000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "org_members"
        ADD COLUMN IF NOT EXISTS "phone" varchar(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "org_members"
        DROP COLUMN IF EXISTS "phone"
    `);
  }
}
