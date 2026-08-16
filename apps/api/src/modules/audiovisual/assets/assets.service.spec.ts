import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { AudiovisualAssetsService } from './assets.service';
import { DATA_SOURCE } from '../../../database/database.tokens';
import { AudiovisualAssetEntity, AudiovisualProjectEntity } from '../../../database/entities';

/**
 * Task L — concorrência otimista aplicada à "cauda audiovisual" (assets,
 * production-days, shots, tasks, team-members — mesmo padrão de blind
 * overwrite confirmado na auditoria, corrigido com o mesmo casUpdate
 * genérico). Este spec cobre `assets` como representante do grupo — os
 * outros 4 seguem exatamente a mesma forma de correção.
 */
const TENANT = 'tenant-test';
const ASSET_ID = 'asset-test';
const NOW = new Date('2026-08-14T12:00:00.000Z');

const mockAsset = {
  id: ASSET_ID,
  tenant_id: TENANT,
  audiovisual_project_id: 'proj-1',
  name: 'Take 1',
  file_url: 'https://x/take1.mp4',
  deleted_at: null,
  updated_at: NOW,
} as unknown as AudiovisualAssetEntity;

function buildMockDs(updateResult: { affected: number } = { affected: 1 }) {
  const assetsRepo = {
    findOne: jest.fn().mockResolvedValue(mockAsset),
    update: jest.fn().mockResolvedValue(updateResult),
  };
  const projectsRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'proj-1', tenant_id: TENANT, deleted_at: null }),
  };
  return {
    getRepository: jest.fn((entity: unknown) =>
      entity === AudiovisualProjectEntity ? projectsRepo : assetsRepo),
    _assetsRepo: assetsRepo,
  };
}

describe('AudiovisualAssetsService — Task L concorrência otimista em update()', () => {
  let service: AudiovisualAssetsService;
  let mockDs: ReturnType<typeof buildMockDs>;

  async function buildService(updateResult?: { affected: number }) {
    mockDs = buildMockDs(updateResult);
    const module = await Test.createTestingModule({
      providers: [
        AudiovisualAssetsService,
        { provide: DATA_SOURCE, useValue: mockDs },
      ],
    }).compile();
    return module.get<AudiovisualAssetsService>(AudiovisualAssetsService);
  }

  it('sem expectedUpdatedAt: aplica incondicionalmente (retrocompatível)', async () => {
    service = await buildService({ affected: 1 });
    await service.update(TENANT, ASSET_ID, { name: 'Take 2' });
    expect(mockDs._assetsRepo.update).toHaveBeenCalledWith(
      { id: ASSET_ID, tenant_id: TENANT },
      expect.objectContaining({ name: 'Take 2' }),
    );
  });

  it('cenário A/B: A lê v.X, salva (v.Y); B tenta salvar contra v.X -> 409, nunca sobrescreve A em silêncio', async () => {
    service = await buildService({ affected: 0 });
    await expect(
      service.update(TENANT, ASSET_ID, {
        name: 'Edição de B',
        expectedUpdatedAt: NOW.toISOString(),
      } as never),
    ).rejects.toThrow(ConflictException);
    expect(mockDs._assetsRepo.update).toHaveBeenCalledTimes(1);
  });

  it('expectedUpdatedAt nunca vaza para a coluna persistida (não é um campo real da entidade)', async () => {
    service = await buildService({ affected: 1 });
    await service.update(TENANT, ASSET_ID, {
      name: 'x',
      expectedUpdatedAt: NOW.toISOString(),
    } as never);
    const [, payload] = mockDs._assetsRepo.update.mock.calls[0];
    expect(payload).not.toHaveProperty('expectedUpdatedAt');
  });

  it('expectedUpdatedAt malformado -> 400, não ignora silenciosamente', async () => {
    service = await buildService({ affected: 1 });
    await expect(
      service.update(TENANT, ASSET_ID, { name: 'x', expectedUpdatedAt: 'não-é-data' } as never),
    ).rejects.toThrow(BadRequestException);
  });

  it('asset inexistente continua 404 (comportamento pré-existente preservado)', async () => {
    service = await buildService();
    mockDs._assetsRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.update(TENANT, 'nao-existe', { name: 'x' })).rejects.toThrow(NotFoundException);
  });
});
