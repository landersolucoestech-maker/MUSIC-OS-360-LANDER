import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * FASE 2C — Materializa a integridade referencial das relações JÁ declaradas
 * pela ORM (@ManyToOne/@JoinColumn) que não tinham FK física no banco.
 *
 * Pré-check READ-ONLY executado antes desta migration confirmou, para cada FK:
 * tabela referenciada existente, tipos uuid↔uuid compatíveis, nenhuma FK pré-
 * existente e ZERO órfãos. Apenas FKs SEGURAS entram aqui.
 *
 * ON DELETE alinhado ao contrato da ORM e às regras da fase:
 *   - colunas NULLABLE → ON DELETE SET NULL (a relação é opcional);
 *   - lead_interactions.lead_id (NOT NULL) → ON DELETE CASCADE — composição pura:
 *     o log de interações pertence ao lead e não tem valor independente.
 *
 * FORA desta migration (REQUER DECISÃO DE NEGÓCIO, não materializadas):
 *   - payroll_entries.employee_id e leave_requests.employee_id: a ORM declara
 *     CASCADE, mas cascatear exclusão de folha/férias ao remover um funcionário
 *     destrói histórico financeiro/RH. RESTRICT vs CASCADE depende de regra de
 *     negócio — deixadas para decisão explícita.
 *
 * Nenhum dado é alterado. Constraints têm nomes explícitos e são reversíveis.
 * Índice criado apenas onde faltava (briefings.campanha_id) — os demais já têm.
 */
export class AddDomainForeignKeys20260613000004 implements MigrationInterface {
  name = 'AddDomainForeignKeys20260613000004';

  // [tabela, coluna, tabela_ref, coluna_ref, onDelete, nome_constraint]
  private static readonly FKS: ReadonlyArray<[string, string, string, string, 'SET NULL' | 'CASCADE', string]> = [
    ['works',             'artista_id',  'artists',   'id', 'SET NULL', 'fk_works_artista_id'],
    ['phonograms',        'artista_id',  'artists',   'id', 'SET NULL', 'fk_phonograms_artista_id'],
    ['phonograms',        'obra_id',     'works',     'id', 'SET NULL', 'fk_phonograms_obra_id'],
    ['contracts',         'artista_id',  'artists',   'id', 'SET NULL', 'fk_contracts_artista_id'],
    ['briefings',         'campanha_id', 'campaigns', 'id', 'SET NULL', 'fk_briefings_campanha_id'],
    ['releases',          'artista_id',  'artists',   'id', 'SET NULL', 'fk_releases_artista_id'],
    ['shares',            'obra_id',     'works',     'id', 'SET NULL', 'fk_shares_obra_id'],
    ['lead_interactions', 'lead_id',     'leads',     'id', 'CASCADE',  'fk_lead_interactions_lead_id'],
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Índice ausente na única coluna FK sem índice (acelera SET NULL/lookups).
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_briefings_campanha_id" ON "briefings" ("campanha_id")`,
    );

    for (const [table, col, refTable, refCol, onDelete, name] of AddDomainForeignKeys20260613000004.FKS) {
      // NOT VALID evita lock prolongado de validação; VALIDATE em seguida confirma
      // a integridade (pré-check garante zero órfãos → sempre passa).
      await queryRunner.query(
        `ALTER TABLE "${table}" ADD CONSTRAINT "${name}" ` +
        `FOREIGN KEY ("${col}") REFERENCES "${refTable}" ("${refCol}") ON DELETE ${onDelete} NOT VALID`,
      );
      await queryRunner.query(`ALTER TABLE "${table}" VALIDATE CONSTRAINT "${name}"`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const [table, , , , , name] of AddDomainForeignKeys20260613000004.FKS) {
      await queryRunner.query(`ALTER TABLE "${table}" DROP CONSTRAINT IF EXISTS "${name}"`);
    }
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_briefings_campanha_id"`);
  }
}
