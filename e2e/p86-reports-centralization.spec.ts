import { test, expect, type Page } from '@playwright/test';

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

  test('Relatórios: sem abas/seções Formulários ou Pipeline (a lista de entidades reportáveis pode legitimamente incluir entidades chamadas "Formulários"/"Pipelines" — não são abas)', async ({ page }) => {
    await page.goto('/relatorios', { waitUntil: 'networkidle' });
    // A página inteira é uma lista única (sem <Tabs>) — confirma ausência
    // estrutural de qualquer aba, não só das antigas "Formulários"/"Pipeline".
    await expect(page.locator('[role="tab"], [role="tablist"]')).toHaveCount(0);
    // Título de seção "Formulários"/"Pipeline" (heading), distinto de uma
    // linha de entidade reportável (data-testid="entity-row-*") com esse nome.
    const rogueSectionHeading = page.locator('h1, h2, h3').filter({ hasText: /^(Formulários|Pipeline)$/ });
    await expect(rogueSectionHeading).toHaveCount(0);
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
});
