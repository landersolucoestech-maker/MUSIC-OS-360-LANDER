/**
 * contracts.service.spec.ts
 *
 * Cobre exclusivamente o pré-requisito de C1 (não relacionado a aliases
 * EN/PT): persistência de template_id/signers (colunas da migration
 * 20260712000004, já commitada) e o default `tipo = 'outro'` quando o
 * wizard cria um contrato sem tipo de serviço definido. Nenhum teste aqui
 * cobre resolução de aliases — isso pertence ao commit C1 propriamente dito.
 */
import 'reflect-metadata';
import { ContractsService } from './contracts.service';
import type { CreateContractDto } from './dto/create-contract.dto';

function makeRepo() {
  return {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn(async (entity: unknown) => ({ id: 'contract-new', ...(entity as object) })),
  };
}

function makeService(repo = makeRepo()) {
  const ds = { getRepository: jest.fn(() => repo) } as never;
  const workflowService = {} as never;
  const events = { emitTyped: jest.fn() } as never;
  const planLimit = { enforce: jest.fn(async () => undefined) } as never;
  const svc = new ContractsService(ds, workflowService, events, planLimit);
  return { svc, repo };
}

function created(repo: ReturnType<typeof makeRepo>) {
  return (repo.create as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
}

describe('ContractsService.create — template_id/signers/tipo default (pré-requisito C1)', () => {
  it('persiste template_id quando enviado', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao', template_id: '11111111-1111-4111-8111-111111111111',
    } as unknown as CreateContractDto);

    expect(created(repo)['template_id']).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('persiste signers quando enviado como array', async () => {
    const { svc, repo } = makeService();
    const signers = [{ name: 'Fulano', email: 'fulano@example.com', role: 'artista' }];
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao', signers,
    } as unknown as CreateContractDto);

    expect(created(repo)['signers']).toEqual(signers);
  });

  it('não persiste signers quando não é um array', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao', signers: 'not-an-array' as unknown as unknown[],
    } as unknown as CreateContractDto);

    expect(created(repo)['signers']).toBeUndefined();
  });

  it('REM-02: persiste documentos (anexos reais do R2) quando enviado', async () => {
    const { svc, repo } = makeService();
    const documentos = [{ name: 'contrato.pdf', size: 1234, type: 'application/pdf', path: 'https://r2/x.pdf', url: 'https://r2/x.pdf' }];
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao', documentos,
    } as unknown as CreateContractDto);

    expect(created(repo)['documentos']).toEqual(documentos);
  });

  it('REM-02: documentos ausente persiste como array vazio (mesmo padrão de versoes)', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao',
    } as unknown as CreateContractDto);

    expect(created(repo)['documentos']).toEqual([]);
  });

  it('aplica tipo="outro" quando nem tipo nem type são enviados (fluxo do wizard sem template)', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato sem tipo definido',
    } as unknown as CreateContractDto);

    expect(created(repo)['tipo']).toBe('outro');
  });

  it('preserva o tipo enviado quando presente (não aplica o default)', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao',
    } as unknown as CreateContractDto);

    expect(created(repo)['tipo']).toBe('gravacao');
  });

  it('template_id ausente não é persistido (filtro final remove null/undefined)', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao',
    } as unknown as CreateContractDto);

    expect(created(repo)['template_id']).toBeUndefined();
  });
});

// ── Fase 5 / C1: consolidação de aliases (novos testes; helpers próprios,
//    não reutilizam makeRepo/makeService acima para não alterar o pré-requisito) ──

import { NotFoundException } from '@nestjs/common';
import type { UpdateContractDto } from './dto/update-contract.dto';
import type { QueryContractDto } from './dto/query-contract.dto';
import { Logger } from '@nestjs/common';

function makeQb(rows: Record<string, unknown>[]) {
  const qb: Record<string, jest.Mock> = {};
  const chain = () => qb;
  qb['leftJoinAndMapOne'] = jest.fn(chain);
  qb['where'] = jest.fn(chain);
  qb['andWhere'] = jest.fn(chain);
  qb['orderBy'] = jest.fn(chain);
  qb['skip'] = jest.fn(chain);
  qb['take'] = jest.fn(chain);
  qb['getOne'] = jest.fn(async () => rows[0] ?? null);
  qb['getManyAndCount'] = jest.fn(async () => [rows, rows.length]);
  return qb;
}

