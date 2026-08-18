import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Correção sistêmica da mesma classe de bug resolvida para `artists` em
 * `ArtistsTimestampTzFix20260818000001`: qualquer tabela cujo serviço use
 * `casUpdate`/`buildExpectedUpdatedAtCriterion` (common/persistence/optimistic-update.util.ts)
 * precisa que `updated_at` seja `timestamptz` — a comparação `date_trunc(...) =
 * date_trunc(... ::timestamptz)` casta implicitamente usando o TimeZone da
 * SESSÃO do Postgres (UTC), enquanto uma coluna `timestamp` naive é lida de
 * volta pelo driver `pg` usando o timezone LOCAL do processo Node. Reproduzido
 * ao vivo nesta correção (não apenas herdado do fix de artists) contra linhas
 * reais em `works` e `clients`: um PATCH idempotente, reenviando exatamente o
 * `updated_at` que a própria API acabou de devolver, falha a comparação e
 * devolveria 409 — sem nenhuma edição concorrente real.
 *
 * Lista obtida por grep de todos os chamadores de `casUpdate`/
 * `buildExpectedUpdatedAtCriterion` em apps/api/src/modules/**\/*.service.ts,
 * cruzado contra o tipo físico REAL da coluna consultado via
 * information_schema.columns no Postgres de DEV (não apenas a declaração
 * TypeORM em entities.ts — migration registrada não implica migration
 * aplicada; ver nota sobre `ArtistsTimestampTzFix20260818000001` abaixo).
 * Tabelas com CAS que já eram `timestamptz` (financial_categories,
 * financial_rules, finance_category_keyword_rules, licenses, forms,
 * inventory_items, conversations, marketing_*, audiovisual_*) não entram
 * aqui — nada a corrigir.
 *
 * `org_members` entra nesta lista porque `UsersService.update/updateRole/
 * updateStatus` (modules/users/users.service.ts) usa `casUpdate` sobre
 * `OrgMemberEntity`, não sobre `UserEntity` (que já é timestamptz) — achado
 * desta auditoria, não estava no escopo original do relatório.
 *
 * Interpretação do timezone histórico (Task 3 desta correção — não copiar
 * cegamente `AT TIME ZONE 'UTC'` sem provar que é a interpretação correta):
 * testado ao vivo nesta sessão que o driver `pg`, ao serializar um `Date` do
 * Node para uma coluna `timestamp` (sem tz), grava os dígitos crus usando o
 * timezone LOCAL do PROCESSO que fez o INSERT/UPDATE — não UTC (prova: INSERT
 * de `new Date()` numa tabela temp com colunas `timestamp` e `timestamptz`
 * lado a lado gravou "14:45:59" na naive e "17:45:59Z" na tz, processo em
 * America/Sao_Paulo). Isso significa que a proveniência real dos dígitos
 * históricos depende do timezone do PROCESSO que os escreveu — que pode ter
 * sido um deploy em produção/staging (tipicamente UTC) OU uma máquina de
 * desenvolvedor local (ex.: America/Sao_Paulo, como comprovado aqui) —
 * indeterminável e provavelmente misto entre linhas antigas, exatamente a
 * ambiguidade que o comentário original do fix de artists já identificava
 * como "arriscado de inferir por ambiente/deploy". Diante dessa ambiguidade
 * genuína e comprovada (não presumida), `AT TIME ZONE 'UTC'` continua sendo a
 * escolha mais conservadora: não desloca nenhum dígito já gravado (é uma
 * reinterpretação não-destrutiva, matematicamente idempotente quando a sessão
 * do Postgres já está em UTC — confirmado: `SHOW TIMEZONE` = UTC neste
 * ambiente), ao contrário de assumir um único timezone de origem (ex.:
 * America/Sao_Paulo) para TODAS as linhas históricas, o que deslocaria
 * incorretamente qualquer linha que na verdade tenha sido escrita por um
 * processo em UTC. Mantém consistência com o precedente já aplicado a
 * `artists`.
 *
 * NOTA — estado do runner de migrations encontrado nesta correção:
 * `ArtistsTimestampTzFix20260818000001` está REGISTRADA no código e o schema
 * real do Postgres de DEV já reflete seu resultado (`artists.updated_at` já é
 * `timestamptz`), mas a migration NÃO estava marcada como aplicada em
 * `musicos360_migrations` — foi aplicada manualmente (SQL direto, conforme o
 * próprio comentário "Comprovado com SQL direto" no arquivo da migration)
 * sem passar pelo runner rastreado, provavelmente porque `db:migrate`
 * (TypeORM puro) trava na primeira migration pendente em ordem — que é
 * `RealtimeBroadcastAuthorization20260801000001`, classificada
 * EXTERNAL_MANAGED em migration-classification.ts (schema `realtime` do
 * Supabase, fora do controle da role de conexão da aplicação). Esta correção
 * reconcilia isso executando de verdade `ArtistsTimestampTzFix20260818000001`
 * via `npm run db:migrate:application` (que pula EXTERNAL_MANAGED sem abortar
 * a fila) — reaplicar o `ALTER COLUMN ... USING ... AT TIME ZONE 'UTC'` numa
 * coluna que já é timestamptz com sessão em UTC é matematicamente idempotente
 * (verificado antes de rodar), então a re-execução é segura e o tracking
 * passa a refletir a realidade, sem marcar nada como aplicado artificialmente.
 */
export class CasTimestampTzSystemicFix20260818000002 implements MigrationInterface {
  name = 'CasTimestampTzSystemicFix20260818000002';

  private readonly tables: readonly string[] = [
    'org_members',
    'works',
    'phonograms',
    'contracts',
    'contract_templates',
    'transactions',
    'invoices',
    'clients',
    'leads',
    'campaigns',
    'events',
    'projects',
    'releases',
    'shares',
    'takedowns',
    'support_tickets',
    'content_detections',
    'ecad_reports',
    'employees',
    'rights_holders',
    'external_identifiers',
    'society_accounts',
    'society_submissions',
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of this.tables) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ALTER COLUMN "created_at" TYPE timestamptz USING "created_at" AT TIME ZONE 'UTC',
          ALTER COLUMN "updated_at" TYPE timestamptz USING "updated_at" AT TIME ZONE 'UTC'
      `);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "created_at" SET DEFAULT now()`);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "updated_at" SET DEFAULT now()`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [...this.tables].reverse()) {
      await queryRunner.query(`
        ALTER TABLE "${table}"
          ALTER COLUMN "created_at" TYPE timestamp USING "created_at" AT TIME ZONE 'UTC',
          ALTER COLUMN "updated_at" TYPE timestamp USING "updated_at" AT TIME ZONE 'UTC'
      `);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "created_at" SET DEFAULT now()`);
      await queryRunner.query(`ALTER TABLE "${table}" ALTER COLUMN "updated_at" SET DEFAULT now()`);
    }
  }
}
