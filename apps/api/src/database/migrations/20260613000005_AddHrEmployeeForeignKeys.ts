import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 2C.1 — Materializa as FKs de RH que ficaram pendentes na 2C por exigirem
 * decisão de negócio. Decisão: ON DELETE RESTRICT (preserva histórico).
 *
 *   payroll_entries.employee_id → employees.id  (histórico FINANCEIRO/RH)
 *   leave_requests.employee_id  → employees.id  (histórico OPERACIONAL/RH)
 *
 * Excluir um funcionário NÃO deve apagar folha de pagamento, férias ou
 * afastamentos. Como `employees` usa soft delete (deleted_at), a exclusão física
 * deve ser BLOQUEADA enquanto houver histórico dependente — exatamente o que
 * RESTRICT garante. CASCADE é proibido neste domínio.
 *
 * Pré-check READ-ONLY confirmou: tipos uuid↔uuid compatíveis, colunas NOT NULL,
 * índices já existentes (idx_payroll_employee_id / idx_leave_employee_id),
 * nenhuma FK pré-existente e ZERO órfãos. Nenhum dado é alterado; constraints
 * têm nomes explícitos e são reversíveis. Nenhum índice criado (já existem).
 */
export class AddHrEmployeeForeignKeys20260613000005 implements MigrationInterface {
  name = 'AddHrEmployeeForeignKeys20260613000005';

  // [tabela, coluna, nome_constraint]
  private static readonly FKS: ReadonlyArray<[string, string, string]> = [
    ['payroll_entries', 'employee_id', 'fk_payroll_entries_employee_id'],
    ['leave_requests',  'employee_id', 'fk_leave_requests_employee_id'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const [table, col, name] of AddHrEmployeeForeignKeys20260613000005.FKS) {
      // NOT VALID evita lock prolongado de validação; VALIDATE confirma integridade
      // (pré-check garante zero órfãos → sempre passa). Sem CASCADE: RESTRICT.
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ` +
        `FOREIGN KEY ("${col}") REFERENCES "employees" ("id") ON DELETE RESTRICT NOT VALID`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${name}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, , name] of AddHrEmployeeForeignKeys20260613000005.FKS) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}"`);
    }
  }
}
