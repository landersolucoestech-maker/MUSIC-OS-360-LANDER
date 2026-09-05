/**
 * shares-split-invariant.spec.ts
 *
 * P1: SharesService.create/update persisted percentual with zero
 * validation — not even a same-row range check, let alone a cross-row
 * "splits for a work don't exceed 100%" check. A second, independent write
 * path (reports/import bulk importer) had the same gap. This closes the
 * SharesService half: a per-row range check (CreateShareDto.percentual now
 * has @Min(0)/@Max(100), matching its legacy alias `percentage`) plus a
 * cross-row "registry-eligible shares for the same work/phonogram never
 * exceed 100%" check — deliberately NOT "must equal exactly 100%", since a
 * work legitimately has 0/1/2/n shares entered incrementally before
 * reaching completeness; that stricter check already exists, correctly
 * scoped to registry-submission time (WorkRegistryValidationService).
 */
import 'reflect-metadata';
import { BadRequestException } from '@nestjs/common';
import { SharesService } from './shares.service';
import type { CreateShareDto, UpdateShareDto } from './dto/shares.dto';

function makeRepo(opts: { existingSum?: number; findByIdRow?: Record<string, unknown> } = {}) {
  const findByIdRow = opts.findByIdRow ?? { id: 'share-1', tenant_id: 'tenant-1' };
  const qbs: Record<string, jest.Mock>[] = [];

  return {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn(async (entity: unknown) => ({ id: 'share-new', ...(entity as object) })),
    update: jest.fn(async () => ({ affected: 1 })),
    // One shared qb per createQueryBuilder() call — findById only ever calls
    // where().getOne(); sumEligiblePercentual only ever calls select()/where()/
    // andWhere().getRawOne(). Both terminal methods live on the same object
    // since only one is ever invoked per call, keeping the mock simple.
    createQueryBuilder: jest.fn(() => {
      const qb: Record<string, jest.Mock> = {};
      const chain = () => qb;
      qb['select']    = jest.fn(chain);
      qb['where']     = jest.fn(chain);
      qb['andWhere']  = jest.fn(chain);
      qb['getOne']    = jest.fn(async () => findByIdRow);
      qb['getRawOne'] = jest.fn(async () => ({ sum: String(opts.existingSum ?? 0) }));
      qbs.push(qb);
      return qb;
    }),
    __qbs: qbs,
  };
}

function makeService(
  opts: Parameters<typeof makeRepo>[0] = {},
  queryImpl = jest.fn(async () => [{ exists: 1 }]),
) {
  const repo = makeRepo(opts);
  // query() backs assertSameTenantFk's cross-tenant FK ownership check — a
  // truthy row means "found, same tenant", so these split-budget-focused
  // tests aren't coupled to that separate check.
  const ds = { getRepository: jest.fn(() => repo), query: queryImpl } as never;
  const svc = new SharesService(ds);
  return { svc, repo };
}

describe('SharesService — split budget invariant (P1)', () => {
  describe('create', () => {
    it('permite um share elegível dentro do orçamento (obra ainda incompleta)', async () => {
      const { svc } = makeService({ existingSum: 40 });
      await expect(svc.create('tenant-1', {
        holderName: 'Autor A', percentage: 30, workId: 'work-1',
      } as unknown as CreateShareDto)).resolves.toBeDefined();
    });

    it('rejeita quando a soma elegível excederia 100% (existente 60% + novo 50% = 110%)', async () => {
      const { svc } = makeService({ existingSum: 60 });
      await expect(svc.create('tenant-1', {
        holderName: 'Autor B', percentage: 50, workId: 'work-1',
      } as unknown as CreateShareDto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('permite exatamente 100% (existente 60% + novo 40% = 100%, dentro da tolerância)', async () => {
      const { svc } = makeService({ existingSum: 60 });
      await expect(svc.create('tenant-1', {
        holderName: 'Autor C', percentage: 40, workId: 'work-1',
      } as unknown as CreateShareDto)).resolves.toBeDefined();
    });

    it('NÃO valida orçamento para shares financeiros (share_type definido) — conceito distinto (Fase 5/C6)', async () => {
      const { svc } = makeService({ existingSum: 90 });
      // percentual aqui é o campo do form (não a alias percentage), share_type
      // definido explicitamente marca como financeiro/pendente — nunca conta
      // no orçamento de splits de registro.
      await expect(svc.create('tenant-1', {
        share_type: 'pendente', percentual: 50, workId: 'work-1',
      } as unknown as CreateShareDto)).resolves.toBeDefined();
    });

    it('não valida orçamento quando não há obra_id nem fonograma_id (share sem contexto de registro)', async () => {
      const { svc, repo } = makeService();
      await expect(svc.create('tenant-1', {
        holderName: 'Sem Obra', percentage: 50,
      } as unknown as CreateShareDto)).resolves.toBeDefined();
      // A sum query never needed to run — no obra_id/fonograma_id to scope it.
      expect(repo.createQueryBuilder).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('rejeita quando a atualização faria a soma exceder 100%, herdando obra_id da linha atual', async () => {
      const { svc } = makeService({
        existingSum: 70,
        findByIdRow: { id: 'share-1', tenant_id: 'tenant-1', obra_id: 'work-1', percentual: 10, share_type: null },
      });
      await expect(svc.update('tenant-1', 'share-1', {
        percentage: 50,
      } as unknown as UpdateShareDto)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('exclui a própria linha da soma existente (não conta a si mesma duas vezes)', async () => {
      const { svc, repo } = makeService({
        existingSum: 30, // already excludes share-1 per the mocked query (asserted below)
        findByIdRow: { id: 'share-1', tenant_id: 'tenant-1', obra_id: 'work-1', percentual: 30, share_type: null },
      });
      await expect(svc.update('tenant-1', 'share-1', { percentage: 40 } as unknown as UpdateShareDto))
        .resolves.toBeDefined();
      // 30 (others) + 40 (new) = 70 — within budget, must not throw, and the
      // sum query must have excluded share-1's own id from its scope.
      const sumQb = (repo as unknown as { __qbs: Record<string, jest.Mock>[] }).__qbs
        .find((qb) => (qb['andWhere'] as jest.Mock).mock.calls.some((call) => call[0] === 's.id != :excludeId'));
      expect(sumQb).toBeDefined();
      expect(sumQb!['andWhere']).toHaveBeenCalledWith('s.id != :excludeId', { excludeId: 'share-1' });
    });
  });
});

describe('SharesService.create — FK cross-tenant (P1)', () => {
  it('rejeita obra_id (workId) de outro tenant (ou inexistente)', async () => {
    const { svc } = makeService({}, jest.fn(async () => []));
    await expect(svc.create('tenant-1', {
      holderName: 'X', percentage: 10, workId: 'work-from-another-tenant',
    } as unknown as CreateShareDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejeita fonograma_id (trackId) de outro tenant (ou inexistente)', async () => {
    const { svc } = makeService({}, jest.fn(async () => []));
    await expect(svc.create('tenant-1', {
      holderName: 'X', percentage: 10, trackId: 'track-from-another-tenant',
    } as unknown as CreateShareDto)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('permite quando a referência pertence ao tenant', async () => {
    const { svc } = makeService({}, jest.fn(async () => [{ exists: 1 }]));
    await expect(svc.create('tenant-1', {
      holderName: 'X', percentage: 10, workId: 'work-1',
    } as unknown as CreateShareDto)).resolves.toBeDefined();
  });
});
