/**
 * test/e2e/schema/schema-reconciliation.e2e-spec.ts  ·  FASE 2A
 *
 * Valida, contra PostgreSQL REAL, a reconciliação entity↔banco:
 *  - conversations.status/channel, conversation_messages.sender_type, forms.status
 *    mapeados como enum nativo (read + insert + update via repository TypeORM);
 *  - transactions.financial_category_id / financial_category_snapshot mapeados;
 *  - financial_categories.transaction_types lido/escrito como text[] (array).
 *
 * Todas as escritas ocorrem em transação com ROLLBACK — nada é persistido.
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource, QueryFailedError } from 'typeorm';
import {
  ALL_ENTITIES, ConversationEntity, ConversationMessageEntity,
  FormEntity, TransactionEntity, FinancialCategoryEntity, LeadEntity,
} from '../../../src/database/entities';

const TENANT = '10000000-0000-0000-0000-000000000002';

describe('Schema Fase 2A — enums + transactions (PostgreSQL real)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    const envPath = path.resolve(process.cwd(), '.env');
    const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const url = (envText.match(/^DATABASE_URL=(.+)$/m)?.[1] ?? process.env['DATABASE_URL'] ?? '')
      .trim().replace(/^["']|["']$/g, '');
    ds = await new DataSource({
      type: 'postgres', url, entities: ALL_ENTITIES, synchronize: false, logging: false, ssl: false,
    }).initialize();
  }, 30000);

  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });

  it('conversations + messages: enum status/channel/sender_type (insert/read/update via repo)', async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      const cRepo = qr.manager.getRepository(ConversationEntity);
      const conv = await cRepo.save(cRepo.create({ tenant_id: TENANT, subject: 'SMOKE', status: 'pending', channel: 'whatsapp' }));
      const read = await cRepo.findOneByOrFail({ id: conv.id });
      expect(read.status).toBe('pending');
      expect(read.channel).toBe('whatsapp');

      await cRepo.update({ id: conv.id }, { status: 'closed' });
      expect((await cRepo.findOneByOrFail({ id: conv.id })).status).toBe('closed');

      const mRepo = qr.manager.getRepository(ConversationMessageEntity);
      const msg = await mRepo.save(mRepo.create({ conversation_id: conv.id, tenant_id: TENANT, body: 'oi', sender_id: 'u1', sender_type: 'ai' }));
      expect((await mRepo.findOneByOrFail({ id: msg.id })).sender_type).toBe('ai');
    } finally { await qr.rollbackTransaction(); await qr.release(); }
  });

  it('conversations: valor fora do enum é REJEITADO pelo banco (validade garantida)', async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      const cRepo = qr.manager.getRepository(ConversationEntity);
      await expect(
        cRepo.save(cRepo.create({ tenant_id: TENANT, status: 'explodido' as never, channel: 'internal' })),
      ).rejects.toBeInstanceOf(QueryFailedError);
    } finally { await qr.rollbackTransaction().catch(() => undefined); await qr.release(); }
  });

  it('forms: enum status (insert/read/update via repo)', async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      const fRepo = qr.manager.getRepository(FormEntity);
      const form = await fRepo.save(fRepo.create({ tenant_id: TENANT, name: 'SMOKE form', status: 'active' }));
      expect((await fRepo.findOneByOrFail({ id: form.id })).status).toBe('active');
      await fRepo.update({ id: form.id }, { status: 'archived' });
      expect((await fRepo.findOneByOrFail({ id: form.id })).status).toBe('archived');
    } finally { await qr.rollbackTransaction(); await qr.release(); }
  });

  it('transactions: financial_category_id + financial_category_snapshot mapeados (insert/read)', async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      const tRepo = qr.manager.getRepository(TransactionEntity);
      const snap = { name: 'Royalties', code: 'ROY', path: 'receita.royalties' };
      const catId = '00000000-0000-4000-8000-0000000000fc';
      const tx = await tRepo.save(tRepo.create({
        tenant_id: TENANT, tipo: 'receita' as never, categoria: 'royalties', valor: '1000.00',
        data: new Date(), financial_category_id: catId, financial_category_snapshot: snap,
      }));
      const read = await tRepo.findOneByOrFail({ id: tx.id });
      expect(read.financial_category_id).toBe(catId);
      expect(read.financial_category_snapshot).toMatchObject(snap);

      // snapshot default '{}' quando não informado (NOT NULL no banco)
      const tx2 = await tRepo.save(tRepo.create({
        tenant_id: TENANT, tipo: 'despesa' as never, categoria: 'x', valor: '1.00', data: new Date(),
      }));
      const read2 = await tRepo.findOneByOrFail({ id: tx2.id });
      expect(read2.financial_category_snapshot).toEqual({});
      expect(read2.financial_category_id).toBeNull();
    } finally { await qr.rollbackTransaction(); await qr.release(); }
  });

  it('financial_categories.transaction_types: text[] (insert/read como array)', async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      const fcRepo = qr.manager.getRepository(FinancialCategoryEntity);
      const cat = await fcRepo.save(fcRepo.create({
        tenant_id: TENANT, path: 'smoke', name: 'Smoke', slug: 'smoke-2a', code: 'SMK2A',
        transaction_types: ['REVENUE', 'EXPENSE'],
      }));
      const read = await fcRepo.findOneByOrFail({ id: cat.id });
      expect(Array.isArray(read.transaction_types)).toBe(true);
      expect(read.transaction_types).toEqual(['REVENUE', 'EXPENSE']);
    } finally { await qr.rollbackTransaction(); await qr.release(); }
  });
});

describe('Schema Fase 2B — leads reconciliação entity↔banco (PostgreSQL real)', () => {
  let ds: DataSource;

  beforeAll(async () => {
    const envPath = path.resolve(process.cwd(), '.env');
    const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const url = (envText.match(/^DATABASE_URL=(.+)$/m)?.[1] ?? process.env['DATABASE_URL'] ?? '')
      .trim().replace(/^["']|["']$/g, '');
    ds = await new DataSource({
      type: 'postgres', url, entities: ALL_ENTITIES, synchronize: false, logging: false, ssl: false,
    }).initialize();
  }, 30000);

  afterAll(async () => { if (ds?.isInitialized) await ds.destroy(); });

  it('SELECT via repositório seleciona TODAS as colunas mapeadas (pipeline_stage não quebra)', async () => {
    // Antes da reconciliação, qualquer getMany/getOne quebrava: "column l.pipeline_stage does not exist".
    const repo = ds.getRepository(LeadEntity);
    await expect(
      repo.createQueryBuilder('l').where('l.deleted_at IS NULL').limit(1).getMany(),
    ).resolves.toBeDefined();
  });

  it('INSERT/READ: campos principais + colunas órfãs antes não-representadas (rollback)', async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      const repo = qr.manager.getRepository(LeadEntity);
      const lead = await repo.save(repo.create({
        tenant_id: TENANT, nome: 'SMOKE 2B', status: 'novo' as never, fonte: 'manual',
        // colunas reais antes órfãs (agora mapeadas) — nomes físicos exatos:
        nome_completo: 'Fulano de Tal', nome_artistico: 'FulanX', whatsapp: '+5511999999999',
        instagram: '@fulanx', cidade: 'São Paulo', estado: 'SP', pais: 'BR',
        tipo_cliente: 'artista', tipoServico: 'distribuicao',
        responsavel: 'ana', prioridade: 'alta', temperatura: 'quente', origemLead: 'indicacao',
        valor_estimado: '1500.00', probabilidadeFechamento: '75.00',
        proximo_follow_up: new Date('2026-07-01T12:00:00Z'),
        pipeline_stage: 'qualified',
        tags: ['vip', 'inbound'],
        payload_servico: { plano: 'pro' }, dados_internos_crm: { score_interno: 9 },
      }));
      const read = await repo.findOneByOrFail({ id: lead.id });
      expect(read.nome_completo).toBe('Fulano de Tal');
      expect(read.tipoServico).toBe('distribuicao');
      expect(read.origemLead).toBe('indicacao');
      expect(read.probabilidadeFechamento).toBe('75.00');
      expect(read.pipeline_stage).toBe('qualified');
      expect(read.tags).toEqual(['vip', 'inbound']);
      expect(read.payload_servico).toMatchObject({ plano: 'pro' });

      // defaults NOT NULL preenchidos pelo banco quando não informados
      const lead2 = await repo.save(repo.create({ tenant_id: TENANT, nome: 'SMOKE 2B min', status: 'novo' as never }));
      const read2 = await repo.findOneByOrFail({ id: lead2.id });
      expect(read2.tags).toEqual([]);
      expect(read2.payload_servico).toEqual({});
      expect(read2.dados_internos_crm).toEqual({});
      expect(read2.pipeline_stage).toBeNull();
    } finally { await qr.rollbackTransaction(); await qr.release(); }
  });

  it('UPDATE controlado de colunas órfãs + pipeline_stage (rollback)', async () => {
    const qr = ds.createQueryRunner(); await qr.connect(); await qr.startTransaction();
    try {
      const repo = qr.manager.getRepository(LeadEntity);
      const lead = await repo.save(repo.create({ tenant_id: TENANT, nome: 'SMOKE 2B upd', status: 'novo' as never }));
      await repo.update({ id: lead.id }, { pipeline_stage: 'proposal', temperatura: 'morno', cidade: 'Rio de Janeiro' });
      const read = await repo.findOneByOrFail({ id: lead.id });
      expect(read.pipeline_stage).toBe('proposal');
      expect(read.temperatura).toBe('morno');
      expect(read.cidade).toBe('Rio de Janeiro');
    } finally { await qr.rollbackTransaction(); await qr.release(); }
  });
});
