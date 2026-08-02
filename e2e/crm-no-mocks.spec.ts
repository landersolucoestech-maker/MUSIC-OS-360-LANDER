import { test, expect } from '@playwright/test';

/**
 * crm-no-mocks.spec.ts  (Parte 79)
 *
 * E2E real via navegador — trava a regressão dos mocks do CRM/Leads
 * eliminados nesta Parte. Login real → abre /leads (CRM) → confirma que a
 * página chama de fato os endpoints reais (/leads, /clients) e que os nomes
 * fictícios do antigo mock em memória (Marina Torres, Rafael Azevedo, Casa
 * Aurora, Beat Press, João Silva, Maria Santos, Pedro Costa) NUNCA aparecem
 * na tela — a única forma de aparecerem seria o código ter voltado a usar o
 * array estático em vez do backend real.
 *
 * Credenciais só via variáveis de ambiente — ausentes ⇒ suíte pulada.
 */
const EMAIL = process.env.E2E_INSTITUTIONAL_EMAIL;
const PASSWORD = process.env.E2E_INSTITUTIONAL_PASSWORD;

const MOCK_NAMES = [
  'Marina Torres', 'Rafael Azevedo', 'Mavi Music', 'Azul Eventos',
  'Casa Aurora', 'Beat Press', 'João Silva', 'Maria Santos', 'Pedro Costa',
  'Aurora Live',
];

test.describe('CRM (Leads/Contatos) — sem dados mockados', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_INSTITUTIONAL_EMAIL/PASSWORD ausentes — pulando E2E real.');

  test('carrega Leads/Contatos via API real, sem nomes do mock antigo', async ({ page }) => {
    const apiCalls: string[] = [];
    page.on('request', (req) => {
      const url = req.url();
      if (url.includes('/api/v1/leads') || url.includes('/api/v1/clients')) apiCalls.push(url);
    });
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

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

    await test.step('abre o CRM (aba Contatos) e confirma chamada real ao backend', async () => {
      await page.goto('/leads', { waitUntil: 'networkidle' });
      await expect(page.locator('[data-testid="tab-content-contatos"]')).toBeVisible({ timeout: 10_000 });
      expect(apiCalls.some((u) => u.includes('/api/v1/clients'))).toBe(true);
    });

    await test.step('abre a aba Leads e confirma chamada real ao backend', async () => {
      await page.locator('[data-testid="tab-leads"]').click();
      await expect(page.locator('[data-testid="tab-content-leads"]')).toBeVisible({ timeout: 10_000 });
      expect(apiCalls.some((u) => u.includes('/api/v1/leads'))).toBe(true);
    });

    await test.step('nenhum nome do antigo mock em memória aparece na tela', async () => {
      const bodyText = await page.locator('body').innerText();
      for (const name of MOCK_NAMES) {
        expect(bodyText).not.toContain(name);
      }
    });

    expect(pageErrors.filter((e) => /removeChild/i.test(e))).toEqual([]);
  });
});
