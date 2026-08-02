import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as XLSX from 'xlsx';

/**
 * reports-export.spec.ts  (Parte 78)
 *
 * E2E real via navegador — reproduz e trava a regressão da exportação de
 * "Clientes" na Central de Relatórios (/relatorios): login real → aciona
 * exportação → aguarda o download real → ABRE o arquivo e valida conteúdo
 * (cabeçalhos pt-BR, ausência de dados técnicos/cifrados). Não declara
 * sucesso apenas por o download ter ocorrido.
 *
 * Causa raiz original (corrigida nesta Parte): a migration
 * 20260719000010_RebuildClientsInCanonicalFormOrder removeu fisicamente as
 * colunas segmento/endereco/responsavel/prioridade/cpf/cnpj de `clients`,
 * mas `ClientEntity` nunca foi atualizada — toda leitura gerava
 * `QueryFailedError: column "segmento" does not exist` (500).
 *
 * Credenciais só via variáveis de ambiente, nunca hardcoded — ausentes ⇒
 * toda a suíte é pulada (test.skip), igual ao spec de login desta mesma
 * pasta.
 */
const EMAIL = process.env.E2E_INSTITUTIONAL_EMAIL;
const PASSWORD = process.env.E2E_INSTITUTIONAL_PASSWORD;

test.describe('Central de Relatórios — exportação de Clientes', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_INSTITUTIONAL_EMAIL/PASSWORD ausentes — pulando E2E real.');

  test('exporta Clientes em XLSX válido, sem 500, sem dados técnicos vazando', async ({ page }) => {
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

    await test.step('abre a Central de Relatórios', async () => {
      await page.goto('/relatorios', { waitUntil: 'networkidle' });
      await expect(page.locator('[data-testid="entity-row-clients"]')).toBeVisible({ timeout: 10_000 });
    });

    await test.step('exporta Clientes e valida o arquivo real (abre e confere conteúdo)', async () => {
      const [download] = await Promise.all([
        page.waitForEvent('download', { timeout: 15_000 }),
        page.locator('[data-testid="btn-export-clients"]').click(),
      ]);

      expect(download.suggestedFilename()).toMatch(/^clients.*\.xlsx$/);

      const filePath = await download.path();
      expect(filePath).toBeTruthy();
      const buf = fs.readFileSync(filePath!);
      const wb = XLSX.read(buf, { type: 'buffer' });
      expect(wb.SheetNames.length).toBeGreaterThan(0);

      const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[wb.SheetNames[0]], { header: 1 });
      expect(rows.length).toBeGreaterThanOrEqual(1); // ao menos o cabeçalho

      const header = (rows[0] as string[]).map(String);
      // Cabeçalho sempre pt-BR, nunca a chave técnica nem coluna cifrada/interna.
      expect(header).toContain('Nome');
      expect(header.some((h) => /_encrypted|tenant_id/i.test(h))).toBe(false);

      expect(pageErrors.filter((e) => /removeChild|500|Internal Server Error/i.test(e))).toEqual([]);
    });
  });
});
