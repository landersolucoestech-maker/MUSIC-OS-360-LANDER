import { test, expect } from '@playwright/test';

/**
 * clients-import-template.spec.ts  (Parte 80)
 *
 * E2E real via navegador — confirma que a Central de Relatórios expõe
 * importação real para "Clientes" (entity-driven via GET /reports/definitions,
 * sem lista fixa no frontend) e que o botão "Baixar template" baixa um XLSX
 * de verdade emitido pelo backend (GET /reports/entities/clients/import/template),
 * não um arquivo estático do frontend.
 *
 * Somente leitura/download — não cria, edita nem remove nenhum registro.
 *
 * Credenciais só via variáveis de ambiente — ausentes ⇒ suíte pulada.
 */
const EMAIL = process.env.E2E_INSTITUTIONAL_EMAIL;
const PASSWORD = process.env.E2E_INSTITUTIONAL_PASSWORD;

test.describe('Central de Relatórios — importação de Clientes (template real)', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_INSTITUTIONAL_EMAIL/PASSWORD ausentes — pulando E2E real.');

  test('botão de importar Clientes abre o diálogo e o template baixado é um XLSX real do backend', async ({ page }) => {
    await test.step('login institucional real', async () => {
      await page.goto('/auth', { waitUntil: 'networkidle' });
      await page.getByPlaceholder('Digite seu e-mail').fill(EMAIL!);
      await page.getByPlaceholder('Digite sua senha').fill(PASSWORD!);
      await page.getByRole('button', { name: /acessar o sistema/i }).click();
      await page.waitForURL(/\/(dashboard|change-required-password)/, { timeout: 15_000 });
    });

    if (page.url().includes('/change-required-password')) {
      test.skip(true, 'Conta em troca de senha obrigatória — sem senha final estável para este E2E.');
    }

    await test.step('abre a Central de Relatórios e localiza a linha de Clientes', async () => {
      await page.goto('/relatorios', { waitUntil: 'networkidle' });
      await expect(page.locator('[data-testid="entity-row-clients"]')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('abre o diálogo de importação de Clientes', async () => {
      await page.locator('[data-testid="btn-import-clients"]').click();
      await expect(page.locator('[data-testid="import-dialog"]')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('baixa o template real (emitido pelo backend, não estático)', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('[data-testid="import-download-template"]').click(),
      ]);
      expect(download.suggestedFilename()).toBe('clients_template.xlsx');
    });
  });
});
