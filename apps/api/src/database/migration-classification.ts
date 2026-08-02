/**
 * migration-classification.ts  (Parte 72 — desacoplamento de migrations gerenciadas externamente)
 *
 * Fonte canônica única: qual categoria cada migration pertence. Nenhum outro
 * arquivo deve decidir isso por conta própria (padrão de nome, timestamp,
 * heurística) — sempre importar `getMigrationCategory` daqui.
 *
 * Contexto: `RealtimeBroadcastAuthorization20260801000001` altera
 * `realtime.messages`, uma tabela pertencente ao schema `realtime` —
 * gerenciado pela extensão Realtime do Supabase, não pela aplicação. Em
 * DEV/STAGING/PROD reais, essa tabela pertence à role `supabase_realtime_admin`,
 * não à role de conexão da aplicação (confirmado empiricamente na Parte 72:
 * `error: must be owner of table messages`). O runner de migrations do
 * TypeORM aplica em ordem e para na primeira falha — então uma migration
 * EXTERNAL_MANAGED pendente bloqueava toda e qualquer migration APPLICATION
 * posterior, mesmo sem nenhuma relação real entre elas.
 *
 * Categorias:
 *
 *  - APPLICATION: schema controlado inteiramente pelo MUSIC OS 360 (schema
 *    `public`). Deve ser aplicável pela role normal da aplicação. Categoria
 *    DEFAULT — uma migration só é outra coisa se listada explicitamente
 *    abaixo.
 *
 *  - EXTERNAL_MANAGED: altera objeto pertencente a um serviço gerenciado
 *    externamente (ex.: schema `realtime`, `auth`, `storage` do Supabase).
 *    Pode exigir privilégio que a role de conexão normal não tem. Não deve
 *    bloquear migrations APPLICATION posteriores — só a funcionalidade que
 *    dela depende. Precisa de um verificador físico próprio (ver
 *    verify-realtime-external.ts), nunca apenas a linha de tracking.
 *
 *  - PRIVILEGED: exige credencial administrativa especial, mas ainda é um
 *    objeto que a aplicação possui/controla (diferente de EXTERNAL_MANAGED).
 *    Não deve executar silenciosamente; precisa de preflight e verificação
 *    posterior. Nenhuma migration usa esta categoria ainda.
 */

export enum MigrationCategory {
  APPLICATION = 'APPLICATION',
  EXTERNAL_MANAGED = 'EXTERNAL_MANAGED',
  PRIVILEGED = 'PRIVILEGED',
}

/** Nunca remover uma entrada daqui sem confirmar fisicamente que a migration deixou de tocar schema externo. */
const EXTERNAL_MANAGED_MIGRATIONS: ReadonlySet<string> = new Set([
  'RealtimeBroadcastAuthorization20260801000001',
]);

const PRIVILEGED_MIGRATIONS: ReadonlySet<string> = new Set([]);

export function getMigrationCategory(migrationName: string): MigrationCategory {
  if (EXTERNAL_MANAGED_MIGRATIONS.has(migrationName)) return MigrationCategory.EXTERNAL_MANAGED;
  if (PRIVILEGED_MIGRATIONS.has(migrationName)) return MigrationCategory.PRIVILEGED;
  return MigrationCategory.APPLICATION;
}

export function isApplicationMigration(migrationName: string): boolean {
  return getMigrationCategory(migrationName) === MigrationCategory.APPLICATION;
}

export function listExternalManagedMigrationNames(): string[] {
  return [...EXTERNAL_MANAGED_MIGRATIONS];
}
