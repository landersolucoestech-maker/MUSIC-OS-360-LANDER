/**
 * test/e2e/reports/reports-data.e2e-spec.ts  ·  FASE 2.4
 *
 * E2E REAL contra PostgreSQL (sem mocks, sem QueryRunner fake): instancia os
 * serviços REAIS de export/import/commit sobre um DataSource real e valida
 * export (JSON/CSV/XLSX), validate (sem persistência), commit (INSERT real),
 * create-only (duplicidade), rollback transacional, tenant isolation e bloqueio
 * de colunas sensíveis.
 */
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../../../src/database/entities';
import { EntityMetadataService } from '../../../src/modules/reports/entity-metadata.service';
import { ReportEntityDefinitionService } from '../../../src/modules/reports/definitions/report-entity-definition.service';
import { ExportQueryBuilderService } from '../../../src/modules/reports/export/export-query-builder.service';
import { ExportFormatService } from '../../../src/modules/reports/export/export-format.service';
import { ExportAuditService } from '../../../src/modules/reports/export/export-audit.service';
import { ExportEngineService } from '../../../src/modules/reports/export/export-engine.service';
import { ImportParserService } from '../../../src/modules/reports/import/import-parser.service';
import { ImportMapperService } from '../../../src/modules/reports/import/import-mapper.service';
import { ImportValidationService } from '../../../src/modules/reports/import/import-validation.service';
import { ImportEngineService } from '../../../src/modules/reports/import/import-engine.service';
import { ImportAuditService } from '../../../src/modules/reports/import/import-audit.service';
import { ImportCommitService } from '../../../src/modules/reports/import/import-commit.service';
import { ReportTableGuardService } from '../../../src/modules/reports/report-table-guard.service';
import { EncryptionService } from '../../../src/core/security/encryption.service';
import type { ConfigService } from '@nestjs/config';

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
} catch { /* opcional */ }

const TENANT_A = '10000000-0000-0000-0000-000000000002';
const TENANT_B = '00000000-0000-4000-8000-0000000000ee';
const TAG = `SMOKE_${Date.now()}`;

