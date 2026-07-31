import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sincronização formulário ↔ banco (RH: Funcionários, Folha, Férias/Ausências).
 *
 * REGRA DE PRODUTO (2026-07-12): cada campo do formulário tem a SUA coluna
 * física com o nome EXATO da chave enviada pelo form (FuncionarioFormModal,
 * FolhaPagamentoFormModal, FeriasAusenciasFormModal).
 *
 * Colunas legadas NOT NULL (employees.nome, payroll.employee_id/competencia,
 * leave_requests.employee_id) são espelhadas pelo service a partir dos campos
 * do formulário — nunca o contrário.
 */
export class HrFormFieldColumns20260712000003 implements MigrationInterface {
  name = 'HrFormFieldColumns20260712000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "employees"
        ADD COLUMN IF NOT EXISTS "nome_completo" varchar(150),
        ADD COLUMN IF NOT EXISTS "rg" varchar(30),
        ADD COLUMN IF NOT EXISTS "data_nascimento" date,
        ADD COLUMN IF NOT EXISTS "endereco" varchar(300),
        ADD COLUMN IF NOT EXISTS "setor" varchar(100),
        ADD COLUMN IF NOT EXISTS "salario_base" numeric(15,2),
        ADD COLUMN IF NOT EXISTS "observacoes" text,
        ADD COLUMN IF NOT EXISTS "vinculo_usuario_id" varchar(64)
    `);
    await queryRunner.query(`
      ALTER TABLE "payroll_entries"
        ADD COLUMN IF NOT EXISTS "funcionario_id" uuid,
        ADD COLUMN IF NOT EXISTS "mes_referencia" varchar(20),
        ADD COLUMN IF NOT EXISTS "bonus" numeric(15,2),
        ADD COLUMN IF NOT EXISTS "data_pagamento" date,
        ADD COLUMN IF NOT EXISTS "observacoes" text
    `);
    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        ADD COLUMN IF NOT EXISTS "funcionario_id" uuid,
        ADD COLUMN IF NOT EXISTS "dias_totais" integer,
        ADD COLUMN IF NOT EXISTS "observacoes" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "leave_requests"
        DROP COLUMN IF EXISTS "funcionario_id",
        DROP COLUMN IF EXISTS "dias_totais",
        DROP COLUMN IF EXISTS "observacoes"
    `);
    await queryRunner.query(`
      ALTER TABLE "payroll_entries"
        DROP COLUMN IF EXISTS "funcionario_id",
        DROP COLUMN IF EXISTS "mes_referencia",
        DROP COLUMN IF EXISTS "bonus",
        DROP COLUMN IF EXISTS "data_pagamento",
        DROP COLUMN IF EXISTS "observacoes"
    `);
    await queryRunner.query(`
      ALTER TABLE "employees"
        DROP COLUMN IF EXISTS "nome_completo",
        DROP COLUMN IF EXISTS "rg",
        DROP COLUMN IF EXISTS "data_nascimento",
        DROP COLUMN IF EXISTS "endereco",
        DROP COLUMN IF EXISTS "setor",
        DROP COLUMN IF EXISTS "salario_base",
        DROP COLUMN IF EXISTS "observacoes",
        DROP COLUMN IF EXISTS "vinculo_usuario_id"
    `);
  }
}
