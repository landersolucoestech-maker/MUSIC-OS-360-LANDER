import { EntityMetadataService } from './entity-metadata.service';
import { EntityCategory } from './entity-metadata.types';

/**
 * FASE 1 — garante uma varredura real, classificada e sem entidade UNKNOWN.
 * Roda sem banco (lê metadados de decorator via getMetadataArgsStorage).
 */
describe('EntityMetadataService — inventário entity-driven', () => {
  const inv = new EntityMetadataService().scan();
  const byTable = new Map(inv.entities.map((e) => [e.tableName, e]));

  it('varre um conjunto real de entidades registradas', () => {
    expect(inv.totalEntities).toBeGreaterThan(100);
    expect(inv.entities.length).toBe(inv.totalEntities);
    expect(inv.reportableEntities + inv.nonReportableEntities).toBe(inv.totalEntities);
  });

  // ── VALIDAÇÃO 1 / 4: nenhuma entidade sem classificação ────────────────────
  it('não deixa NENHUMA entidade UNKNOWN (toda operacional classificada)', () => {
    const unknown = inv.entities.filter((e) => e.category === EntityCategory.UNKNOWN);
    expect(unknown.map((e) => e.tableName)).toEqual([]);
    expect(inv.unknownEntities).toBe(0);
  });

  // ── VALIDAÇÃO 2: toda entidade reportável tem tenant_id ────────────────────
  it('toda entidade reportável possui tenant_id', () => {
    const offenders = inv.entities.filter((e) => e.reportable && !e.hasTenantId);
    expect(offenders.map((e) => e.tableName)).toEqual([]);
  });

  // ── VALIDAÇÃO 3: toda entidade reportável tem coluna identificável ─────────
  it('toda entidade reportável possui coluna identificável', () => {
    const offenders = inv.entities.filter(
      (e) => e.reportable && e.risks.includes('NO_IDENTIFIABLE_COLUMN'),
    );
    expect(offenders.map((e) => e.tableName)).toEqual([]);
  });

  // ── VALIDAÇÃO 4: toda entidade REPORTABLE tem label pt-BR (label é produto) ─
  it('toda entidade REPORTABLE possui label pt-BR na camada central', () => {
    const offenders = inv.entities.filter(
      (e) => e.category === EntityCategory.REPORTABLE && e.label === null,
    );
    expect(offenders.map((e) => e.tableName)).toEqual([]);
    const untranslated = inv.entities.filter((e) => e.risks.includes('UNTRANSLATED_ENTITY'));
    expect(untranslated.map((e) => e.tableName)).toEqual([]);
  });

  // ── VALIDAÇÃO 5: infra/segurança/billing/ia/junção NÃO reportáveis ─────────
  it('audit_logs, billing, auth, health, ai_* e junções não são reportáveis', () => {
    const mustNotBeReportable: Array<[string, EntityCategory]> = [
      ['audit_logs', EntityCategory.SECURITY],
      ['auth', EntityCategory.SECURITY],
      ['users', EntityCategory.SECURITY],
      ['billing_subscriptions', EntityCategory.BILLING],
      ['health', EntityCategory.INFRA],
      ['ai_jobs', EntityCategory.AI_INTERNAL],
      ['ai_usage_logs', EntityCategory.AI_INTERNAL],
      ['skill_runs', EntityCategory.AI_INTERNAL],
      ['crm_contact_tags', EntityCategory.JUNCTION],
      ['role_permissions', EntityCategory.JUNCTION],
    ];
    for (const [table, expectedCat] of mustNotBeReportable) {
      const e = byTable.get(table);
      if (!e) continue; // pode não estar registrado no DataSource
      expect(e.reportable).toBe(false);
      expect(e.category).toBe(expectedCat);
    }
  });

  // Parte 89: núcleo reportável é exatamente o registry fechado (22 módulos
  // autorizados) — ver report-module-registry.ts.
  it('entidades operacionais núcleo são reportáveis (com tenant_id)', () => {
    for (const table of [
      'artists', 'works', 'phonograms', 'contracts', 'clients', 'employees', 'projects',
      'content_detections', 'licenses', 'takedowns', 'releases', 'shares',
      'audiovisual_projects', 'transactions', 'invoices', 'events', 'inventory_items',
      'leads', 'marketing_tasks', 'marketing_content_posts', 'briefings',
    ]) {
      const e = byTable.get(table);
      if (!e) continue;
      expect(e.category).toBe(EntityCategory.REPORTABLE);
      expect(e.hasTenantId).toBe(true);
      expect(e.reportable).toBe(true);
    }
  });

  it('entidades fora do registry fechado (Parte 89) são NOT_REPORTABLE', () => {
    for (const table of ['contract_templates', 'operational_tasks', 'artist_goals', 'support_tickets']) {
      const e = byTable.get(table);
      if (!e) continue;
      expect(e.category).toBe(EntityCategory.NOT_REPORTABLE);
      expect(e.reportable).toBe(false);
    }
  });

  it('cada entity report tem o shape esperado', () => {
    const e = byTable.get('artists');
    expect(e).toBeDefined();
    expect(e!.entityName).toBeTruthy();
    expect(Array.isArray(e!.columns)).toBe(true);
    expect(e!.columns.length).toBeGreaterThan(0);
    expect(Array.isArray(e!.relations)).toBe(true);
    expect(typeof e!.hasTenantId).toBe('boolean');
    expect(typeof e!.hasSoftDelete).toBe('boolean');
    expect(typeof e!.hasTimestamps).toBe('boolean');
    expect(Array.isArray(e!.risks)).toBe(true);
  });
});
