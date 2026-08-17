import { ConflictException, NotFoundException } from '@nestjs/common';
import { FinancialCategoriesService } from './financial-categories.service';

/**
 * Task Z — remove() é um hard delete guardado por checagens de aplicação
 * (children/transações/regras de categorização), distinto de archive()
 * (soft delete via is_active=false). Achado em validação de runtime real:
 * o grant de DELETE em financial_categories nunca existia (42501 —
 * "permission denied"), então mesmo uma categoria 100% sem uso nunca
 * conseguia ser excluída; e a checagem de uso nunca considerava
 * finance_category_keyword_rules (Task W), então uma categoria referenciada
 * por regra ativa quebrava na FK (23503) em vez de um 409 de domínio claro.
 */
describe('FinancialCategoriesService.remove()', () => {
  const TENANT = 'tenant-1';
  const CATEGORY_ID = 'cat-1';
  const CATEGORY_ROW = {
    id: CATEGORY_ID, tenant_id: TENANT, parent_id: null, name: 'Equipamentos',
    nature: 'operating_expense', level: 1, is_active: true,
  };

  function makeService(queryImpl: (sql: string, params: unknown[]) => unknown) {
    const query = jest.fn((sql: string, params: unknown[]) => Promise.resolve(queryImpl(sql, params)));
    const ds = { query } as any;
    const events = { emit: jest.fn() } as any;
    const svc = new FinancialCategoriesService(ds, events);
    return { svc, query, events };
  }

  function zeroUsage() {
    return { children: 0, canonical_transactions: 0, legacy_transactions: 0, category_rules: 0 };
  }

  it('categoria sem nenhuma referência: exclui normalmente e emite evento', async () => {
    const calls: string[] = [];
    const { svc, query, events } = makeService((sql) => {
      calls.push(sql);
      if (sql.includes('SELECT *') && sql.includes('FROM financial_categories')) return [CATEGORY_ROW];
      if (sql.includes('AS children')) return [zeroUsage()];
      if (sql.startsWith('DELETE FROM financial_categories')) return [{ id: CATEGORY_ID }];
      throw new Error(`unexpected query: ${sql}`);
    });

    const result = await svc.remove(TENANT, 'user-1', CATEGORY_ID);

    expect(result).toEqual({ deleted: true, id: CATEGORY_ID });
    expect(calls.some((sql) => sql.startsWith('DELETE FROM financial_categories'))).toBe(true);
    expect(events.emit).toHaveBeenCalledWith(expect.objectContaining({
      type: 'financial_category.deleted',
      tenantId: TENANT,
      aggregateId: CATEGORY_ID,
    }));
  });

  it('categoria com subcategorias: 409, nunca chega a executar o DELETE', async () => {
    const { svc, query } = makeService((sql) => {
      if (sql.includes('SELECT *') && sql.includes('FROM financial_categories')) return [CATEGORY_ROW];
      if (sql.includes('AS children')) return [{ ...zeroUsage(), children: 1 }];
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(svc.remove(TENANT, 'user-1', CATEGORY_ID)).rejects.toThrow(ConflictException);
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM financial_categories'))).toBe(false);
  });

  it('categoria com transações vinculadas (canônicas ou legado): 409, sem DELETE', async () => {
    const { svc, query } = makeService((sql) => {
      if (sql.includes('SELECT *') && sql.includes('FROM financial_categories')) return [CATEGORY_ROW];
      if (sql.includes('AS children')) return [{ ...zeroUsage(), legacy_transactions: 1 }];
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(svc.remove(TENANT, 'user-1', CATEGORY_ID)).rejects.toThrow(ConflictException);
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM financial_categories'))).toBe(false);
  });

  it('categoria referenciada por regra de categorização ativa: 409 com mensagem específica, sem DELETE', async () => {
    const { svc, query } = makeService((sql) => {
      if (sql.includes('SELECT *') && sql.includes('FROM financial_categories')) return [CATEGORY_ROW];
      if (sql.includes('AS children')) return [{ ...zeroUsage(), category_rules: 1 }];
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(svc.remove(TENANT, 'user-1', CATEGORY_ID))
      .rejects.toThrow('Categoria vinculada a regra de categorização automática não pode ser excluída');
    expect(query.mock.calls.some(([sql]) => String(sql).startsWith('DELETE FROM financial_categories'))).toBe(false);
  });

  it('regra soft-deletada não bloqueia a checagem de aplicação, mas a FK (23503) ainda protege e vira 409 — nunca 500', async () => {
    const { svc } = makeService((sql) => {
      if (sql.includes('SELECT *') && sql.includes('FROM financial_categories')) return [CATEGORY_ROW];
      if (sql.includes('AS children')) return [zeroUsage()];
      if (sql.startsWith('DELETE FROM financial_categories')) {
        const error = new Error('insert or update on table "finance_category_keyword_rules" violates foreign key constraint');
        (error as any).driverError = { code: '23503' };
        Object.setPrototypeOf(error, require('typeorm').QueryFailedError.prototype);
        throw error;
      }
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(svc.remove(TENANT, 'user-1', CATEGORY_ID)).rejects.toThrow(ConflictException);
  });

  it('categoria inexistente: 404 antes de qualquer checagem de uso', async () => {
    const { svc, query } = makeService((sql) => {
      if (sql.includes('SELECT *') && sql.includes('FROM financial_categories')) return [];
      throw new Error(`unexpected query: ${sql}`);
    });

    await expect(svc.remove(TENANT, 'user-1', CATEGORY_ID)).rejects.toThrow(NotFoundException);
    expect(query).toHaveBeenCalledTimes(1);
  });
});
