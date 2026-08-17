import { BadRequestException, ConflictException } from '@nestjs/common';
import { Raw } from 'typeorm';
import type { FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import type { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/**
 * Task K — proteção de concorrência genérica para updates via TypeORM
 * `Repository.update()`. Extraída do fix original em TransactionsService
 * (Task J continuidade) para reuso consistente entre domínios.
 *
 * Sem `expectedUpdatedAt`: comportamento idêntico a `repo.update()` puro —
 * retrocompatível, nenhum chamador existente quebra.
 *
 * Com `expectedUpdatedAt`: o UPDATE só aplica se a coluna `updated_at` no
 * banco ainda for exatamente esse valor (CAS via coluna já existente, sem
 * migração). 0 linhas afetadas = o registro mudou entre a leitura e a
 * gravação (dois usuários editando em paralelo, ou já foi apagado) → 409,
 * nunca sobrescreve silenciosamente ("lost update").
 *
 * Não usar para entidades sem coluna `updated_at` gerenciada automaticamente
 * (@UpdateDateColumn ou equivalente) — o CAS depende dela já refletir cada
 * escrita anterior.
 */
/**
 * Task Y — extraído de dentro de `casUpdate` para reuso por implementações
 * que precisam do MESMO critério seguro de comparação de `updated_at`, mas
 * têm uma semântica de conflito diferente da de `casUpdate` (ex.:
 * AudiovisualApprovalsService.decide() precisa que 0 linhas afetadas vire
 * 409 SEMPRE — mesmo sem expectedUpdatedAt, por causa do guard adicional de
 * status='pending' na própria condição do UPDATE — enquanto `casUpdate` só
 * checa isso quando expectedUpdatedAt foi fornecido, por retrocompatibilidade
 * com os ~44 chamadores existentes). Reaproveitar isto evita duplicar a
 * lógica de truncamento (o bug de precisão em si), sem forçar todo chamador
 * de `casUpdate` a herdar uma semântica de conflito que não pediu.
 *
 * `updated_at` costuma ser um `timestamp` do Postgres sem precisão
 * declarada (microssegundos); o valor que chega aqui já perdeu essa
 * precisão ao passar por Date/JSON (milissegundos, no máximo — Date só
 * guarda isso). Uma igualdade exata nunca bateria com o valor real do
 * banco — compara truncado a milissegundos dos dois lados, senão todo CAS
 * válido seria rejeitado como conflito por ruído de subprecisão.
 */
export function buildExpectedUpdatedAtCriterion(expectedUpdatedAt: string): unknown {
  const expected = new Date(expectedUpdatedAt);
  if (Number.isNaN(expected.getTime())) {
    throw new BadRequestException('expectedUpdatedAt inválido');
  }
  return Raw(
    (alias) => `date_trunc('milliseconds', ${alias}) = date_trunc('milliseconds', :expected::timestamptz)`,
    { expected },
  );
}

export async function casUpdate<T extends ObjectLiteral>(
  repo: Repository<T>,
  criteria: FindOptionsWhere<T>,
  payload: QueryDeepPartialEntity<T>,
  expectedUpdatedAt: string | undefined,
  conflictMessage = 'Este registro foi alterado por outro usuário desde que você o carregou. Recarregue e tente novamente.',
): Promise<void> {
  const finalCriteria: FindOptionsWhere<T> = { ...criteria };

  if (expectedUpdatedAt) {
    (finalCriteria as Record<string, unknown>)['updated_at'] = buildExpectedUpdatedAtCriterion(expectedUpdatedAt);
  }

  const result = await repo.update(finalCriteria, payload);

  if (expectedUpdatedAt && result.affected === 0) {
    throw new ConflictException(conflictMessage);
  }
}
