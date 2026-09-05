/**
 * society-payload-builder.service.spec.ts
 *
 * Fase 5 / C6: buildWorkPayload()/buildRecordingPayload() só incluem shares
 * elegíveis para registro (share_type IS NULL, não soft-deleted); shares
 * financeiras/pendentes nunca entram no payload de submissão à sociedade.
 * shareToParty() lança BadRequestException para dado de registro incompleto
 * em vez de silenciosamente virar '' ou 0.
 */
import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SocietyPayloadBuilderService } from './society-payload-builder.service';
import { WorkEntity, PhonogramEntity, ShareEntity, ExternalIdentifierEntity } from '../../../database/entities';

function makeRepo(rows: Record<string, unknown>[]) {
  return {
    findOne: jest.fn(async (opts: { where: Record<string, unknown> }) =>
      rows.find((r) => r['id'] === opts.where['id']) ?? null),
    find: jest.fn(async () => rows),
  };
}

function makeDs(opts: {
  works?: Record<string, unknown>[];
  phonograms?: Record<string, unknown>[];
  shares?: Record<string, unknown>[];
  identifiers?: Record<string, unknown>[];
}) {
  const worksRepo = makeRepo(opts.works ?? []);
  const phonogramsRepo = makeRepo(opts.phonograms ?? []);
  const sharesRepo = makeRepo(opts.shares ?? []);
  const identifiersRepo = makeRepo(opts.identifiers ?? []);
  const map = new Map<unknown, unknown>([
    [WorkEntity, worksRepo],
    [PhonogramEntity, phonogramsRepo],
    [ShareEntity, sharesRepo],
    [ExternalIdentifierEntity, identifiersRepo],
  ]);
  return { getRepository: jest.fn((e: unknown) => map.get(e)) } as never;
}

const baseWork = { id: 'w1', tenant_id: 't1', title: 'Obra', deleted_at: null, alternative_titles: [], ai_tools: [], ai_prompts: [] };

describe('SocietyPayloadBuilderService.buildWorkPayload — elegibilidade de shares (Fase 5 / C6)', () => {
  it('inclui uma share elegível (share_type null, não deletada) no payload', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({
      works: [baseWork],
      shares: [{ id: 's1', share_type: null, deleted_at: null, titular_nome: 'Autor A', percentual: '100', papel: 'autor' }],
    }));
    const payload = await svc.buildWorkPayload('t1', 'w1');
    expect(payload.splits).toHaveLength(1);
    expect(payload.splits[0].name).toBe('Autor A');
  });

  it('exclui uma share financeira/pendente (share_type preenchido) do payload', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({
      works: [baseWork],
      shares: [{ id: 's1', share_type: 'pendente', deleted_at: null, titular_nome: 'Financeiro', percentual: '100', papel: 'autor' }],
    }));
    const payload = await svc.buildWorkPayload('t1', 'w1');
    expect(payload.splits).toHaveLength(0);
  });

  it('exclui uma share soft-deleted mesmo com share_type null', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({
      works: [baseWork],
      shares: [{ id: 's1', share_type: null, deleted_at: new Date(), titular_nome: 'X', percentual: '100', papel: 'autor' }],
    }));
    const payload = await svc.buildWorkPayload('t1', 'w1');
    expect(payload.splits).toHaveLength(0);
  });

  it('conjunto misto: preserva apenas as shares elegíveis, com percentuais corretos', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({
      works: [baseWork],
      shares: [
        { id: 's1', share_type: null, deleted_at: null, titular_nome: 'A', percentual: '60', papel: 'autor' },
        { id: 's2', share_type: 'pendente', deleted_at: null, titular_nome: 'Financeiro', percentual: '999', papel: 'autor' },
        { id: 's3', share_type: null, deleted_at: null, titular_nome: 'B', percentual: '40', papel: 'autor' },
      ],
    }));
    const payload = await svc.buildWorkPayload('t1', 'w1');
    expect(payload.splits.map((p) => p.name).sort()).toEqual(['A', 'B']);
    expect(payload.splits.reduce((sum, p) => sum + (p.percentage ?? 0), 0)).toBe(100);
  });

  it('lança BadRequestException quando uma share elegível está sem titular_nome (dado de registro incompleto)', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({
      works: [baseWork],
      shares: [{ id: 's1', share_type: null, deleted_at: null, titular_nome: null, credited_name: null, percentual: '100', papel: 'autor' }],
    }));
    await expect(svc.buildWorkPayload('t1', 'w1')).rejects.toThrow(BadRequestException);
  });

  it('lança BadRequestException quando uma share elegível está sem percentual (não coage para 0)', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({
      works: [baseWork],
      shares: [{ id: 's1', share_type: null, deleted_at: null, titular_nome: 'A', percentual: null, papel: 'autor' }],
    }));
    await expect(svc.buildWorkPayload('t1', 'w1')).rejects.toThrow(BadRequestException);
  });

  it('lança NotFoundException quando a obra não existe/foi deletada', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({ works: [] }));
    await expect(svc.buildWorkPayload('t1', 'inexistente')).rejects.toThrow(NotFoundException);
  });
});

describe('SocietyPayloadBuilderService.buildRecordingPayload — elegibilidade de shares (Fase 5 / C6)', () => {
  const baseRec = { id: 'r1', tenant_id: 't1', title: 'Faixa', deleted_at: null };

  it('contributors só inclui shares elegíveis', async () => {
    const svc = new SocietyPayloadBuilderService(makeDs({
      phonograms: [baseRec],
      shares: [
        { id: 's1', share_type: null, deleted_at: null, titular_nome: 'Intérprete', percentual: '100', papel: 'interprete' },
        { id: 's2', share_type: 'pendente', deleted_at: null, titular_nome: 'Financeiro', percentual: '100', papel: 'autor' },
      ],
    }));
    const payload = await svc.buildRecordingPayload('t1', 'r1');
    expect(payload.contributors).toHaveLength(1);
    expect(payload.contributors[0].name).toBe('Intérprete');
  });
});
