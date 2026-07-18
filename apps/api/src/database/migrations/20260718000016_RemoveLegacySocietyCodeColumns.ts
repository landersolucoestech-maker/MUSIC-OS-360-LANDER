import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Remove as colunas físicas fixas por sociedade (`cod_abramus`, `cod_ecad` em
 * `works`/`phonograms`) e a coluna órfã `abramus_protocol` (nunca escrita por
 * nenhum fluxo real — `RegistryFieldsPhase1` 20260601000001) — auditoria
 * Rodada 8, 2026-07-18: a plataforma não é exclusiva de uma entidade de
 * gestão coletiva (ABRAMUS/ECAD/UBC/SBACEM/AMAR/SICAM/SOCINPRO/ASSIM/...) e
 * não pode ter uma coluna canônica por sociedade.
 *
 * O substituto — `external_identifiers` (genérica, já existente desde
 * 20260601000002) — já foi backfilled a partir dos valores legados pela
 * migration BackfillLegacySocietyCodesToExternalIdentifiers20260718000015.
 * Esta migration valida, antes de remover qualquer coluna, que TODO valor
 * não-nulo em cod_abramus/cod_ecad tem uma linha correspondente em
 * external_identifiers (mesmo tenant_id/entity_type/entity_id/identifier_type/
 * identifier_value) — aborta com erro (fail-fast) se encontrar qualquer valor
 * órfão (não migrado), sem tentar corrigir silenciosamente.
 *
 * Não usa CASCADE. Nenhum índice/constraint/FK referencia estas colunas
 * (confirmado por busca exaustiva nas migrations existentes).
 */
export class RemoveLegacySocietyCodeColumns20260718000016 implements MigrationInterface {
  name = 'RemoveLegacySocietyCodeColumns20260718000016';

  private async assertFullyMigrated(
    queryRunner: QueryRunner,
    table: 'works' | 'phonograms',
    entityType: 'WORK' | 'RECORDING',
    column: 'cod_abramus' | 'cod_ecad',
    identifierType: 'ABRAMUS_PROTOCOL' | 'ECAD_WORK_CODE',
  ): Promise<void> {
    const orphans = await queryRunner.query(`
      SELECT t.id, t.tenant_id, t.${column} AS value
      FROM ${table} t
      WHERE t.${column} IS NOT NULL AND btrim(t.${column}) <> ''
        AND NOT EXISTS (
          SELECT 1 FROM external_identifiers ei
          WHERE ei.tenant_id = t.tenant_id
            AND ei.entity_type = '${entityType}'
            AND ei.entity_id = t.id
            AND ei.identifier_type = '${identifierType}'
            AND ei.identifier_value = t.${column}
        )
    `);
    if (orphans.length > 0) {
      throw new Error(
        `RemoveLegacySocietyCodeColumns: ${orphans.length} valor(es) de ${table}.${column} sem ` +
        `correspondência em external_identifiers (identifier_type=${identifierType}) — migration abortada. ` +
        `Exemplo: id=${orphans[0].id} tenant_id=${orphans[0].tenant_id} value=${orphans[0].value}`,
      );
    }
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1-4. Validação fail-fast: todo cod_abramus/cod_ecad não-nulo já está em external_identifiers.
    await this.assertFullyMigrated(queryRunner, 'works', 'WORK', 'cod_abramus', 'ABRAMUS_PROTOCOL');
    await this.assertFullyMigrated(queryRunner, 'works', 'WORK', 'cod_ecad', 'ECAD_WORK_CODE');
    await this.assertFullyMigrated(queryRunner, 'phonograms', 'RECORDING', 'cod_abramus', 'ABRAMUS_PROTOCOL');
    await this.assertFullyMigrated(queryRunner, 'phonograms', 'RECORDING', 'cod_ecad', 'ECAD_WORK_CODE');

    // 5-6. Nenhum índice/constraint/CHECK depende destas colunas (confirmado por
    // busca exaustiva). abramus_protocol nunca teve dado real escrito (verificado:
    // nenhum DTO/service/frontend jamais leu ou gravou nesta coluna).
    await queryRunner.query(`
      ALTER TABLE works
        DROP COLUMN IF EXISTS cod_abramus,
        DROP COLUMN IF EXISTS cod_ecad,
        DROP COLUMN IF EXISTS abramus_protocol
    `);
    await queryRunner.query(`
      ALTER TABLE phonograms
        DROP COLUMN IF EXISTS cod_abramus,
        DROP COLUMN IF EXISTS cod_ecad,
        DROP COLUMN IF EXISTS abramus_protocol
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE works
        ADD COLUMN IF NOT EXISTS cod_abramus VARCHAR(100),
        ADD COLUMN IF NOT EXISTS cod_ecad VARCHAR(100),
        ADD COLUMN IF NOT EXISTS abramus_protocol VARCHAR(100)
    `);
    await queryRunner.query(`
      ALTER TABLE phonograms
        ADD COLUMN IF NOT EXISTS cod_abramus VARCHAR(100),
        ADD COLUMN IF NOT EXISTS cod_ecad VARCHAR(100),
        ADD COLUMN IF NOT EXISTS abramus_protocol VARCHAR(100)
    `);

    // Reversão honesta: só reidrata a coluna quando existe EXATAMENTE UM
    // identificador correspondente (sem CASCADE, sem escolher arbitrariamente
    // entre múltiplos registros quando o work/phonogram tem mais de um).
    const restore = async (
      table: 'works' | 'phonograms',
      entityType: 'WORK' | 'RECORDING',
      column: 'cod_abramus' | 'cod_ecad',
      identifierType: 'ABRAMUS_PROTOCOL' | 'ECAD_WORK_CODE',
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
    await restore('works', 'WORK', 'cod_abramus', 'ABRAMUS_PROTOCOL');
    await restore('works', 'WORK', 'cod_ecad', 'ECAD_WORK_CODE');
    await restore('phonograms', 'RECORDING', 'cod_abramus', 'ABRAMUS_PROTOCOL');
    await restore('phonograms', 'RECORDING', 'cod_ecad', 'ECAD_WORK_CODE');
  }
}
