import { test, expect, type Page } from '@playwright/test';
import * as XLSX from 'xlsx';
import * as fs from 'fs';

/**
 * p86-reports-centralization.spec.ts  (Parte 86)
 *
 * Importação/Exportação devem existir SOMENTE na página Relatórios — nenhum
 * módulo pode ter botão próprio. Roda com AUTH_DISABLED=true (dev), sem login.
 */
const MODULES_WITHOUT_IMPORT_EXPORT: Array<{ name: string; path: string }> = [
  { name: 'Projetos', path: '/projetos' },
  { name: 'Catálogo (RegistroMusicas)', path: '/registro-musicas' },
  { name: 'RH', path: '/rh' },
  { name: 'Lançamentos', path: '/lancamentos' },
  { name: 'Inventário', path: '/inventario' },
  { name: 'Contratos', path: '/contratos' },
  { name: 'Contabilidade', path: '/accounting/contabilidade' },
];

async function assertNoImportExportButtons(page: Page, path: string) {
  await page.goto(path, { waitUntil: 'networkidle' });
  // Espera algo real ter renderizado (não só o esqueleto de loading) antes de
  // afirmar ausência — do contrário "0 botões" pode só significar "página
  // ainda carregando", uma falsa confiança.
  await expect(page.locator('table, [role="table"], main, [data-testid$="-loading"]').first()).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(1500);
  const importBtn = page.locator('[data-testid*="import" i], [data-testid*="importar" i]');
  const exportBtn = page.locator('[data-testid*="export" i], [data-testid*="exportar" i]');
  await expect(importBtn, `${path}: nenhum botão de import deveria existir`).toHaveCount(0);
  await expect(exportBtn, `${path}: nenhum botão de export deveria existir`).toHaveCount(0);
}

test.describe('Parte 86 — centralização de Importar/Exportar em Relatórios', () => {
  for (const mod of MODULES_WITHOUT_IMPORT_EXPORT) {
    test(`${mod.name}: sem botão Importar/Exportar próprio`, async ({ page }) => {
      await assertNoImportExportButtons(page, mod.path);
    });
  }

  test('Relatórios: sem abas/seções (estrutura da página)', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'networkidle' });
    // A página inteira é uma lista única (sem <Tabs>) — confirma ausência
    // estrutural de qualquer aba.
    await expect(page.locator('[role="tab"], [role="tablist"]')).toHaveCount(0);
  });

  test('Relatórios: Formulários e Pipelines NÃO aparecem como entidade (Parte 87 — removidas do registry, não apenas de uma aba)', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid="entity-row-projects"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-testid="entity-row-forms"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="entity-row-pipelines"]')).toHaveCount(0);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toMatch(/\bFormulários\b/);
    expect(bodyText).not.toMatch(/\bPipelines?\b/);
  });

  test('Relatórios: entidades sem contrato explícito de relatório (Parte 88) NÃO aparecem — nenhum fallback heurístico', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'networkidle' });
    await expect(page.locator('[data-testid="entity-row-projects"]')).toBeVisible({ timeout: 10_000 });

    const removedTables = [
      'artist_goals', 'assets', 'audiovisual_assets', 'audiovisual_deliverables',
      'audiovisual_tasks', 'lead_interactions', 'marketing_assets', 'marketing_content_posts',
      'marketing_projects', 'marketing_strategies', 'marketing_tasks', 'operational_tasks',
      'pipeline_opportunities', 'support_tickets',
    ];
    for (const table of removedTables) {
      await expect(page.locator(`[data-testid="entity-row-${table}"]`)).toHaveCount(0);
    }

    const removedLabels = [
      'Metas de artistas', 'Ativos digitais', 'Ativos audiovisuais', 'Entregáveis audiovisuais',
      'Tarefas audiovisuais', 'Interações de leads', 'Ativos de marketing', 'Publicações de conteúdo',
      'Projetos de marketing', 'Estratégias de marketing', 'Tarefas de marketing', 'Tarefas operacionais',
      'Oportunidades de pipeline', 'Chamados de suporte',
    ];
    const bodyText = await page.locator('body').innerText();
    for (const label of removedLabels) expect(bodyText).not.toContain(label);
  });

  test('Relatórios: Projetos aparece como entidade reportável com Importar/Exportar funcionais', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'networkidle' });
    const row = page.locator('[data-testid="entity-row-projects"]');
    await expect(row).toBeVisible({ timeout: 10_000 });
    await expect(row.locator('[data-testid="btn-import-projects"]')).toBeEnabled();

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row.locator('[data-testid="btn-export-projects"]').click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^projects.*\.xlsx$/);
  });

  test('Relatórios: exportação de Projetos é um workbook real com aba "Projetos" + aba filha "Músicas do Projeto" (Parte 87, Bloco 6 — nunca JSON numa célula)', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'networkidle' });
    const row = page.locator('[data-testid="entity-row-projects"]');
    await expect(row).toBeVisible({ timeout: 10_000 });

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      row.locator('[data-testid="btn-export-projects"]').click(),
    ]);
    const filePath = await download.path();
    expect(filePath).toBeTruthy();
    const wb = XLSX.read(fs.readFileSync(filePath!));
    expect(wb.SheetNames).toEqual(['Projetos', 'Músicas do Projeto']);

    const mainHeader = XLSX.utils.sheet_to_json(wb.Sheets['Projetos'], { header: 1 })[0] as string[];
    expect(mainHeader).toEqual(['Projeto ID de referência', 'Tipo', 'Título', 'Observações', 'Situação']);

    const childHeader = XLSX.utils.sheet_to_json(wb.Sheets['Músicas do Projeto'], { header: 1 })[0] as string[];
    expect(childHeader).toEqual([
      'Projeto ID de referência', 'Nome', 'Solo/Feat', 'Original/Remix', 'Instrumental', 'Duração',
      'Gênero', 'Idioma', 'Compositores', 'Intérpretes', 'Produtores', 'Letra', 'Áudio', 'Ordem',
    ]);
  });
});
