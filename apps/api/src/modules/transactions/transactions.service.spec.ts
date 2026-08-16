import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { DATA_SOURCE } from '../../database/database.module';
import { TransactionEntity } from '../../database/entities';

/**
 * Task J — fase de continuidade (concurrent writes / stale-lost updates).
 * update()/patch() antes sobrescreviam incondicionalmente (repo.update sem
 * checar version/updated_at) — dois usuários editando a mesma transação em
 * paralelo perdiam a edição de um deles silenciosamente. Agora, quando o
 * chamador manda `expectedUpdatedAt`, o UPDATE só aplica se `updated_at` no
 * banco ainda for exatamente esse valor (CAS via coluna já existente, sem
 * migração); 0 linhas afetadas -> 409, nunca sobrescreve silenciosamente.
 * Sem `expectedUpdatedAt`, o comportamento é idêntico ao anterior
 * (compatibilidade retroativa).
 */

const TENANT = 'tenant-test';
const TX_ID  = 'tx-test';
const NOW    = new Date('2026-08-14T12:00:00.000Z');

const mockTx = {
  id: TX_ID,
  tenant_id: TENANT,
  tipo: 'receita',
  categoria: 'outros',
  status: 'pendente',
  valor: '100',
  metadata: {},
  deleted_at: null,
  updated_at: NOW,
} as unknown as TransactionEntity;

function buildMockDs(updateResult: { affected: number } = { affected: 1 }) {
  const qb: any = {
    where: jest.fn(),
    andWhere: jest.fn(),
    getOne: jest.fn().mockResolvedValue(mockTx),
  };
  qb.where.mockReturnValue(qb);
  qb.andWhere.mockReturnValue(qb);

  const repo = {
    createQueryBuilder: jest.fn(() => qb),
    update: jest.fn().mockResolvedValue(updateResult),
  };
  return { getRepository: jest.fn(() => repo), _repo: repo, _qb: qb };
}

