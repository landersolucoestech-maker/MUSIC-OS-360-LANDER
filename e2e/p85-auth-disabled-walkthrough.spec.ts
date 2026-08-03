import { test, expect } from '@playwright/test';

/**
 * p85-auth-disabled-walkthrough.spec.ts  (Parte 85)
 *
 * Verifica que o bypass AUTH_DISABLED (dev-only) funciona fim-a-fim: abrir
 * "/" leva direto ao dashboard, sem login, exibindo a identidade real do
 * tenant-zero (LANDER RECORDS) — e que nenhum módulo do menu redireciona
 * para /auth ou /login. Não roda contra staging/produção (lá AUTH_DISABLED
 * é sempre false, fail-closed — ver apps/api/src/core/auth-disabled.ts).
 *
 * Pré-requisito local: AUTH_DISABLED=true (API) e VITE_AUTH_DISABLED=true
 * (WEB) no ambiente onde `pnpm dev` está rodando. Ausente/false ⇒ suíte
 * pulada (mesmo padrão dos demais specs em e2e/, ver p84-product-walkthrough.spec.ts).
 */
const MODULES: Array<{ name: string; path: string }> = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Artistas', path: '/artistas' },
  { name: 'Catálogo', path: '/registro-musicas' },
  { name: 'Lançamentos', path: '/lancamentos' },
  { name: 'Contratos', path: '/contratos' },
  { name: 'Audiovisual', path: '/audiovisual' },
  { name: 'Financeiro', path: '/accounting' },
  { name: 'Agenda', path: '/agenda' },
  { name: 'Inventário', path: '/inventario' },
  { name: 'MusicChat', path: '/chat' },
  { name: 'CRM/Leads', path: '/leads' },
  { name: 'RH', path: '/rh' },
  { name: 'Marketing', path: '/marketing' },
  { name: 'Relatórios', path: '/relatorios' },
  { name: 'Suporte', path: '/support' },
  { name: 'Configurações', path: '/configuracoes' },
];

test('AUTH_DISABLED: root abre direto no dashboard, sem login, mostra LANDER RECORDS', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (err) => pageErrors.push(err.message));
  await page.goto('/', { waitUntil: 'networkidle' });

  test.skip(
    !page.url().includes('/dashboard'),
    'AUTH_DISABLED não está ativo neste ambiente (root não redirecionou para /dashboard) — defina AUTH_DISABLED=true e VITE_AUTH_DISABLED=true em .env/.env.development para rodar esta suíte.',
  );

  const bodyText = await page.locator('body').innerText();
  expect(bodyText).toContain('LANDER RECORDS');
  expect(pageErrors).toEqual([]);
});

test('AUTH_DISABLED: todos os módulos abrem sem redirecionar para login/auth', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  test.skip(
    !page.url().includes('/dashboard'),
    'AUTH_DISABLED não está ativo neste ambiente — ver teste anterior.',
  );

  const broken: string[] = [];
  for (const mod of MODULES) {
    const pageErrors: string[] = [];
    const failedRequests: string[] = [];
    const onErr = (e: Error) => pageErrors.push(e.message.slice(0, 200));
    const onRes = (res: import('@playwright/test').Response) => {
      if (res.status() >= 500) failedRequests.push(`${res.status()} ${res.url()}`);
    };
    page.on('pageerror', onErr);
    page.on('response', onRes);
    await page.goto(mod.path, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.waitForTimeout(1500);
    page.off('pageerror', onErr);
    page.off('response', onRes);

    const redirectedToAuth = /\/(auth|login)(\/|$|\?)/.test(page.url());
    if (redirectedToAuth || pageErrors.length || failedRequests.length) {
      broken.push(`${mod.name} (${mod.path}) -> url=${page.url()} errors=${JSON.stringify(pageErrors)} failed=${JSON.stringify(failedRequests)}`);
    }
  }
  expect(broken, broken.join('\n')).toEqual([]);
});
