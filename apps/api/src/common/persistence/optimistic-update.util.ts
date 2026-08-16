import { BadRequestException, ConflictException } from '@nestjs/common';
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
export async function casUpdate<T extends ObjectLiteral>(
  repo: Repository<T>,
  criteria: FindOptionsWhere<T>,
  payload: QueryDeepPartialEntity<T>,
  expectedUpdatedAt: string | undefined,
  conflictMessage = 'Este registro foi alterado por outro usuário desde que você o carregou. Recarregue e tente novamente.',
): Promise<void> {
  const finalCriteria: FindOptionsWhere<T> = { ...criteria };

  if (expectedUpdatedAt) {
    const expected = new Date(expectedUpdatedAt);
    if (Number.isNaN(expected.getTime())) {
      throw new BadRequestException('expectedUpdatedAt inválido');
    }
    (finalCriteria as Record<string, unknown>)['updated_at'] = expected;
  }

  const result = await repo.update(finalCriteria, payload);

  if (expectedUpdatedAt && result.affected === 0) {
    throw new ConflictException(conflictMessage);
  }
}