describe('Reports E2E — PostgreSQL real', () => {
  let ds: DataSource;
  let exportEngine: ExportEngineService;
  let importEngine: ImportEngineService;
  let commit: ImportCommitService;

  beforeAll(async () => {
    const envPath = path.resolve(process.cwd(), '.env');
    const envText = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const url = (envText.match(/^DATABASE_URL=(.+)$/m)?.[1] ?? process.env['DATABASE_URL'] ?? '').trim().replace(/^["']|["']$/g, '');
    ds = await new DataSource({
      type: 'postgres', url, entities: ALL_ENTITIES, synchronize: false, logging: false,
      ssl: false, // DB local de E2E não suporta SSL
    }).initialize();

    const metadata = new EntityMetadataService();
    const defs = new ReportEntityDefinitionService(metadata);
    const tableGuard = new ReportTableGuardService(ds);
    const encryption = new EncryptionService({
      get: jest.fn().mockReturnValue(process.env['ENCRYPTION_KEY']),
    } as unknown as ConfigService);
    exportEngine = new ExportEngineService(ds, metadata, defs, new ExportQueryBuilderService(), new ExportFormatService(), new ExportAuditService(), tableGuard, encryption);
    importEngine = new ImportEngineService(metadata, defs, new ImportParserService(), new ImportMapperService(), new ImportValidationService(), tableGuard);
    commit = new ImportCommitService(ds, importEngine, defs, new ImportAuditService(), encryption);

    // semente: 1 artista tenant A + 1 tenant B (isolamento)
    await ds.query(`INSERT INTO artists (id, tenant_id, nome_artistico) VALUES (gen_random_uuid(), $1, $2)`, [TENANT_A, `${TAG}_A`]);
    await ds.query(`INSERT INTO artists (id, tenant_id, nome_artistico) VALUES (gen_random_uuid(), $1, $2)`, [TENANT_B, `${TAG}_B`]);
  }, 30000);

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.query(`DELETE FROM artists WHERE nome_artistico LIKE $1`, [`${TAG}%`]);
      await ds.destroy();
    }
  });

  const csv = (s: string) => ({ filename: 'artists.csv', content: Buffer.from(s, 'utf8') });
  const countArtists = async (name: string): Promise<number> => {
    const r = await ds.query(`SELECT COUNT(*)::int AS c FROM artists WHERE nome_artistico = $1 AND tenant_id = $2`, [name, TENANT_A]);
    return r[0].c as number;
  };

  it('export JSON: metadata + labels pt-BR, só do tenant', async () => {
    const res = await exportEngine.export('artists', { format: 'json', page: 1, pageSize: 1000 } as any, TENANT_A, 'e2e');
    const body = res.body as any;
    expect(res.format).toBe('json');
    expect(body.metadata.columns.some((c: any) => c.label === 'Nome artístico')).toBe(true);
    expect(body.data.some((r: any) => r.nome_artistico === `${TAG}_A`)).toBe(true);
    expect(body.data.some((r: any) => r.nome_artistico === `${TAG}_B`)).toBe(false); // tenant isolation
  });

  it('export CSV: BOM + cabeçalho pt-BR', async () => {
    const res = await exportEngine.export('artists', { format: 'csv', page: 1, pageSize: 10 } as any, TENANT_A, 'e2e');
    const text = String(res.body);
    expect(text.charCodeAt(0)).toBe(0xfeff);
    expect(text.split('\n')[0]).toContain('Nome artístico');
    expect(text.split('\n')[0]).not.toContain('nome_artistico');
  });

  it('export XLSX: buffer válido', async () => {
    const res = await exportEngine.export('artists', { format: 'xlsx', page: 1, pageSize: 10 } as any, TENANT_A, 'e2e');
    expect(Buffer.isBuffer(res.body)).toBe(true);
    expect((res.body as Buffer).length).toBeGreaterThan(0);
  });

  it('import VALIDATE não persiste', async () => {
    const name = `${TAG}_V`;
    const before = await countArtists(name);
    const r = await importEngine.validateFile('artists', csv(`Nome artístico\n${name}`), TENANT_A);
    expect(r.validRows).toBe(1);
    expect(await countArtists(name)).toBe(before); // 0 persistência
  });

  it('import COMMIT persiste com tenant correto (create-only)', async () => {
    const name = `${TAG}_C`;
    const res = await commit.commit('artists', csv(`Nome artístico\n${name}`), TENANT_A, 'e2e');
    expect(res.importedRows).toBe(1);
    expect(await countArtists(name)).toBe(1);
    const row = await ds.query(`SELECT tenant_id FROM artists WHERE nome_artistico = $1`, [name]);
    expect(row[0].tenant_id).toBe(TENANT_A);
  });

  it('create-only: 2ª importação do mesmo arquivo é rejeitada (sem overwrite)', async () => {
    const name = `${TAG}_C`; // já existe da etapa anterior
    const res = await commit.commit('artists', csv(`Nome artístico\n${name}`), TENANT_A, 'e2e');
    expect(res.importedRows).toBe(0);
    expect(res.errors.some((e) => /já existe/i.test(e))).toBe(true);
    expect(await countArtists(name)).toBe(1); // continua 1 (sem duplicar/atualizar)
  });

  it('ROLLBACK transacional: [novo + duplicado] → 0 persistido', async () => {
    const dup = `${TAG}_C`;          // já existe
    const fresh = `${TAG}_R`;        // novo
    const res = await commit.commit('artists', csv(`Nome artístico\n${fresh}\n${dup}`), TENANT_A, 'e2e');
    expect(res.importedRows).toBe(0);
    expect(await countArtists(fresh)).toBe(0); // o novo NÃO foi inserido (rollback total)
  });

  it('tenant do arquivo é ignorado: tenant_id sempre o atual', async () => {
    const name = `${TAG}_T`;
    await commit.commit('artists', csv(`Nome artístico,tenant_id\n${name},${TENANT_B}`), TENANT_A, 'e2e');
    const row = await ds.query(`SELECT tenant_id FROM artists WHERE nome_artistico = $1`, [name]);
    expect(row[0]?.tenant_id).toBe(TENANT_A); // nunca o tenant do arquivo
  });

  // ── Fase 1 de correção de schema: guarda + colunas/tabelas materializadas ────
  it('export de entidade sem tabela física (crm_contacts) → 422 controlado (nunca 500)', async () => {
    await expect(
      exportEngine.export('crm_contacts', { format: 'json', page: 1, pageSize: 10 } as any, TENANT_A, 'e2e'),
    ).rejects.toMatchObject({ status: 422 });
  });

  it('tabelas novas existem: artist_platform_profiles e release_works', async () => {
    const a = await ds.query(`SELECT to_regclass('public.artist_platform_profiles') AS t`);
    const b = await ds.query(`SELECT to_regclass('public.release_works') AS t`);
    expect(a[0].t).toBe('artist_platform_profiles');
    expect(b[0].t).toBe('release_works');
  });

  it('SELECT com soft delete não quebra: payroll_entries / leave_requests / audiovisual_approvals', async () => {
    await expect(ds.query(`SELECT id, deleted_at FROM payroll_entries WHERE deleted_at IS NULL LIMIT 1`)).resolves.toBeDefined();
    await expect(ds.query(`SELECT id, deleted_at, documento_url, created_by FROM leave_requests WHERE deleted_at IS NULL LIMIT 1`)).resolves.toBeDefined();
    await expect(ds.query(`SELECT id, created_at, updated_at, deleted_at FROM audiovisual_approvals WHERE deleted_at IS NULL LIMIT 1`)).resolves.toBeDefined();
  });

  it('INSERT em audiovisual_approvals (com timestamps) funciona — rollback, sem persistir', async () => {
    const qr = ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await qr.query(
        `INSERT INTO audiovisual_approvals (id, tenant_id, audiovisual_project_id, status, revision_round, requested_at)
         VALUES (gen_random_uuid(), $1, gen_random_uuid(), 'pending', 1, now())`,
        [TENANT_A],
      );
      const row = await qr.query(
        `SELECT created_at, updated_at FROM audiovisual_approvals WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1`,
        [TENANT_A],
      );
      expect(row[0].created_at).toBeTruthy();
      expect(row[0].updated_at).toBeTruthy();
    } finally {
      await qr.rollbackTransaction(); // nada é persistido
      await qr.release();
    }
  });

  it('coluna sensível não pode ser exportada (400)', async () => {
    const defs = new ReportEntityDefinitionService(new EntityMetadataService()).getDefinitions();
    const withSensitive = defs.find((d) => d.sensitiveColumns.length > 0);
    expect(withSensitive).toBeDefined();
    await expect(
      exportEngine.export(withSensitive!.tableName, { format: 'json', page: 1, pageSize: 1, columns: [withSensitive!.sensitiveColumns[0]] } as any, TENANT_A, 'e2e'),
    ).rejects.toMatchObject({ status: 400 });
  });

  // ── FASE 2B — leads: export/import sobre as colunas reconciliadas ────────────
  describe('leads (FASE 2B)', () => {
    const LEAD_TAG = `SMOKE_LEAD_${Date.now()}`;
    const csvLead = (s: string) => ({ filename: 'leads.csv', content: Buffer.from(s, 'utf8') });
    const countLeads = async (nome: string): Promise<number> => {
      const r = await ds.query(`SELECT COUNT(*)::int AS c FROM leads WHERE nome = $1 AND tenant_id = $2`, [nome, TENANT_A]);
      return r[0].c as number;
    };

    beforeAll(async () => {
      // Lead com colunas antes órfãs preenchidas — valida export dos campos reconciliados.
      await ds.query(
        `INSERT INTO leads (id, tenant_id, nome, status, cidade, "tipoServico", "origemLead", tags)
         VALUES (gen_random_uuid(), $1, $2, 'novo', 'São Paulo', 'distribuicao', 'indicacao', ARRAY['vip']::text[])`,
        [TENANT_A, `${LEAD_TAG}_A`],
      );
      await ds.query(`INSERT INTO leads (id, tenant_id, nome, status) VALUES (gen_random_uuid(), $1, $2, 'novo')`, [TENANT_B, `${LEAD_TAG}_B`]);
    });

    afterAll(async () => {
      await ds.query(`DELETE FROM leads WHERE nome LIKE $1`, [`${LEAD_TAG}%`]);
    });

    it('export JSON: colunas órfãs reconciliadas com label pt-BR, só do tenant', async () => {
      const res = await exportEngine.export('leads', { format: 'json', page: 1, pageSize: 1000 } as any, TENANT_A, 'e2e');
      const body = res.body as any;
      const labels = body.metadata.columns.map((c: any) => c.label);
      expect(labels).toEqual(expect.arrayContaining(['Tipo de serviço', 'Origem do lead', 'Cidade', 'Etiquetas']));
      // colunas internas/sensíveis NÃO vazam
      const keys = body.metadata.columns.map((c: any) => c.key ?? c.column ?? c.name);
      expect(keys).not.toContain('email_encrypted');
      expect(keys).not.toContain('telefone_encrypted');
      expect(keys).not.toContain('dados_internos_crm');
      expect(keys).not.toContain('payload_servico');
      expect(body.data.some((r: any) => r.nome === `${LEAD_TAG}_A`)).toBe(true);
      expect(body.data.some((r: any) => r.nome === `${LEAD_TAG}_B`)).toBe(false); // tenant isolation
    });

    it('export CSV: cabeçalho pt-BR (sem chave técnica crua)', async () => {
      const res = await exportEngine.export('leads', { format: 'csv', page: 1, pageSize: 10 } as any, TENANT_A, 'e2e');
      const header = String(res.body).split('\n')[0];
      expect(header).toContain('Tipo de serviço');
      expect(header).not.toContain('tipoServico');
    });

    it('export XLSX: buffer válido', async () => {
      const res = await exportEngine.export('leads', { format: 'xlsx', page: 1, pageSize: 10 } as any, TENANT_A, 'e2e');
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect((res.body as Buffer).length).toBeGreaterThan(0);
    });

    it('import VALIDATE não persiste', async () => {
      const nome = `${LEAD_TAG}_V`;
      const before = await countLeads(nome);
      const r = await importEngine.validateFile('leads', csvLead(`Nome\n${nome}`), TENANT_A);
      expect(r.validRows).toBe(1);
      expect(await countLeads(nome)).toBe(before); // 0 persistência
    });

    it('import COMMIT persiste com tenant correto (create-only)', async () => {
      const nome = `${LEAD_TAG}_C`;
      const res = await commit.commit('leads', csvLead(`Nome\n${nome}`), TENANT_A, 'e2e');
      expect(res.importedRows).toBe(1);
      expect(await countLeads(nome)).toBe(1);
      const row = await ds.query(`SELECT tenant_id FROM leads WHERE nome = $1`, [nome]);
      expect(row[0].tenant_id).toBe(TENANT_A);
    });

    it('ROLLBACK transacional: [novo + duplicado] → 0 persistido', async () => {
      const dup = `${LEAD_TAG}_C`;   // já existe da etapa anterior
      const fresh = `${LEAD_TAG}_R`; // novo
      const res = await commit.commit('leads', csvLead(`Nome\n${fresh}\n${dup}`), TENANT_A, 'e2e');
      expect(res.importedRows).toBe(0);
      expect(await countLeads(fresh)).toBe(0); // rollback total: o novo NÃO foi inserido
    });
  });
});
