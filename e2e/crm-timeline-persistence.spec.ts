import { test, expect } from '@playwright/test';

/**
 * crm-timeline-persistence.spec.ts  (Parte 80)
 *
 * E2E real via navegador — prova que a Timeline de um Contato (Contato =
 * Cliente, tabela física `clients`, eventos persistidos em `activity_logs`
 * via /clients/:id/timeline) sobrevive a reload, em vez de viver apenas em
 * estado React/Zustand em memória.
 *
 * Login real → abre Contatos → abre o primeiro contato existente → registra
 * uma nota de teste claramente identificada → confirma que ela aparece na
 * tela → recarrega a página do zero → reabre o mesmo contato → confirma que
 * a nota AINDA está lá (só é possível se veio do backend, não de estado
 * local perdido no reload).
 *
 * A nota fica registrada permanentemente (timeline/activity_logs é um
 * histórico imutável por design — não há endpoint de exclusão de entrada de
 * timeline, de propósito). Por isso o texto da nota se autoidentifica como
 * verificação automatizada, nunca inventa dado de cliente.
 *
 * Credenciais só via variáveis de ambiente — ausentes ⇒ suíte pulada.
 */
const EMAIL = process.env.E2E_INSTITUTIONAL_EMAIL;
const PASSWORD = process.env.E2E_INSTITUTIONAL_PASSWORD;

test.describe('CRM — Timeline do Contato/Cliente sobrevive a reload (persistência real)', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_INSTITUTIONAL_EMAIL/PASSWORD ausentes — pulando E2E real.');

  test('nota registrada na timeline permanece após reload completo da página', async ({ page }) => {
    const noteText = `[E2E automatizado — Parte 80] verificação de persistência da timeline ${Date.now()}`;

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

    let contactId = '';

    await test.step('abre Contatos e o primeiro contato existente', async () => {
      await page.goto('/leads', { waitUntil: 'networkidle' });
      await page.locator('[data-testid="tab-content-contatos"]').waitFor({ timeout: 10_000 });

      const firstRow = page.locator('[data-testid^="contato-row-"]').first();
      await firstRow.waitFor({ timeout: 10_000 });
      const rowTestId = await firstRow.getAttribute('data-testid');
      contactId = rowTestId!.replace('contato-row-', '');

      await page.locator(`[data-testid="contato-actions-${contactId}"]`).click();
      await page.locator(`[data-testid="contato-action-view-${contactId}"]`).click();
      await expect(page.locator('[data-testid="contato-view-modal"]')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('registra uma nota na timeline real (persistida em activity_logs)', async () => {
      await expect(page.locator('[data-testid="contato-view-timeline"]')).toBeVisible();
      await page.locator('[data-testid="contato-view-timeline-input"]').fill(noteText);
      await page.locator('[data-testid="contato-view-timeline-add"]').click();
      await expect(page.locator('[data-testid="contato-view-timeline"]')).toContainText(noteText, { timeout: 10_000 });
    });

    await test.step('fecha o modal, recarrega a página do zero e reabre o mesmo contato', async () => {
      await page.locator('[data-testid="button-close-view"]').click();
      await page.reload({ waitUntil: 'networkidle' });

      await page.locator('[data-testid="tab-content-contatos"]').waitFor({ timeout: 10_000 });
      await page.locator(`[data-testid="contato-actions-${contactId}"]`).click();
      await page.locator(`[data-testid="contato-action-view-${contactId}"]`).click();
      await expect(page.locator('[data-testid="contato-view-modal"]')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('a nota registrada antes do reload ainda está lá (prova de persistência real)', async () => {
      await expect(page.locator('[data-testid="contato-view-timeline"]')).toContainText(noteText, { timeout: 10_000 });
    });
  });
});