function makeRepoC1(findRows: Record<string, unknown>[] = []) {
  const qb = makeQb(findRows);
  return {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn(async (entity: unknown) => ({ id: 'contract-new', ...(entity as object) })),
    update: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(() => qb),
    _qb: qb,
  };
}

function makeServiceC1(findRows: Record<string, unknown>[] = []) {
  const repo = makeRepoC1(findRows);
  const ds = { getRepository: jest.fn(() => repo) } as never;
  const workflowService = { getAllowedTransitions: jest.fn(() => []) } as never;
  const events = { emitTyped: jest.fn() } as never;
  const planLimit = { enforce: jest.fn(async () => undefined) } as never;
  const svc = new ContractsService(ds, workflowService, events, planLimit);
  return { svc, repo };
}

function createdC1(repo: ReturnType<typeof makeRepoC1>) {
  return (repo.create as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
}

function updatedC1(repo: ReturnType<typeof makeRepoC1>) {
  return (repo.update as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
}

const baseContractRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'contract-1',
  tenant_id: 'tenant-1',
  titulo: 'Contrato existente',
  tipo: 'gravacao',
  status: 'rascunho',
  artista_id: null,
  cliente_id: null,
  valor: null,
  data_inicio: null,
  data_fim: null,
  arquivo_url: null,
  metadata: {},
  ...overrides,
});

