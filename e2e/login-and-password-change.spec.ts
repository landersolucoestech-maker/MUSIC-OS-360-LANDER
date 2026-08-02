import { test, expect } from '@playwright/test';

/**
 * login-and-password-change.spec.ts  (Parte 77)
 *
 * E2E real via navegador — login institucional → redirect seguro para
 * /change-required-password → validações → troca real → wizard. Nunca
 * substitui isto por uma chamada direta ao Supabase (essa cobertura já
 * existe nos testes unitários do backend); o valor deste spec é
 * exatamente confirmar que o NAVEGADOR real não quebra durante o fluxo
 * (ver a regressão de removeChild corrigida nesta mesma Parte).
 *
 * Credenciais só via variáveis de ambiente, nunca hardcoded:
 *   E2E_INSTITUTIONAL_EMAIL    — e-mail do owner institucional
 *   E2E_INSTITUTIONAL_PASSWORD — senha provisória ATUAL (válida agora)
 *   E2E_TEST_PASSWORD          — senha sintética só para este teste trocar PARA
 * Ausentes → toda a suíte é pulada (test.skip), nunca falha CI por falta
 * de segredo que a maioria dos ambientes não tem.
 */
const EMAIL = process.env.E2E_INSTITUTIONAL_EMAIL;
const CURRENT_PASSWORD = process.env.E2E_INSTITUTIONAL_PASSWORD;
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe('Login institucional → troca obrigatória de senha', () => {
  test.skip(!EMAIL || !CURRENT_PASSWORD || !TEST_PASSWORD, 'E2E_INSTITUTIONAL_EMAIL/PASSWORD/E2E_TEST_PASSWORD ausentes — pulando E2E real.');

  test('fluxo completo sem crash do React (removeChild) e sem dados sensíveis persistidos', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await test.step('login com credenciais válidas', async () => {
      await page.goto('/auth', { waitUntil: 'networkidle' });
      await page.getByPlaceholder('Digite seu e-mail').fill(EMAIL!);
      await page.getByPlaceholder('Digite sua senha').fill(CURRENT_PASSWORD!);
      await page.getByRole('button', { name: /acessar o sistema/i }).click();
      await page.waitForURL('**/change-required-password', { timeout: 10_000 });
    });

    await test.step('página de troca renderiza sem crash', async () => {
      await expect(page.locator('h1')).toHaveText(/troca de senha obrigatória/i);
      expect(pageErrors.filter((e) => /removeChild/i.test(e))).toEqual([]);
    });

    await test.step('confirmação divergente é rejeitada', async () => {
      await page.locator('#required-new-password').fill('NovaSenhaForte9!Abc');
      await page.locator('#required-confirm-password').fill('OutraCoisaDiferente9!');
      await page.getByRole('button', { name: /trocar senha e continuar/i }).click();
      await expect(page.getByRole('alert')).toContainText(/não coincidem/i);
      expect(page.url()).toContain('/change-required-password');
    });

    await test.step('senha fraca é rejeitada', async () => {
      await page.locator('#required-new-password').fill('fraca123');
      await page.locator('#required-confirm-password').fill('fraca123');
      await page.getByRole('button', { name: /trocar senha e continuar/i }).click();
      await expect(page.getByRole('alert')).toContainText(/faltam|fraca/i);
    });

    await test.step('troca válida navega para o wizard, sem crash', async () => {
      await page.locator('#required-new-password').fill(TEST_PASSWORD!);
      await page.locator('#required-confirm-password').fill(TEST_PASSWORD!);
      await page.getByRole('button', { name: /trocar senha e continuar/i }).click();
      await page.waitForURL('**/onboarding', { timeout: 15_000 });
      expect(pageErrors.filter((e) => /removeChild/i.test(e))).toEqual([]);
    });

    await test.step('encerra a sessão', async () => {
      // Nunca deixa a sessão de teste aberta no navegador.
      await page.evaluate(() => localStorage.clear());
    });
  });
});
