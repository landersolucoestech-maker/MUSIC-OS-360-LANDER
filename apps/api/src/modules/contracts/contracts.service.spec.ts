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