describe('ContractsService.create — consolidação de aliases (Fase 5 / C1)', () => {
  it('payload PT canônico persiste somente chaves canônicas', async () => {
    const { svc, repo } = makeServiceC1();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'Contrato X', tipo: 'gravacao', artista_id: '11111111-1111-4111-8111-111111111111',
      data_inicio: '2026-01-01T00:00:00.000Z', arquivo_url: 'https://a.com/x.pdf', valor: 10,
    } as unknown as CreateContractDto);

    const row = createdC1(repo);
    expect(row['titulo']).toBe('Contrato X');
    expect(row['tipo']).toBe('gravacao');
    expect(row['artista_id']).toBe('11111111-1111-4111-8111-111111111111');
    expect(row['valor']).toBe('10');
    expect(row['title']).toBeUndefined();
    expect(row['type']).toBeUndefined();
    expect(row['artistId']).toBeUndefined();
    expect(row['value']).toBeUndefined();
  });

  it('payload só com aliases EN é traduzido para as colunas canônicas', async () => {
    const { svc, repo } = makeServiceC1();
    await svc.create('tenant-1', 'user-1', {
      title: 'Contrato EN', type: 'recording', value: '10',
    } as unknown as CreateContractDto);

    const row = createdC1(repo);
    expect(row['titulo']).toBe('Contrato EN');
    expect(row['tipo']).toBe('recording');
    expect(row['valor']).toBe('10');
    expect(row['title']).toBeUndefined();
    expect(row['type']).toBeUndefined();
    expect(row['value']).toBeUndefined();
  });

  it('uso de alias emite exatamente um warning por alias', async () => {
    const { svc } = makeServiceC1();
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await svc.create('tenant-1', 'user-1', {
      title: 'Contrato EN', type: 'recording',
    } as unknown as CreateContractDto);

    const messages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(messages.filter((m) => m.includes('alias=title'))).toHaveLength(1);
    expect(messages.filter((m) => m.includes('alias=type'))).toHaveLength(1);
    expect(messages.some((m) => m.includes('operation=create'))).toBe(true);
    expect(messages.some((m) => m.includes('tenantId=tenant-1'))).toBe(true);
    warnSpy.mockRestore();
  });

  it('conflito PT/EN rejeita antes de chamar o repository', async () => {
    const { svc, repo } = makeServiceC1();
    await expect(svc.create('tenant-1', 'user-1', {
      titulo: 'A', title: 'B',
    } as unknown as CreateContractDto)).rejects.toMatchObject({ response: { code: 'CONTRACT_ALIAS_CONFLICT' } });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('título ausente (nem titulo nem title) rejeita antes do repository', async () => {
    const { svc, repo } = makeServiceC1();
    await expect(svc.create('tenant-1', 'user-1', {
      tipo: 'gravacao',
    } as unknown as CreateContractDto)).rejects.toMatchObject({ response: { code: 'CONTRACT_TITLE_REQUIRED' } });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('título null/vazio/whitespace rejeita antes do repository', async () => {
    const { svc, repo } = makeServiceC1();
    await expect(svc.create('tenant-1', 'user-1', { titulo: null } as unknown as CreateContractDto))
      .rejects.toMatchObject({ response: { code: 'CONTRACT_TITLE_INVALID' } });
    await expect(svc.create('tenant-1', 'user-1', { titulo: '' } as unknown as CreateContractDto))
      .rejects.toMatchObject({ response: { code: 'CONTRACT_TITLE_INVALID' } });
    await expect(svc.create('tenant-1', 'user-1', { titulo: '   ' } as unknown as CreateContractDto))
      .rejects.toMatchObject({ response: { code: 'CONTRACT_TITLE_INVALID' } });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('tipo ausente aplica default "outro" (já coberto no pré-requisito; reconfirmado após a integração com o resolver)', async () => {
    const { svc, repo } = makeServiceC1();
    await svc.create('tenant-1', 'user-1', { titulo: 'X' } as unknown as CreateContractDto);
    expect(createdC1(repo)['tipo']).toBe('outro');
  });

  it('valor zero é preservado (não tratado como ausente)', async () => {
    const { svc, repo } = makeServiceC1();
    await svc.create('tenant-1', 'user-1', { titulo: 'X', valor: 0 } as unknown as CreateContractDto);
    expect(createdC1(repo)['valor']).toBe('0');
  });

  it('metadata/currency/signedAt/parties permanecem com comportamento inalterado (fora do escopo do C1)', async () => {
    const { svc, repo } = makeServiceC1();
    await svc.create('tenant-1', 'user-1', {
      titulo: 'X', currency: 'USD', signedAt: '2026-01-01T00:00:00.000Z', parties: [{ nome: 'A' }],
    } as unknown as CreateContractDto);

    const row = createdC1(repo);
    expect((row['metadata'] as Record<string, unknown>)['currency']).toBe('USD');
    expect((row['metadata'] as Record<string, unknown>)['signed_at']).toBe('2026-01-01T00:00:00.000Z');
    expect((row['metadata'] as Record<string, unknown>)['parties']).toEqual([{ nome: 'A' }]);
  });
});

describe('ContractsService.update — consolidação de aliases (Fase 5 / C1)', () => {
  it('PATCH parcial (só um campo não-alias) é preservado', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.update('tenant-1', 'user-1', 'contract-1', { observacoes: 'nova nota' } as unknown as UpdateContractDto);

    const row = updatedC1(repo);
    expect(row['observacoes']).toBe('nova nota');
    expect(row['titulo']).toBeUndefined();
  });

  it('null isolado em campo opcional não altera a coluna (comportamento atual preservado)', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.update('tenant-1', 'user-1', 'contract-1', { arquivo_url: null } as unknown as UpdateContractDto);

    const row = updatedC1(repo);
    expect(row['arquivo_url']).toBeUndefined();
  });

  it('alias legado isolado é traduzido', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.update('tenant-1', 'user-1', 'contract-1', { fileUrl: 'https://a.com/x.pdf' } as unknown as UpdateContractDto);

    const row = updatedC1(repo);
    expect(row['arquivo_url']).toBe('https://a.com/x.pdf');
    expect(row['fileUrl']).toBeUndefined();
  });

  it('uso de alias em update emite warning com operation=update e contractId', async () => {
    const { svc } = makeServiceC1([baseContractRow()]);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await svc.update('tenant-1', 'user-1', 'contract-1', { fileUrl: 'https://a.com/x.pdf' } as unknown as UpdateContractDto);

    const messages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(messages.some((m) => m.includes('alias=fileUrl') && m.includes('operation=update') && m.includes('contractId=contract-1'))).toBe(true);
    warnSpy.mockRestore();
  });

  it('conflito PT/EN em update rejeita antes de chamar o repository', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await expect(svc.update('tenant-1', 'user-1', 'contract-1', {
      arquivo_url: 'https://a.com/1.pdf', fileUrl: 'https://a.com/2.pdf',
    } as unknown as UpdateContractDto)).rejects.toMatchObject({ response: { code: 'CONTRACT_ALIAS_CONFLICT' } });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('título inválido em update (vazio) rejeita', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await expect(svc.update('tenant-1', 'user-1', 'contract-1', { titulo: '' } as unknown as UpdateContractDto))
      .rejects.toMatchObject({ response: { code: 'CONTRACT_TITLE_INVALID' } });
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('update sem tipo/type enviados NÃO aplica default "outro"', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.update('tenant-1', 'user-1', 'contract-1', { observacoes: 'x' } as unknown as UpdateContractDto);

    expect(updatedC1(repo)['tipo']).toBeUndefined();
  });

  it('repository não é chamado quando a validação falha', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await expect(svc.update('tenant-1', 'user-1', 'contract-1', { titulo: null } as unknown as UpdateContractDto)).rejects.toThrow();
    expect(repo.update).not.toHaveBeenCalled();
  });
});

describe('ContractsService.list — filtros canônicos e legados (Fase 5 / C1)', () => {
  it('filtra por tipo canônico', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.list('tenant-1', { tipo: 'gravacao' } as unknown as QueryContractDto);
    expect(repo._qb['andWhere']).toHaveBeenCalledWith('c.tipo = :tipo', { tipo: 'gravacao' });
  });

  it('filtra por type legado (traduzido para tipo)', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.list('tenant-1', { type: 'gravacao' } as unknown as QueryContractDto);
    expect(repo._qb['andWhere']).toHaveBeenCalledWith('c.tipo = :tipo', { tipo: 'gravacao' });
  });

  it('tipo e type equivalentes são aceitos', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.list('tenant-1', { tipo: 'gravacao', type: 'gravacao' } as unknown as QueryContractDto);
    expect(repo._qb['andWhere']).toHaveBeenCalledWith('c.tipo = :tipo', { tipo: 'gravacao' });
  });

  it('tipo e type conflitantes rejeitam antes de montar a query', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await expect(svc.list('tenant-1', { tipo: 'gravacao', type: 'edicao' } as unknown as QueryContractDto))
      .rejects.toMatchObject({ response: { code: 'CONTRACT_ALIAS_CONFLICT' } });
    expect(repo._qb['getManyAndCount']).not.toHaveBeenCalled();
  });

  it('filtra por artista_id canônico', async () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.list('tenant-1', { artista_id: uuid } as unknown as QueryContractDto);
    expect(repo._qb['andWhere']).toHaveBeenCalledWith('c.artista_id = :artistaId', { artistaId: uuid });
  });

  it('filtra por artistId legado', async () => {
    const uuid = '11111111-1111-4111-8111-111111111111';
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.list('tenant-1', { artistId: uuid } as unknown as QueryContractDto);
    expect(repo._qb['andWhere']).toHaveBeenCalledWith('c.artista_id = :artistaId', { artistaId: uuid });
  });

  it('artista_id e artistId conflitantes rejeitam', async () => {
    const { svc } = makeServiceC1([baseContractRow()]);
    await expect(svc.list('tenant-1', {
      artista_id: '11111111-1111-4111-8111-111111111111', artistId: '22222222-2222-4222-8222-222222222222',
    } as unknown as QueryContractDto)).rejects.toMatchObject({ response: { code: 'CONTRACT_ALIAS_CONFLICT' } });
  });

  it('query builder nunca recebe os nomes EN como parâmetro', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.list('tenant-1', { type: 'gravacao' } as unknown as QueryContractDto);
    const calls = (repo._qb['andWhere'] as jest.Mock).mock.calls;
    expect(calls.some(([sql]) => String(sql).includes('type'))).toBe(false);
    expect(calls.some(([, params]) => params && 'type' in params)).toBe(false);
  });

  it('emite warning ao usar filtro legado', async () => {
    const { svc } = makeServiceC1([baseContractRow()]);
    const warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    await svc.list('tenant-1', { type: 'gravacao' } as unknown as QueryContractDto);
    expect(warnSpy.mock.calls.some((c) => String(c[0]).includes('alias=type') && String(c[0]).includes('operation=list'))).toBe(true);
    warnSpy.mockRestore();
  });

  it('ausência de tipo/artista_id não adiciona filtro nenhum', async () => {
    const { svc, repo } = makeServiceC1([baseContractRow()]);
    await svc.list('tenant-1', {} as unknown as QueryContractDto);
    const calls = (repo._qb['andWhere'] as jest.Mock).mock.calls;
    expect(calls.some(([sql]) => String(sql).includes('c.tipo'))).toBe(false);
    expect(calls.some(([sql]) => String(sql).includes('c.artista_id'))).toBe(false);
  });
});

describe('ContractsService.findById — não afetado pelo C1 (regressão)', () => {
  it('continua lançando NotFoundException quando o contrato não existe', async () => {
    const { svc } = makeServiceC1([]);
    await expect(svc.findById('tenant-1', 'inexistente')).rejects.toThrow(NotFoundException);
  });
});
