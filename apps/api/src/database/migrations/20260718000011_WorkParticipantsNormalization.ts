import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Normaliza a autoria de `works`.
 *
 * Evidência real (auditoria 2026-07-18):
 *   - `works.participantes` (jsonb) é a fonte rica e ativa de autoria do
 *     formulário interativo (ObraFormModal.tsx), com forma fixa e conhecida
 *     por item: { id, nome, classeFuncao, link, percentual }. Uma lista de
 *     registros relacionados não deve viver em uma única coluna jsonb —
 *     vira tabela filha `work_participants`.
 *   - `works.detentores` e `works.co_compositores` NÃO possuem nenhum writer
 *     ativo: sem input no formulário, ausentes de CreateWorkDto/UpdateWorkDto,
 *     e marcados `importable: false` no contrato de Reports (não graváveis
 *     nem por bulk-import). São colunas órfãs — nenhum fluxo real as
 *     popula desde que o contrato atual existe. `up()` valida que não há
 *     dado remanescente incompatível antes de removê-las (fail-fast).
 *   - `works.compositor` e `works.editora` PERMANECEM: possuem writer real
 *     (bulk-import via Reports, `importable: true` no contrato) e leitor
 *     real (`catalog-metadata-validator`, `external-data-exchange`).
 *
 * Participante do formulário nunca precisa ser uma entidade cadastrada
 * (ParticipanteForm não tem artista_id) — por isso `nome` é texto livre,
 * não FK obrigatória.
 */
export class WorkParticipantsNormalization20260718000011 implements MigrationInterface {
  name = 'WorkParticipantsNormalization20260718000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Fail-fast: aborta se `participantes` contiver item em formato
    //    desconhecido (fora do shape {id,nome,classeFuncao,link,percentual}).
    const badShape: Array<{ id: string }> = await queryRunner.query(`
      SELECT w.id
      FROM works w, jsonb_array_elements(COALESCE(w.participantes, '[]'::jsonb)) AS item
      WHERE NOT (item ? 'nome')
      LIMIT 20
    `);
    if (badShape.length > 0) {
      throw new Error(
        `WorkParticipantsNormalization: ${badShape.length}+ obra(s) com item de ` +
        `participantes em formato desconhecido (sem chave "nome") — ex.: ${badShape.map((r) => r.id).join(', ')}. ` +
        `Migration abortada; corrigir os dados manualmente antes de reexecutar.`,
      );
    }

    // ── 2. Fail-fast: aborta se `detentores`/`co_compositores` tiverem dado
    //    remanescente (nenhum writer ativo os popula — qualquer valor hoje
    //    seria legado anterior ao contrato atual e precisa de triagem manual
    //    antes de a coluna ser removida).
    const orphanData: Array<{ count: string }> = await queryRunner.query(`
      SELECT count(*)::text AS count FROM works
      WHERE (detentores IS NOT NULL AND btrim(detentores) <> '')
         OR (co_compositores IS NOT NULL AND btrim(co_compositores) <> '')
    `);
    if (Number(orphanData[0]?.count ?? '0') > 0) {
      throw new Error(
        `WorkParticipantsNormalization: ${orphanData[0].count} obra(s) possuem dado em ` +
        `detentores/co_compositores. Nenhum writer ativo grava essas colunas hoje — ` +
        `triagem manual necessária (migrar para work_participants/rights_holders ou ` +
        `confirmar descarte) antes de remover as colunas. Migration abortada.`,
      );
    }

    // ── 3. Cria a tabela filha ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS work_participants (
        id           uuid PRIMARY KEY,
        tenant_id    uuid NOT NULL,
        work_id      uuid NOT NULL REFERENCES works(id) ON DELETE CASCADE,
        nome         varchar(255) NOT NULL,
        classe_funcao varchar(100) NOT NULL,
        link         text,
        percentual   numeric(6,3),
        ordem        integer NOT NULL DEFAULT 0,
        created_at   timestamp NOT NULL DEFAULT now(),
        updated_at   timestamp NOT NULL DEFAULT now(),
        CONSTRAINT chk_work_participants_percentual
          CHECK (percentual IS NULL OR (percentual >= 0 AND percentual <= 100))
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS idx_work_participants_tenant_work ON work_participants (tenant_id, work_id)`);

    // ── 4. Backfill: um row por item de works.participantes ────────────────
    await queryRunner.query(`
      INSERT INTO work_participants (id, tenant_id, work_id, nome, classe_funcao, link, percentual, ordem)
      SELECT
        COALESCE(NULLIF(elem.item->>'id', '')::uuid, gen_random_uuid()),
        w.tenant_id,
        w.id,
        elem.item->>'nome',
        COALESCE(NULLIF(elem.item->>'classeFuncao', ''), 'não_informado'),
        NULLIF(elem.item->>'link', ''),
        NULLIF(elem.item->>'percentual', '')::numeric,
        elem.ordinality - 1
      FROM works w, jsonb_array_elements(COALESCE(w.participantes, '[]'::jsonb)) WITH ORDINALITY AS elem(item, ordinality)
      ON CONFLICT (id) DO NOTHING
    `);

    // ── 5. Verifica que o backfill não perdeu nenhum item ───────────────────
    const [{ source_count, target_count }] = await queryRunner.query(`
      SELECT
        (SELECT COALESCE(SUM(jsonb_array_length(COALESCE(participantes, '[]'::jsonb))), 0) FROM works)::text AS source_count,
        (SELECT COUNT(*) FROM work_participants)::text AS target_count
    `);
    if (source_count !== target_count) {
      throw new Error(
        `WorkParticipantsNormalization: backfill incompleto — works.participantes tinha ` +
        `${source_count} itens, work_participants recebeu ${target_count}. Migration abortada ` +
        `antes de remover as colunas de origem.`,
      );
    }

    // ── 6. RLS na tabela filha (mesmo padrão de 20260613000008) ─────────────
    await queryRunner.query(`ALTER TABLE work_participants ENABLE ROW LEVEL SECURITY`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policy WHERE polname = 'tenant_isolation' AND polrelid = 'public.work_participants'::regclass
        ) THEN
          CREATE POLICY "tenant_isolation" ON work_participants
            FOR ALL
            USING (tenant_id = private_get_tenant_id())
            WITH CHECK (tenant_id = private_get_tenant_id());
        END IF;
      END $$;
    `);

    // ── 7. Remove as colunas de origem, já migradas/comprovadamente órfãs ───
    await queryRunner.query(`
      ALTER TABLE works
        DROP COLUMN IF EXISTS participantes,
        DROP COLUMN IF EXISTS detentores,
        DROP COLUMN IF EXISTS co_compositores
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE works
        ADD COLUMN IF NOT EXISTS participantes jsonb,
        ADD COLUMN IF NOT EXISTS detentores text,
        ADD COLUMN IF NOT EXISTS co_compositores text
    `);
    await queryRunner.query(`
      UPDATE works w SET participantes = COALESCE(sub.items, '[]'::jsonb)
      FROM (
        SELECT work_id, jsonb_agg(
          jsonb_build_object(
            'id', id, 'nome', nome, 'classeFuncao', classe_funcao,
            'link', link, 'percentual', percentual::text
          ) ORDER BY ordem
        ) AS items
        FROM work_participants
        GROUP BY work_id
      ) sub
      WHERE w.id = sub.work_id
    `);
    await queryRunner.query(`DROP TABLE IF EXISTS work_participants`);
  }
}
