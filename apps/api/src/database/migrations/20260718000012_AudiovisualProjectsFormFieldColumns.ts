import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Sincronização formulário ↔ banco: Produções Audiovisuais (audiovisual_projects).
 *
 * Achado CRÍTICO confirmado (auditoria 2026-07-18): o formulário real e ativo
 * (AudiovisualProjectFormModal.tsx) envia, sem NENHUM mapper intermediário
 * (audiovisual.service.ts chama `api.post`/`api.patch` com o payload cru),
 * campos que CreateAudiovisualProjectDto/UpdateAudiovisualProjectDto não
 * declaravam. Com ValidationPipe global (whitelist + forbidNonWhitelisted),
 * TODA criação/edição de produção audiovisual retornava 400 — bug real, não
 * hipotético. Esta migration cria as colunas que faltavam.
 *
 * Duas divergências de nome foram resolvidas SEM criar coluna nova, porque a
 * evidência prova que já são o mesmo conceito de uma coluna já existente:
 *   - `music_id` (form) → a UI já lê/grava por meio da FK existente
 *     `phonogram_id`; o formulário foi corrigido para usar o nome real
 *     (nenhuma coluna nova).
 *   - `budget`/`real_cost` (form) → todo lugar do frontend que exibe estes
 *     valores usa os rótulos "Orçamento Previsto"/"Custo Real", e o dashboard
 *     (`projects.service.ts::dashboard`) já soma `budget_estimated`/
 *     `budget_actual` desta mesma tabela — se o form continuasse gravando em
 *     colunas novas, o dashboard financeiro ficaria zerado silenciosamente.
 *     Formulário corrigido para usar os nomes reais (nenhuma coluna nova).
 *
 * `shooting_date` é adicionada como coluna NOVA (não uma renomeação de
 * `recording_date`): todo ponto de leitura do frontend já faz
 * `project.shooting_date ?? project.recording_date` — ou seja, o produto já
 * trata `shooting_date` como o nome canônico novo e `recording_date` como
 * fallback legado, sem necessidade de dual-write no backend (o frontend já
 * faz o fallback na leitura).
 *
 * `release_date` é mantida como coluna nova e DISTINTA de `publish_date`
 * (que continua sendo escrita automaticamente pela transição de status para
 * "published" em `transitionStatus()`) — não há evidência de que sejam o
 * mesmo conceito; `release_date` é a data planejada, `publish_date` é a data
 * real de publicação.
 */
export class AudiovisualProjectsFormFieldColumns20260718000012 implements MigrationInterface {
  name = 'AudiovisualProjectsFormFieldColumns20260718000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audiovisual_projects"
        ADD COLUMN IF NOT EXISTS "music_title" varchar(500),
        ADD COLUMN IF NOT EXISTS "artist_name" varchar(255),
        ADD COLUMN IF NOT EXISTS "format" varchar(20),
        ADD COLUMN IF NOT EXISTS "videomaker" varchar(255),
        ADD COLUMN IF NOT EXISTS "editor" varchar(255),
        ADD COLUMN IF NOT EXISTS "shooting_date" date,
        ADD COLUMN IF NOT EXISTS "location" varchar(255),
        ADD COLUMN IF NOT EXISTS "capture_status" varchar(30),
        ADD COLUMN IF NOT EXISTS "editing_status" varchar(30),
        ADD COLUMN IF NOT EXISTS "approval_status" varchar(30),
        ADD COLUMN IF NOT EXISTS "pre_release_date" date,
        ADD COLUMN IF NOT EXISTS "release_date" date,
        ADD COLUMN IF NOT EXISTS "concept" text,
        ADD COLUMN IF NOT EXISTS "observations" text,
        ADD COLUMN IF NOT EXISTS "final_status" varchar(30)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "audiovisual_projects"
        DROP COLUMN IF EXISTS "music_title",
        DROP COLUMN IF EXISTS "artist_name",
        DROP COLUMN IF EXISTS "format",
        DROP COLUMN IF EXISTS "videomaker",
        DROP COLUMN IF EXISTS "editor",
        DROP COLUMN IF EXISTS "shooting_date",
        DROP COLUMN IF EXISTS "location",
        DROP COLUMN IF EXISTS "capture_status",
        DROP COLUMN IF EXISTS "editing_status",
        DROP COLUMN IF EXISTS "approval_status",
        DROP COLUMN IF EXISTS "pre_release_date",
        DROP COLUMN IF EXISTS "release_date",
        DROP COLUMN IF EXISTS "concept",
        DROP COLUMN IF EXISTS "observations",
        DROP COLUMN IF EXISTS "final_status"
    `);
  }
}
