import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Completa a generalização de vinculação a entidades de gestão coletiva
 * (ABRAMUS/ECAD/UBC/SBACEM/...) que já estava PARCIALMENTE construída no
 * sistema desde 2026-06-01 (`RegistryRightsHoldersIdentifiers`), mas nunca
 * teve os dados legados migrados para lá.
 *
 * Evidência de que a generalização já era a direção do produto — não uma
 * invenção desta migration: `society-payload-builder.service.ts` (código
 * real e ativo do módulo Registry) já lê `work.cod_abramus`/`cod_ecad` e os
 * converte on-the-fly para o formato genérico ao montar o payload de
 * submissão à sociedade:
 *
 *   if (work.cod_abramus) legacy.push({ provider: 'ABRAMUS', type: 'ABRAMUS_PROTOCOL', value: work.cod_abramus });
 *   if (work.cod_ecad)    legacy.push({ provider: 'ECAD',    type: 'ECAD_WORK_CODE',   value: work.cod_ecad });
 *
 * Esta migration faz a mesma conversão, mas persistindo em `external_identifiers`
 * (a tabela genérica e extensível já existente, com CHECK que já suporta
 * ABRAMUS/ECAD/CISAC/IFPI/PRO_MUSICA/ISRC/INTERNAL/OTHER — não uma coluna
 * por sociedade). Não remove `works.cod_abramus`/`cod_ecad`/`phonograms.cod_abramus`/
 * `cod_ecad` nesta rodada: essas colunas ainda são o único campo exposto no
 * formulário interativo ativo (ObraFormModal.tsx), no contrato oficial de
 * Reports (WORKS_CONTRACT) e no módulo de integração real com a API externa
 * da ABRAMUS (`abramus.service.ts`) — removê-las exige antes redesenhar o
 * formulário para suportar múltiplas entidades por obra (decisão de
 * produto/UX, não uma correção de bug; ver docs).
 *
 * Idempotente (ON CONFLICT DO NOTHING na UNIQUE já existente
 * `uq_ext_id_entity_value`). Não usa CASCADE. Não remove nenhuma coluna.
 */
export class BackfillLegacySocietyCodesToExternalIdentifiers20260718000015 implements MigrationInterface {
  name = 'BackfillLegacySocietyCodesToExternalIdentifiers20260718000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const [{ before }] = await queryRunner.query(`
      SELECT count(*)::int AS before FROM external_identifiers
      WHERE identifier_type IN ('ABRAMUS_PROTOCOL', 'ECAD_WORK_CODE')
    `);

    await queryRunner.query(`
      INSERT INTO external_identifiers (tenant_id, entity_type, entity_id, provider, identifier_type, identifier_value, is_primary)
      SELECT tenant_id, 'WORK', id, 'ABRAMUS', 'ABRAMUS_PROTOCOL', cod_abramus, true
      FROM works WHERE cod_abramus IS NOT NULL AND btrim(cod_abramus) <> ''
      ON CONFLICT (tenant_id, entity_type, entity_id, identifier_type, identifier_value) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO external_identifiers (tenant_id, entity_type, entity_id, provider, identifier_type, identifier_value, is_primary)
      SELECT tenant_id, 'WORK', id, 'ECAD', 'ECAD_WORK_CODE', cod_ecad, true
      FROM works WHERE cod_ecad IS NOT NULL AND btrim(cod_ecad) <> ''
      ON CONFLICT (tenant_id, entity_type, entity_id, identifier_type, identifier_value) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO external_identifiers (tenant_id, entity_type, entity_id, provider, identifier_type, identifier_value, is_primary)
      SELECT tenant_id, 'RECORDING', id, 'ABRAMUS', 'ABRAMUS_PROTOCOL', cod_abramus, true
      FROM phonograms WHERE cod_abramus IS NOT NULL AND btrim(cod_abramus) <> ''
      ON CONFLICT (tenant_id, entity_type, entity_id, identifier_type, identifier_value) DO NOTHING
    `);
    await queryRunner.query(`
      INSERT INTO external_identifiers (tenant_id, entity_type, entity_id, provider, identifier_type, identifier_value, is_primary)
      SELECT tenant_id, 'RECORDING', id, 'ECAD', 'ECAD_WORK_CODE', cod_ecad, true
      FROM phonograms WHERE cod_ecad IS NOT NULL AND btrim(cod_ecad) <> ''
      ON CONFLICT (tenant_id, entity_type, entity_id, identifier_type, identifier_value) DO NOTHING
    `);

    const [{ after }] = await queryRunner.query(`
      SELECT count(*)::int AS after FROM external_identifiers
      WHERE identifier_type IN ('ABRAMUS_PROTOCOL', 'ECAD_WORK_CODE')
    `);
    // Nunca deve haver MENOS linhas do que já existiam antes de rodar — INSERT
    // só adiciona (ON CONFLICT DO NOTHING é idempotente, nunca remove).
    if (Number(after) < Number(before)) {
      throw new Error(
        `BackfillLegacySocietyCodesToExternalIdentifiers: contagem de external_identifiers ` +
        `diminuiu (antes=${before}, depois=${after}) — migration abortada.`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove apenas o que esta migration pode ter inserido (heurística: mesmo
    // valor already present nas colunas legadas) — não apaga vinculações
    // criadas por outros fluxos (ex.: cadastro manual via tela de Registry).
    await queryRunner.query(`
      DELETE FROM external_identifiers ei
      WHERE ei.identifier_type = 'ABRAMUS_PROTOCOL'
        AND ei.entity_type = 'WORK'
        AND EXISTS (SELECT 1 FROM works w WHERE w.id = ei.entity_id AND w.cod_abramus = ei.identifier_value)
    `);
    await queryRunner.query(`
      DELETE FROM external_identifiers ei
      WHERE ei.identifier_type = 'ECAD_WORK_CODE'
        AND ei.entity_type = 'WORK'
        AND EXISTS (SELECT 1 FROM works w WHERE w.id = ei.entity_id AND w.cod_ecad = ei.identifier_value)
    `);
    await queryRunner.query(`
      DELETE FROM external_identifiers ei
      WHERE ei.identifier_type = 'ABRAMUS_PROTOCOL'
        AND ei.entity_type = 'RECORDING'
        AND EXISTS (SELECT 1 FROM phonograms p WHERE p.id = ei.entity_id AND p.cod_abramus = ei.identifier_value)
    `);
    await queryRunner.query(`
      DELETE FROM external_identifiers ei
      WHERE ei.identifier_type = 'ECAD_WORK_CODE'
        AND ei.entity_type = 'RECORDING'
        AND EXISTS (SELECT 1 FROM phonograms p WHERE p.id = ei.entity_id AND p.cod_ecad = ei.identifier_value)
    `);
  }
}
