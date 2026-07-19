import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reconstrução física de `employees` — auditoria 2026-07-19.
 *
 * Formulário real: `FuncionarioFormModal.tsx` (abas "Dados Pessoais" e
 * "Profissional"). `CreateEmployeeDto` documenta explicitamente o par
 * nome/nome_completo como aliases mirrorados ("O formulário envia
 * nome_completo; nome é o alias legado. O service exige um dos dois.") —
 * `HrService.createEmployee()` sempre grava os dois. Nenhuma coluna é órfã
 * (zero leitor + zero escritor): `departamento`, `salario`, `data_demissao`
 * e `documentos` não têm campo visual no form atual, mas são aceitas pelo
 * DTO e gravadas por `HrService` sempre que o chamador as envia — mantidas
 * como zona legada, apenas reposicionadas.
 *
 * Ordem original tinha o bloco "campos do formulário" (2ª era, comentário
 * "1 coluna por campo") inteiro após o bloco de auditoria. Reconstrução pura
 * de ordem (zero remoção): funcionais em ordem visual → legado adjacente ao
 * campo real correspondente → `documentos` (jsonb sem campo visual) →
 * `metadata` → auditoria (`created_at, updated_at, created_by, deleted_at`
 * — não existe `updated_by` nesta tabela, lacuna preexistente não inventada).
 */
export class RebuildEmployeesInCanonicalFormOrder20260719000018 implements MigrationInterface {
  name = 'RebuildEmployeesInCanonicalFormOrder20260719000018';

  private readonly newColumns = `
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL,
    nome_completo       varchar(150),
    nome                varchar(255) NOT NULL,
    cpf_encrypted       text,
    rg                  varchar(30),
    data_nascimento     date,
    email_encrypted     text,
    telefone_encrypted  text,
    endereco            varchar(300),
    cargo               varchar(255),
    setor               varchar(100),
    departamento        varchar(100),
    tipo_contrato       varchar(100) NOT NULL DEFAULT 'clt',
    data_admissao       timestamp,
    data_demissao       timestamp,
    salario_base        numeric(15,2),
    salario             numeric(15,2),
    status              varchar(50) NOT NULL DEFAULT 'ativo',
    observacoes         text,
    vinculo_usuario_id  varchar(64),
    documentos          jsonb NOT NULL DEFAULT '[]'::jsonb,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamp NOT NULL DEFAULT now(),
    updated_at          timestamp NOT NULL DEFAULT now(),
    created_by          varchar(255),
    deleted_at          timestamp
  `;

  private readonly copyColumns = [
    'id', 'tenant_id', 'nome_completo', 'nome', 'cpf_encrypted', 'rg', 'data_nascimento',
    'email_encrypted', 'telefone_encrypted', 'endereco', 'cargo', 'setor', 'departamento',
    'tipo_contrato', 'data_admissao', 'data_demissao', 'salario_base', 'salario', 'status',
    'observacoes', 'vinculo_usuario_id', 'documentos', 'metadata',
    'created_at', 'updated_at', 'created_by', 'deleted_at',
  ].join(', ');

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = await queryRunner.query(`SELECT count(*)::int AS total FROM employees`);

    await queryRunner.query(`CREATE TABLE employees_new (${this.newColumns})`);
    await queryRunner.query(`INSERT INTO employees_new (${this.copyColumns}) SELECT ${this.copyColumns} FROM employees`);

    const [{ c: newCount }] = await queryRunner.query(`SELECT count(*)::int AS c FROM employees_new`);
    if (Number(newCount) !== Number(total)) {
      throw new Error(`RebuildEmployeesInCanonicalFormOrder: contagem divergente (original=${total}, nova=${newCount}) — abortada.`);
    }

    await queryRunner.query(`ALTER TABLE employees_new ADD CONSTRAINT employees_new_pkey PRIMARY KEY (id)`);
    await queryRunner.query(`CREATE INDEX idx_employees_tenant_id_new ON employees_new (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_employees_status_new ON employees_new (status)`);

    // FKs de tabelas dependentes precisam ser derrubadas antes do rename dance.
    await queryRunner.query(`ALTER TABLE payroll_entries DROP CONSTRAINT fk_payroll_entries_employee_id`);
    await queryRunner.query(`ALTER TABLE leave_requests DROP CONSTRAINT fk_leave_requests_employee_id`);

    await queryRunner.query(`ALTER TABLE employees RENAME TO employees_old`);
    await queryRunner.query(`ALTER TABLE employees_old RENAME CONSTRAINT employees_pkey TO employees_old_pkey`);
    await queryRunner.query(`ALTER INDEX idx_employees_tenant_id RENAME TO idx_employees_tenant_id_old`);
    await queryRunner.query(`ALTER INDEX idx_employees_status RENAME TO idx_employees_status_old`);

    await queryRunner.query(`ALTER TABLE employees_new RENAME TO employees`);
    await queryRunner.query(`ALTER INDEX employees_new_pkey RENAME TO employees_pkey`);
    await queryRunner.query(`ALTER INDEX idx_employees_tenant_id_new RENAME TO idx_employees_tenant_id`);
    await queryRunner.query(`ALTER INDEX idx_employees_status_new RENAME TO idx_employees_status`);

    await queryRunner.query(`ALTER TABLE payroll_entries ADD CONSTRAINT fk_payroll_entries_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT`);

    await queryRunner.query(`ALTER TABLE employees ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE employees FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON employees
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON employees
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);

    await queryRunner.query(`ALTER TABLE employees OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON employees TO musicos_migrator`);

    await queryRunner.query(`DROP TABLE employees_old`);
    await queryRunner.query(`ANALYZE employees`);
  }

  private readonly originalColumns = `
    id                  uuid NOT NULL DEFAULT gen_random_uuid(),
    tenant_id           uuid NOT NULL,
    nome                varchar(255) NOT NULL,
    cargo               varchar(255),
    departamento        varchar(100),
    tipo_contrato       varchar(100) NOT NULL DEFAULT 'clt',
    status              varchar(50) NOT NULL DEFAULT 'ativo',
    email_encrypted     text,
    telefone_encrypted  text,
    cpf_encrypted       text,
    salario             numeric(15,2),
    data_admissao       timestamp,
    data_demissao       timestamp,
    documentos          jsonb NOT NULL DEFAULT '[]'::jsonb,
    metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamp NOT NULL DEFAULT now(),
    updated_at          timestamp NOT NULL DEFAULT now(),
    deleted_at          timestamp,
    created_by          varchar(255),
    nome_completo       varchar(150),
    rg                  varchar(30),
    data_nascimento     date,
    endereco            varchar(300),
    setor               varchar(100),
    salario_base        numeric(15,2),
    observacoes         text,
    vinculo_usuario_id  varchar(64)
  `;

  private readonly restoreCopyColumns = [
    'id', 'tenant_id', 'nome', 'cargo', 'departamento', 'tipo_contrato', 'status',
    'email_encrypted', 'telefone_encrypted', 'cpf_encrypted', 'salario', 'data_admissao',
    'data_demissao', 'documentos', 'metadata', 'created_at', 'updated_at', 'deleted_at',
    'created_by', 'nome_completo', 'rg', 'data_nascimento', 'endereco', 'setor',
    'salario_base', 'observacoes', 'vinculo_usuario_id',
  ].join(', ');

  public async down(queryRunner: QueryRunner): Promise<void> {
    const [{ total }] = await queryRunner.query(`SELECT count(*)::int AS total FROM employees`);

    await queryRunner.query(`CREATE TABLE employees_restore (${this.originalColumns})`);
    await queryRunner.query(`INSERT INTO employees_restore (${this.restoreCopyColumns}) SELECT ${this.restoreCopyColumns} FROM employees`);

    const [{ c: restoredCount }] = await queryRunner.query(`SELECT count(*)::int AS c FROM employees_restore`);
    if (Number(restoredCount) !== Number(total)) {
      throw new Error(`RebuildEmployeesInCanonicalFormOrder.down: contagem divergente (original=${total}, restaurada=${restoredCount}) — abortado.`);
    }

    await queryRunner.query(`ALTER TABLE employees_restore ADD CONSTRAINT employees_restore_pkey PRIMARY KEY (id)`);
    await queryRunner.query(`CREATE INDEX idx_employees_tenant_id_restore ON employees_restore (tenant_id)`);
    await queryRunner.query(`CREATE INDEX idx_employees_status_restore ON employees_restore (status)`);

    await queryRunner.query(`ALTER TABLE payroll_entries DROP CONSTRAINT fk_payroll_entries_employee_id`);
    await queryRunner.query(`ALTER TABLE leave_requests DROP CONSTRAINT fk_leave_requests_employee_id`);

    await queryRunner.query(`ALTER TABLE employees RENAME TO employees_canonical`);
    await queryRunner.query(`ALTER TABLE employees_canonical RENAME CONSTRAINT employees_pkey TO employees_canonical_pkey`);
    await queryRunner.query(`ALTER INDEX idx_employees_tenant_id RENAME TO idx_employees_tenant_id_canonical`);
    await queryRunner.query(`ALTER INDEX idx_employees_status RENAME TO idx_employees_status_canonical`);

    await queryRunner.query(`ALTER TABLE employees_restore RENAME TO employees`);
    await queryRunner.query(`ALTER INDEX employees_restore_pkey RENAME TO employees_pkey`);
    await queryRunner.query(`ALTER INDEX idx_employees_tenant_id_restore RENAME TO idx_employees_tenant_id`);
    await queryRunner.query(`ALTER INDEX idx_employees_status_restore RENAME TO idx_employees_status`);

    await queryRunner.query(`ALTER TABLE payroll_entries ADD CONSTRAINT fk_payroll_entries_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT`);
    await queryRunner.query(`ALTER TABLE leave_requests ADD CONSTRAINT fk_leave_requests_employee_id FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT`);

    await queryRunner.query(`ALTER TABLE employees ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`ALTER TABLE employees FORCE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      CREATE POLICY tenant_isolation ON employees
        AS PERMISSIVE FOR ALL TO authenticated
        USING (tenant_id = private_get_tenant_id()) WITH CHECK (tenant_id = private_get_tenant_id())
    `);
    await queryRunner.query(`
      CREATE POLICY super_admin_full_access ON employees
        AS PERMISSIVE FOR ALL TO authenticated
        USING (app_is_super_admin()) WITH CHECK (app_is_super_admin())
    `);

    await queryRunner.query(`ALTER TABLE employees OWNER TO musicos_migrator`);
    await queryRunner.query(`GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON employees TO musicos_migrator`);

    await queryRunner.query(`DROP TABLE employees_canonical`);
    await queryRunner.query(`ANALYZE employees`);
  }
}