describe('TransactionsService — concorrência otimista em update/patch', () => {
  let service: TransactionsService;
  let mockDs: ReturnType<typeof buildMockDs>;

  async function buildService(updateResult?: { affected: number }) {
    mockDs = buildMockDs(updateResult);
    const module = await Test.createTestingModule({
      providers: [
        TransactionsService,
        { provide: DATA_SOURCE, useValue: mockDs },
      ],
    }).compile();
    return module.get<TransactionsService>(TransactionsService);
  }

  it('sem expectedUpdatedAt: aplica update incondicional (compatibilidade retroativa)', async () => {
    service = await buildService({ affected: 1 });
    await service.patch(TENANT, 'u1', TX_ID, { descricao: 'Nova descrição' } as any);

    expect(mockDs._repo.update).toHaveBeenCalledWith(
      { id: TX_ID, tenant_id: TENANT },
      expect.objectContaining({ descricao: 'Nova descrição' }),
    );
  });

  it('com expectedUpdatedAt correto: inclui updated_at no critério e aplica normalmente', async () => {
    service = await buildService({ affected: 1 });
    await service.patch(TENANT, 'u1', TX_ID, {
      descricao: 'Editado',
      expectedUpdatedAt: NOW.toISOString(),
    } as any);

    expect(mockDs._repo.update).toHaveBeenCalledWith(
      { id: TX_ID, tenant_id: TENANT, updated_at: NOW },
      expect.objectContaining({ descricao: 'Editado' }),
    );
  });

  it('com expectedUpdatedAt desatualizado (0 linhas afetadas): lança ConflictException (409), não sobrescreve', async () => {
    service = await buildService({ affected: 0 });
    await expect(
      service.patch(TENANT, 'u1', TX_ID, {
        descricao: 'Tentativa concorrente',
        expectedUpdatedAt: new Date('2026-08-14T11:00:00.000Z').toISOString(),
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('mesma proteção se aplica a update() (PUT), não só patch()', async () => {
    service = await buildService({ affected: 0 });
    await expect(
      service.update(TENANT, 'u1', TX_ID, {
        tipoTransacao: 'receita',
        expectedUpdatedAt: new Date('2026-08-14T11:00:00.000Z').toISOString(),
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('expectedUpdatedAt com formato inválido: 400, não 500 nem silêncio', async () => {
    service = await buildService({ affected: 1 });
    await expect(
      service.patch(TENANT, 'u1', TX_ID, {
        descricao: 'x',
        expectedUpdatedAt: 'not-a-date',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});

/**
 * Task W — auto-categorização por palavra-chave na criação de transações.
 * Cobre o único ponto de criação real usado tanto pelo formulário manual
 * quanto pela importação OFX (ambos chamam create() com o mesmo contrato).
 */
describe('TransactionsService.create — auto-categorização por regras (Task W)', () => {
  function buildCreateDs() {
    const savedEntities: any[] = [];
    const repo = {
      create: jest.fn((data: unknown) => data),
      save: jest.fn(async (data: any) => {
        const saved = { ...data, id: `tx-${savedEntities.length + 1}` };
        savedEntities.push(saved);
        return saved;
      }),
    };
    return { getRepository: jest.fn(() => repo), _repo: repo, _saved: savedEntities };
  }

  function buildServiceWithMatcher(suggestion: { categoryId: string; categorySlug: string; ruleId: string } | null | Error) {
    const mockDs = buildCreateDs();
    const suggestFn = jest.fn(async () => {
      if (suggestion instanceof Error) throw suggestion;
      return suggestion;
    });
    const financeCategoryRules = { suggestCategoryForTransaction: suggestFn } as any;
    const service = new TransactionsService(mockDs as any, undefined as any, undefined as any, financeCategoryRules);
    return { service, mockDs, suggestFn };
  }

  it('categoria explícita e real: NUNCA aciona o matcher, categoria preservada', async () => {
    const { service, mockDs, suggestFn } = await buildServiceWithMatcher(null);

    const saved = await service.create(TENANT, 'u1', {
      tipoTransacao: 'despesa', descricao: 'Pagamento Spotify', categoria: 'marketing', valor: '50',
    } as any);

    expect(saved.categoria).toBe('marketing');
    expect(suggestFn).not.toHaveBeenCalled();
    expect(mockDs._repo.save).toHaveBeenCalled();
  });

  it("categoria 'outros' + regra correspondente: aplica a categoria sugerida", async () => {
    const { service } = await buildServiceWithMatcher({ categoryId: 'cat-1', categorySlug: 'streaming', ruleId: 'rule-1' });

    const saved = await service.create(TENANT, 'u1', {
      tipoTransacao: 'despesa', descricao: 'Pagamento Spotify mensal', categoria: 'outros', valor: '50',
    } as any);

    expect(saved.categoria).toBe('streaming');
  });

  it("categoria ausente (default 'outros') + regra correspondente: aplica a categoria sugerida", async () => {
    const { service } = await buildServiceWithMatcher({ categoryId: 'cat-2', categorySlug: 'servicos', ruleId: 'rule-2' });

    const saved = await service.create(TENANT, 'u1', {
      tipoTransacao: 'receita', descricao: 'Recebimento de show', valor: '500',
    } as any);

    expect(saved.categoria).toBe('servicos');
  });

  it("categoria 'outros' sem nenhuma regra correspondente: mantém 'outros'", async () => {
    const { service, suggestFn } = await buildServiceWithMatcher(null);

    const saved = await service.create(TENANT, 'u1', {
      tipoTransacao: 'despesa', descricao: 'Compra qualquer', categoria: 'outros', valor: '20',
    } as any);

    expect(saved.categoria).toBe('outros');
    expect(suggestFn).toHaveBeenCalledWith(TENANT, 'DESPESA', 'Compra qualquer');
  });

  it('nunca cruza tenant: passa exatamente o tenantId do chamador ao matcher', async () => {
    const { service, suggestFn } = await buildServiceWithMatcher({ categoryId: 'c', categorySlug: 's', ruleId: 'r' });
    const otherTenant = 'tenant-other';

    await service.create(otherTenant, 'u1', {
      tipoTransacao: 'despesa', descricao: 'Pagamento Spotify', categoria: 'outros', valor: '10',
    } as any);

    expect(suggestFn).toHaveBeenCalledWith(otherTenant, 'DESPESA', 'Pagamento Spotify');
  });

  it('tipo transferencia: nunca aciona o matcher (finance-category-rules só cobre RECEITA/DESPESA)', async () => {
    const { service, suggestFn } = await buildServiceWithMatcher({ categoryId: 'c', categorySlug: 's', ruleId: 'r' });

    const saved = await service.create(TENANT, 'u1', {
      tipoTransacao: 'transferencia', descricao: 'Transferência entre contas', categoria: 'outros', valor: '10',
    } as any);

    expect(suggestFn).not.toHaveBeenCalled();
    expect(saved.categoria).toBe('outros');
  });

  it('matcher indisponível/erro: não bloqueia a criação, cai para outros', async () => {
    const { service } = await buildServiceWithMatcher(new Error('finance-category-rules DB down'));

    const saved = await service.create(TENANT, 'u1', {
      tipoTransacao: 'despesa', descricao: 'Pagamento Spotify', categoria: 'outros', valor: '10',
    } as any);

    expect(saved.categoria).toBe('outros');
  });

  it('importação em lote (múltiplas transações OFX em sequência): cada uma é categorizada de forma independente e determinística', async () => {
    const mockDs = buildCreateDs();
    const suggestFn = jest.fn(async (_tenant: string, _type: string, descricao: string) => {
      if (descricao.toLowerCase().includes('spotify')) return { categoryId: 'cat-1', categorySlug: 'streaming', ruleId: 'r1' };
      if (descricao.toLowerCase().includes('uber')) return { categoryId: 'cat-2', categorySlug: 'transporte', ruleId: 'r2' };
      return null;
    });
    const financeCategoryRules = { suggestCategoryForTransaction: suggestFn } as any;
    const service = new TransactionsService(mockDs as any, undefined as any, undefined as any, financeCategoryRules);

    const ofxRows = [
      { tipoTransacao: 'despesa', descricao: 'Pagamento Spotify', categoria: 'outros', valor: '20' },
      { tipoTransacao: 'despesa', descricao: 'Corrida Uber', categoria: 'outros', valor: '35' },
      { tipoTransacao: 'despesa', descricao: 'Padaria do bairro', categoria: 'outros', valor: '15' },
    ];

    const results = [];
    for (const row of ofxRows) {
      results.push(await service.create(TENANT, 'u1', row as any));
    }

    expect(results.map((r) => r.categoria)).toEqual(['streaming', 'transporte', 'outros']);
    expect(suggestFn).toHaveBeenCalledTimes(3);
  });

  it('matcher indisponível (não injetado, undefined): cria a transação normalmente com a categoria fornecida', async () => {
    const mockDs = buildCreateDs();
    const service = new TransactionsService(mockDs as any, undefined as any, undefined as any, undefined as any);

    const saved = await service.create(TENANT, 'u1', {
      tipoTransacao: 'despesa', descricao: 'Pagamento Spotify', categoria: 'outros', valor: '10',
    } as any);

    expect(saved.categoria).toBe('outros');
  });
});
