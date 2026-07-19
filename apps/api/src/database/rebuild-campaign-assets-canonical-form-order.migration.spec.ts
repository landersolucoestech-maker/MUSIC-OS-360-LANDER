import * as fs from 'fs';
import * as path from 'path';

/**
 * Guarda permanente (auditoria 2026-07-19): reconstrução física de
 * `campaign_assets` — segue CreateCampaignAssetDto; file_size/mime_type
 * removidas (órfãs comprovadas); created_by movido para depois de
 * created_at.
 */
const migrationSrc = fs.readFileSync(
  path.resolve(__dirname, 'migrations/20260719000023_RebuildCampaignAssetsInCanonicalFormOrder.ts'),
  'utf8',
);

describe('RebuildCampaignAssetsInCanonicalFormOrder20260719000023', () => {
  const block = () => migrationSrc.split('newColumns = `')[1].split('`;')[0];

  it('segue a ordem do DTO: name -> asset_type -> file_url -> description', () => {
    const b = block();
    const nameIdx = b.indexOf('name');
    const assetTypeIdx = b.indexOf('asset_type');
    const fileUrlIdx = b.indexOf('file_url');
    const descIdx = b.indexOf('description');
    expect(assetTypeIdx).toBeGreaterThan(nameIdx);
    expect(fileUrlIdx).toBeGreaterThan(assetTypeIdx);
    expect(descIdx).toBeGreaterThan(fileUrlIdx);
  });

  it('remove file_size/mime_type com guarda de contagem não-nula (fail-fast)', () => {
    expect(migrationSrc).toMatch(/count\(file_size\)::int \+ count\(mime_type\)::int/);
    expect(migrationSrc).toMatch(/órfãs, mas há dado real/);
    const b = block();
    expect(b).not.toMatch(/file_size|mime_type/);
  });

  it('created_by vem depois de created_at (não antes)', () => {
    const b = block();
    const createdAtIdx = b.indexOf('created_at');
    const createdByIdx = b.indexOf('created_by');
    const deletedAtIdx = b.indexOf('deleted_at');
    expect(createdByIdx).toBeGreaterThan(createdAtIdx);
    expect(deletedAtIdx).toBeGreaterThan(createdByIdx);
  });

  it('não remove nenhuma OUTRA coluna além de file_size/mime_type', () => {
    const newCols = new Set([...block().matchAll(/^\s*(\w+)\s+/gm)].map((m) => m[1]));
    const origBlock = migrationSrc.split('originalColumns = `')[1].split('`;')[0];
    const origCols = new Set([...origBlock.matchAll(/^\s*(\w+)\s+/gm)].map((m) => m[1]));
    const removed = [...origCols].filter((c) => !newCols.has(c));
    expect(removed.sort()).toEqual(['file_size', 'mime_type']);
  });

  it('não usa DROP ... CASCADE', () => {
    expect(migrationSrc).not.toMatch(/DROP\s+\w+[^;]*CASCADE/i);
  });

  it('recria FKs para campaigns (simples e composta) e RLS + as 5 policies, com down() honesto', () => {
    expect(migrationSrc.match(/FOREIGN KEY \(campaign_id\) REFERENCES campaigns\(id\) ON DELETE CASCADE/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migrationSrc.match(/FOREIGN KEY \(campaign_id, tenant_id\) REFERENCES campaigns\(id, tenant_id\) ON DELETE CASCADE/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migrationSrc).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(migrationSrc).toMatch(/FORCE ROW LEVEL SECURITY/);
    for (const policy of ['campaign_assets_tenant_select', 'campaign_assets_tenant_insert', 'campaign_assets_tenant_update', 'campaign_assets_tenant_delete', 'tenant_isolation']) {
      expect(migrationSrc.match(new RegExp(`CREATE POLICY ${policy}`, 'g'))?.length).toBeGreaterThanOrEqual(2);
    }
    expect(migrationSrc.match(/contagem divergente/g)?.length).toBeGreaterThanOrEqual(2);
    expect(migrationSrc).toMatch(/async down/);
  });
});
