/**
 * shares.service.spec.ts
 *
 * Fase 5 / C6: prova que titular_nome/percentual (campos de titularidade —
 * submissão ABRAMUS/ECAD) nunca são derivados de detentor/artista_externo/
 * pagador/destinatario (campos do share financeiro — conceito distinto),
 * nem preenchidos com default artificial ('N/D' / 0). Testado no nível do
 * serviço — decorators class-validator NÃO rodam aqui (ver shares.dto.spec.ts
 * para a validação de payload via ValidationPipe).
 */
import 'reflect-metadata';
import { SharesService } from './shares.service';
import type { CreateShareDto, UpdateShareDto } from './dto/shares.dto';

function makeRepo() {
  return {
    create: jest.fn((data: unknown) => ({ ...(data as object) })),
    save: jest.fn(async (entity: unknown) => ({ id: 'share-new', ...(entity as object) })),
    update: jest.fn(async () => ({ affected: 1 })),
    createQueryBuilder: jest.fn(() => {
      const qb: Record<string, jest.Mock> = {};
      const chain = () => qb;
      qb['where'] = jest.fn(chain);
      qb['getOne'] = jest.fn(async () => ({ id: 'share-1', tenant_id: 'tenant-1' }));
      return qb;
    }),
  };
}

function makeService() {
  const repo = makeRepo();
  const ds = { getRepository: jest.fn(() => repo) } as never;
  const svc = new SharesService(ds);
  return { svc, repo };
}

function created(repo: ReturnType<typeof makeRepo>) {
  return (repo.create as jest.Mock).mock.calls[0][0] as Record<string, unknown>;
}

function updated(repo: ReturnType<typeof makeRepo>) {
  return (repo.update as jest.Mock).mock.calls[0][1] as Record<string, unknown>;
}

describe('SharesService.create — isolamento titular_nome/percentual (Fase 5 / C6)', () => {
  it('não popula titular_nome/percentual quando apenas campos financeiros são enviados', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', {
      detentor: 'João', artista_externo: 'Banda X', pagador: 'Gravadora Y', destinatario: 'Z',
      share_type: 'pendente', percentual: undefined,
    } as unknown as CreateShareDto);

    const row = created(repo);
    expect(row['titular_nome']).toBeUndefined();
    expect(row['percentual']).toBeUndefined();
    expect(row['detentor']).toBe('João');
  });

  it('nunca deriva titular_nome de detentor/artista_externo/pagador/destinatario', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', {
      detentor: 'D', artista_externo: 'AE', pagador: 'P', destinatario: 'DEST',
    } as unknown as CreateShareDto);

    const row = created(repo);
    expect(row['titular_nome']).not.toBe('D');
    expect(row['titular_nome']).not.toBe('AE');
    expect(row['titular_nome']).not.toBe('P');
    expect(row['titular_nome']).not.toBe('DEST');
    expect(row['titular_nome']).toBeUndefined();
  });

  it('nunca aplica default artificial ("N/D" ou 0) quando o campo está ausente', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', { detentor: 'João' } as unknown as CreateShareDto);

    const row = created(repo);
    expect(row['titular_nome']).not.toBe('N/D');
    expect(row['percentual']).not.toBe(0);
    expect(row['titular_nome']).toBeUndefined();
    expect(row['percentual']).toBeUndefined();
  });

  it('grava titular_nome/percentual quando holderName/percentage são enviados explicitamente', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', { holderName: 'Maria Autora', percentage: 50 } as unknown as CreateShareDto);

    const row = created(repo);
    expect(row['titular_nome']).toBe('Maria Autora');
    expect(row['percentual']).toBe(50);
  });

  it('persiste percentage: 0 explícito como 0, não como ausente', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', { holderName: 'Autor Zero', percentage: 0 } as unknown as CreateShareDto);

    const row = created(repo);
    expect(row['percentual']).toBe(0);
  });

  it('grava tenant_id no registro criado', async () => {
    const { svc, repo } = makeService();
    await svc.create('tenant-1', { holderName: 'X' } as unknown as CreateShareDto);
    expect(created(repo)['tenant_id']).toBe('tenant-1');
  });
});

describe('SharesService.update — patch parcial não contamina campos de registro (Fase 5 / C6)', () => {
  it('atualizar apenas campos financeiros nunca contamina titular_nome/percentual', async () => {
    const { svc, repo } = makeService();
    await svc.update('tenant-1', 'share-1', {
      detentor: 'Novo Detentor', pagador: 'Novo Pagador',
    } as unknown as UpdateShareDto);

    const row = updated(repo);
    expect(row['titular_nome']).toBeUndefined();
    expect(row['percentual']).toBeUndefined();
    expect(row['detentor']).toBe('Novo Detentor');
  });

  it('envio explícito de holderName: null limpa a coluna titular_nome (não é tratado como ausente)', async () => {
    const { svc, repo } = makeService();
    await svc.update('tenant-1', 'share-1', { holderName: null } as unknown as UpdateShareDto);

    const row = updated(repo);
    expect(row['titular_nome']).toBeNull();
  });

  it('envio explícito de percentage: null limpa a coluna percentual', async () => {
    const { svc, repo } = makeService();
    await svc.update('tenant-1', 'share-1', { percentage: null } as unknown as UpdateShareDto);

    const row = updated(repo);
    expect(row['percentual']).toBeNull();
  });

  it('patch parcial nunca restaura o antigo fallback (detentor não vira titular_nome mesmo em update)', async () => {
    const { svc, repo } = makeService();
    await svc.update('tenant-1', 'share-1', { detentor: 'Só Detentor' } as unknown as UpdateShareDto);

    const row = updated(repo);
    expect(row['titular_nome']).toBeUndefined();
  });
});
