import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Correção de produto sobre a migration anterior (RemoveLegacySocietyCodeColumns
 * 20260718000016): a determinação real é mais restrita do que a Rodada 8 havia
 * mandatado —
 *
 *   - `cod_ecad` CONTINUA existindo como coluna própria (ECAD é uma entidade
 *     central e obrigatória, não uma entre várias sociedades alternativas —
 *     não deveria ter sido removida).
 *   - `cod_abramus` estava genuinamente errado, mas não porque devesse virar
 *     uma lista genérica (`external_identifiers`) — o campo continua sendo
 *     UMA coluna simples, só que com o nome errado: o valor pode ser um
 *     código na ABRAMUS, na UBC, na SOCINPRO, entre outras entidades de
 *     gestão coletiva, então o nome canônico correto é `cod_entidade`.
 *
 * Como `cod_ecad`/`cod_abramus` já foram fisicamente removidas por
 * 20260718000016 (migration já aplicada e registrada — não reescrita para
 * preservar histórico fiel do que foi executado), esta migration é a
 * correção seguinte: recria `cod_ecad` e cria `cod_entidade` (substituta de
 * `cod_abramus`), restaurando os dados a partir de `external_identifiers`
 * (que já tinha sido populada por BackfillLegacySocietyCodesToExternalIdentifiers
 * 20260718000015 antes da remoção) sempre que existir exatamente um registro
 * correspondente por entidade.
 */
export class RestoreEcadAddEntityCodeColumn20260718000017 implements MigrationInterface {
  name = 'RestoreEcadAddEntityCodeColumn20260718000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE works
        ADD COLUMN IF NOT EXISTS cod_ecad VARCHAR(100),
        ADD COLUMN IF NOT EXISTS cod_entidade VARCHAR(100)
    `);
    await queryRunner.query(`
      ALTER TABLE phonograms
        ADD COLUMN IF NOT EXISTS cod_ecad VARCHAR(100),
        ADD COLUMN IF NOT EXISTS cod_entidade VARCHAR(100)
    `);

    // Restaura valores a partir de external_identifiers, só quando há
    // EXATAMENTE UM identificador daquele tipo por entidade (sem escolher
    // arbitrariamente entre múltiplos).
    const restore = async (
      table: 'works' | 'phonograms',
      entityType: 'WORK' | 'RECORDING',
      column: 'cod_ecad' | 'cod_entidade',
      identifierType: 'ECAD_WORK_CODE' | 'ABRAMUS_PROTOCOL',
    ) => {
      await queryRunner.query(`
        UPDATE ${table} t
        SET ${column} = single.identifier_value
        FROM (
          SELECT entity_id, tenant_id, MIN(identifier_value) AS identifier_value
          FROM external_identifiers
          WHERE entity_type = '${entityType}' AND identifier_type = '${identifierType}'
          GROUP BY entity_id, tenant_id
          HAVING COUNT(*) = 1
        ) single
        WHERE t.id = single.entity_id AND t.tenant_id = single.tenant_id
      `);
    };
    await restore('works', 'WORK', 'cod_ecad', 'ECAD_WORK_CODE');
    await restore('works', 'WORK', 'cod_entidade', 'ABRAMUS_PROTOCOL');
    await restore('phonograms', 'RECORDING', 'cod_ecad', 'ECAD_WORK_CODE');
    await restore('phonograms', 'RECORDING', 'cod_entidade', 'ABRAMUS_PROTOCOL');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE works
        DROP COLUMN IF EXISTS cod_ecad,
        DROP COLUMN IF EXISTS cod_entidade
    `);
    await queryRunner.query(`
      ALTER TABLE phonograms
        DROP COLUMN IF EXISTS cod_ecad,
        DROP COLUMN IF EXISTS cod_entidade
    `);
  }
}
